import JsonSignature, { KeyStore } from './jsonSignature';
import TokenCrypto, { EncryptionOptions } from './tokenCrypto';
import { JWTPayload } from 'jose';

export default class CloudlessCrypto {
  public readonly signer: JsonSignature;
  public readonly encryptor: TokenCrypto;

  constructor(keyStore?: KeyStore, debug = false) {
    const store = keyStore || new Map();
    this.signer = new JsonSignature(store, debug);
    this.encryptor = new TokenCrypto(store, debug);
  }

  public async generateSigningKeyPair(alg = 'PS256'): Promise<{ key: string; publicKey: any }> {
    return await this.signer.generateKeyPair(alg);
  }

  public async generateEncryptionKeyPair(alg = 'RSA-OAEP-256'): Promise<{ key: string; publicKey: any }> {
    return await this.encryptor.generateKeyPairForEncryption(alg);
  }

  public async signAndEncrypt(
    signingKey: string,
    encryptionKey: string,
    payload: object,
    encryptionOptions?: EncryptionOptions
  ): Promise<string> {
    const signed = await this.signer.sign(signingKey, payload);
    return await this.encryptor.encryptToken(encryptionKey, signed, encryptionOptions);
  }

  public async decryptAndVerify(
    decryptionKey: string,
    verificationKey: string,
    encryptedToken: string
  ): Promise<object> {
    const decrypted = await this.encryptor.decryptToken(decryptionKey, encryptedToken);
    return await this.signer.verify(decrypted as any, verificationKey);
  }

  public async signObject(key: string, obj: object): Promise<any> {
    return await this.signer.sign(key, obj);
  }

  public async verifyObject(signed: any, key?: string): Promise<object> {
    return await this.signer.verify(signed, key);
  }

  public async encryptToken(
    key: string,
    payload: JWTPayload,
    options?: EncryptionOptions
  ): Promise<string> {
    return await this.encryptor.encryptToken(key, payload, options);
  }

  public async decryptToken(key: string, encryptedToken: string): Promise<object> {
    return await this.encryptor.decryptToken(key, encryptedToken);
  }
}