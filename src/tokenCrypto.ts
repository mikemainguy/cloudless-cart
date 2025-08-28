import * as jose from 'jose';
import { JWK, KeyLike, JWTPayload } from 'jose';
import { v4 as uuidv4 } from 'uuid';
import { KeyStore, KeyPair } from './jsonSignature';

export interface EncryptionOptions {
  audience?: string;
  expirationTime?: string;
  issuer?: string;
}

export default class TokenCrypto {
  private readonly _keys: KeyStore;
  private debug = false;

  constructor(keyStore?: KeyStore, debug = false) {
    if (debug) {
      console.error(
        'Warning, Debug mode enabled, do not use in production...you may leak sensitive information!'
      );
    }
    this.debug = debug;
    this._keys = keyStore || new Map<string, KeyPair>();
  }

  private log(message: string, ...optionalParams: any[]) {
    if (this.debug) {
      console.log(message, optionalParams);
    }
  }

  public async generateKeyPairForEncryption(
    alg = 'RSA-OAEP-256'
  ): Promise<{ key: string; publicKey: JWK }> {
    const keyPair = await jose.generateKeyPair(alg, { extractable: true });
    const key = uuidv4();
    
    this._keys.set(key, {
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey,
      alg: alg,
    });
    
    const pubKey = await jose.exportJWK(keyPair.publicKey);
    this.log('Generated encryption key pair with ID:', key);
    
    return { key, publicKey: pubKey };
  }

  public async importKeyPairForEncryption(
    key: string,
    pub: JWK,
    priv: JWK,
    alg = 'RSA-OAEP-256'
  ): Promise<void> {
    const pubImp = await jose.importJWK(pub, alg);
    const privImp = await jose.importJWK(priv, alg);
    
    const pair: KeyPair = {
      publicKey: pubImp as KeyLike,
      privateKey: privImp as KeyLike,
      alg: alg,
    };
    
    this._keys.set(key, pair);
    this.log('Imported encryption key pair with ID:', key);
  }

  public async exportKeyPair(key: string): Promise<{
    kid: string;
    publicKey: JWK;
    privateKey: JWK;
    alg: string | undefined;
  }> {
    const value = this._keys.get(key);
    if (!value?.publicKey || !value?.privateKey) {
      throw new Error('Not a valid key pair');
    }
    
    const pub: JWK = await jose.exportJWK(value.publicKey);
    const priv: JWK = await jose.exportJWK(value.privateKey);
    
    return { kid: key, publicKey: pub, privateKey: priv, alg: value.alg };
  }

  public async encryptToken(
    keyId: string,
    payload: JWTPayload,
    options: EncryptionOptions = {}
  ): Promise<string> {
    const keyPair = this._keys.get(keyId);
    if (!keyPair?.publicKey) {
      throw new Error(`Encryption key ${keyId} not found`);
    }

    const start = performance.now();
    this.log('Starting token encryption for key:', keyId);

    try {
      const jwt = new jose.EncryptJWT(payload)
        .setProtectedHeader({ 
          alg: keyPair.alg || 'RSA-OAEP-256', 
          enc: 'A256GCM',
          kid: keyId 
        })
        .setIssuedAt()
        .setJti(uuidv4())
        .setExpirationTime(options.expirationTime || '2h');

      if (options.audience) {
        jwt.setAudience(options.audience);
      }
      
      if (options.issuer) {
        jwt.setIssuer(options.issuer);
      }

      const encrypted = await jwt.encrypt(keyPair.publicKey);
      
      this.log('Token encryption completed in:', performance.now() - start, 'ms');
      return encrypted;
    } catch (error) {
      throw new Error(`Token encryption failed: ${(error as Error).message}`);
    }
  }

  public async decryptToken(keyId: string, encryptedJWT: string): Promise<object> {
    const keyPair = this._keys.get(keyId);
    if (!keyPair?.privateKey) {
      throw new Error(`Decryption key ${keyId} not found`);
    }

    const start = performance.now();
    this.log('Starting token decryption for key:', keyId);

    try {
      const { payload, protectedHeader } = await jose.jwtDecrypt(
        encryptedJWT, 
        keyPair.privateKey
      );
      
      this.log('Token decryption completed in:', performance.now() - start, 'ms');
      this.log('Protected header:', protectedHeader);
      
      return payload;
    } catch (error) {
      throw new Error(`Token decryption failed: ${(error as Error).message}`);
    }
  }

  public async decryptTokenWithAnyKey(encryptedJWT: string): Promise<object> {
    let lastError: Error | null = null;
    const keyEntries = this._keys instanceof Map ? 
      Array.from(this._keys.entries()) : 
      Object.entries(this._keys as any);
    
    for (const [keyId, keyPair] of keyEntries) {
      if (!keyPair.privateKey) continue;
      
      try {
        return await this.decryptToken(keyId, encryptedJWT);
      } catch (error) {
        lastError = error as Error;
        this.log(`Failed to decrypt with key ${keyId}:`, error);
        continue;
      }
    }
    
    throw new Error(`Token decryption failed with all available keys. Last error: ${lastError?.message}`);
  }

  public getAvailableKeys(): string[] {
    const keys: string[] = [];
    const keyEntries = this._keys instanceof Map ? 
      Array.from(this._keys.keys()) : 
      Object.keys(this._keys as any);
    
    return keyEntries;
  }

  public hasKey(keyId: string): boolean {
    return this._keys.get(keyId) !== undefined;
  }
}