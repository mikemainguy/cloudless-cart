import JsonSignature, { KeyStore, SignedObject } from './jsonSignature';
import TokenCrypto, { EncryptionOptions } from './tokenCrypto';
import { JWTPayload } from 'jose';
import stringify from 'fast-json-stable-stringify';

// Browser-compatible hash function
async function hashSHA256(data: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    // Browser environment - use Web Crypto API
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } else if (typeof require !== 'undefined') {
    // Node.js environment
    try {
      const { createHash } = require('crypto');
      return createHash('sha256').update(data).digest('hex');
    } catch (e) {
      throw new Error('SHA-256 hashing not available in this environment');
    }
  } else {
    throw new Error('SHA-256 hashing not available in this environment');
  }
}

interface EncryptThenSignPayload {
  encrypted: string;
  payloadHash: string;
  timestamp: number;
  version: number;
}

export { EncryptThenSignPayload };

export default class CloudlessCrypto {
  public readonly signer: JsonSignature;
  public readonly encryptor: TokenCrypto;

  constructor(keyStore?: KeyStore, debug = false) {
    const store = keyStore || new Map();
    this.signer = new JsonSignature(store, debug);
    this.encryptor = new TokenCrypto(store, debug);
  }

  public async generateSigningKeyPair(
    alg = 'PS256'
  ): Promise<{ key: string; publicKey: any }> {
    return await this.signer.generateKeyPair(alg);
  }

  public async generateEncryptionKeyPair(
    alg = 'RSA-OAEP-256'
  ): Promise<{ key: string; publicKey: any }> {
    return await this.encryptor.generateKeyPairForEncryption(alg);
  }

  public async signAndEncrypt(
    signingKey: string,
    encryptionKey: string,
    payload: Record<string, unknown>,
    encryptionOptions?: EncryptionOptions
  ): Promise<string> {
    const signed = await this.signer.sign(signingKey, payload);
    return await this.encryptor.encryptToken(
      encryptionKey,
      signed,
      encryptionOptions
    );
  }

  public async decryptAndVerify(
    decryptionKey: string,
    verificationKey: string,
    encryptedToken: string
  ): Promise<Record<string, unknown>> {
    const decrypted = await this.encryptor.decryptToken(
      decryptionKey,
      encryptedToken
    );
    return await this.signer.verify(decrypted as any, verificationKey);
  }

  public async signObject(
    key: string,
    obj: Record<string, unknown>
  ): Promise<any> {
    return await this.signer.sign(key, obj);
  }

  public async verifyObject(
    signed: SignedObject,
    key?: string
  ): Promise<Record<string, unknown>> {
    return await this.signer.verify(signed, key);
  }

  public async encryptToken(
    key: string,
    payload: JWTPayload,
    options?: EncryptionOptions
  ): Promise<string> {
    return await this.encryptor.encryptToken(key, payload, options);
  }

  public async decryptToken(
    key: string,
    encryptedToken: string
  ): Promise<Record<string, unknown>> {
    return await this.encryptor.decryptToken(key, encryptedToken);
  }

  public async encryptThenSign(
    encryptionKey: string,
    signingKey: string,
    payload: JWTPayload,
    encryptionOptions?: EncryptionOptions
  ): Promise<any> {
    // Step 1: Calculate hash of original payload for integrity verification
    const payloadString = stringify(payload); // Hash the exact input payload
    const payloadHash = await hashSHA256(payloadString);

    // Step 2: Encrypt the payload (this adds JWT claims like iat, exp, etc.)
    const encrypted = await this.encryptor.encryptToken(
      encryptionKey,
      payload,
      encryptionOptions
    );

    // Step 3: Create signature payload with metadata (NO plaintext data!)
    const signaturePayload: EncryptThenSignPayload = {
      encrypted,
      payloadHash, // Hash provides integrity without revealing original data
      timestamp: Date.now(),
      version: 1,
    };

    // Step 4: Sign the encrypted payload + metadata
    return await this.signer.sign(
      signingKey,
      signaturePayload as unknown as Record<string, unknown>
    );
  }

  public async verifyThenDecrypt(
    signingKey: string,
    encryptionKey: string,
    signedToken: SignedObject
  ): Promise<Record<string, unknown>> {
    // Step 1: Verify signature first (fail fast)
    const verified = (await this.signer.verify(
      signedToken,
      signingKey
    )) as unknown as EncryptThenSignPayload;

    // Step 2: Decrypt the payload (includes JWT claims)
    const decrypted = await this.encryptor.decryptToken(
      encryptionKey,
      verified.encrypted
    );

    // Step 3: Extract original payload fields (remove JWT claims for hash verification)
    const originalPayloadFields = { ...decrypted } as Record<string, unknown>;
    // Remove standard JWT claims that weren't in the original payload
    delete originalPayloadFields.iat;
    delete originalPayloadFields.exp;
    delete originalPayloadFields.aud;
    delete originalPayloadFields.iss;
    delete originalPayloadFields.jti;
    delete originalPayloadFields.nbf;
    delete originalPayloadFields.sub;

    // Step 4: Verify payload hash for integrity/non-repudiation
    const reconstructedString = stringify(originalPayloadFields);
    const actualHash = await hashSHA256(reconstructedString);

    if (actualHash !== verified.payloadHash) {
      throw new Error('Payload hash mismatch - data integrity violation');
    }

    return decrypted;
  }
}
