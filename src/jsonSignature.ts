import * as jose from 'jose';
import { FlattenedJWS, GenerateKeyPairResult, JWK, KeyLike } from 'jose';
import { v4 as uuidv4 } from 'uuid';
import stringify from 'fast-json-stable-stringify';

const iterations = 1;
export type SignedObject = {
  signature: string;
  protected: string | undefined;
  payload: object;
};

export type KeyPair = {
  publicKey?: KeyLike;
  privateKey?: KeyLike;
  alg?: string;
};

export type KeyStore = {
  set: (key: string, value: KeyPair) => void;
  get: (key: string) => KeyPair | undefined;
};
export default class JsonSignature {
  private readonly _keys: KeyStore;
  private debug = false;
  constructor(keyStore?: KeyStore, debug = false) {
    if (debug) {
      console.error(
        'Warning, Debug mode enabled, do not use in production...you may leak sensitive information!'
      );
    }
    this.debug = debug;
    if (keyStore) {
      this._keys = keyStore;
    } else {
      this._keys = new Map<string, KeyPair>();
    }
  }
  public async exportKeyPair(key: string) : Promise<{kid: string, publicKey: JWK, privateKey: JWK, alg: string | undefined}> {
    const value = this._keys.get(key);
    if (!value?.publicKey || !value?.privateKey) {
      throw new Error('Not a valid key pair');
    }
    const pub: JWK = await jose.exportJWK(value.publicKey);
    const priv: JWK = await jose.exportJWK(value.privateKey);
    return { kid: key, publicKey: pub, privateKey: priv, alg: value.alg };
  }
  public async importKeyPair(key: string, pub: JWK, priv: JWK, alg: string) : Promise<void> {
    const pubImp = await jose.importJWK(pub, alg);
    const privImp = await jose.importJWK(priv, alg);
    const pair: KeyPair = {
      publicKey: pubImp as KeyLike,
      privateKey: privImp as KeyLike,
      alg: alg,
    }
    this._keys.set(key, pair);

  }
  private log(message: string, ...optionalParams: any[]) {
    if (this.debug) {
      console.log(message, optionalParams);
    }
  }

  async setPrivateKey(key: string, value: JWK) {
    const privKey = await jose.importJWK(value);
    this._keys.set(key, { privateKey: privKey as KeyLike });
  }
  async setPublicKey(key: string, value: JWK) {
    const pubKey = await jose.importJWK(value);
    this._keys.set(key, { publicKey: pubKey as KeyLike });
  }

  public async getPublicKey(key: string): Promise<JWK> {
    const value: KeyPair | undefined = this._keys.get(key);
    if (!value?.publicKey) {
      throw new Error('Key not found');
    }
    return await jose.exportJWK(value.publicKey);
  }

  public async generateKeyPair(
    alg = 'PS256'
  ): Promise<{ key: string; publicKey: JWK }> {
    const value: GenerateKeyPairResult = await jose.generateKeyPair(alg, {
      extractable: true,
    });
    const key = uuidv4();
    this._keys.set(key, {
      publicKey: value.publicKey,
      privateKey: value.privateKey,
      alg: alg,
    });
    const pubKey = await jose.exportJWK(value.publicKey);
    return { key, publicKey: pubKey };
  }

  public async sign(key: string, obj: object): Promise<SignedObject> {
    const value = this._keys.get(key);

    if (!value?.privateKey) {
      this.log('Key not found for ', key);
      throw new Error('Key not found');
    }
    let input = '';
    let jws = { signature: '', protected: '', payload: '' } as FlattenedJWS;
    const start = performance.now();
    this.log('start: ', start);
    for (let i = 0; i < iterations; i++) {
      input = stringify(obj);
      jws = await new jose.FlattenedSign(new TextEncoder().encode(input))
        .setProtectedHeader({
          alg: value?.alg,
          kid: key,
          b64: false,
          crit: ['b64'],
        })
        .sign(value.privateKey);
    }
    this.log('Time taken: ', performance.now() - start);
    this.log('Time taken: ', (performance.now() - start) / iterations);

    return {
      signature: jws.signature,
      protected: jws.protected,
      payload: JSON.parse(input),
    };
  }

  public async verify(signed: SignedObject, key?: string): Promise<object> {
    let v = {};
    const start = performance.now();
    this.log('start: ', start);
    for (let i = 0; i < iterations; i++) {
      v = await this._verify(signed, key);
    }
    this.log('Time taken: ', performance.now() - start);
    this.log('Time taken: ', (performance.now() - start) / iterations);
    return v;
  }

  private async _verify(signed: SignedObject, key?: string): Promise<object> {
    let kid = key;
    try {
      const header = jose.decodeProtectedHeader({
        protected: signed.protected,
        signature: signed.signature,
      });
      if (!key && header.kid) {
        kid = header.kid;
      } else {
        if (!key) {
          return { error: 'no key found'};
        }
      }
    } catch (e) {
      return { error: (e as Error).message };
    }
    if (!kid) {
      return { error: 'kid not found' };
    }
    const value = this._keys.get(kid);
    if (!value?.publicKey) {
      return { error: `Key ${kid} not found` };
    }
    const rsaPublicKey = value.publicKey;
    let options = {};
    if (value.alg) {
      options = { algorithms: [value.alg] };
    }
    try {
      const { payload } = await jose.flattenedVerify(
        {
          signature: signed.signature,
          protected: signed.protected,
          payload: stringify(signed.payload),
        },
        rsaPublicKey,
        options
      );
      return JSON.parse(new TextDecoder().decode(payload));
    } catch (e) {
      return { error: (e as Error).message };
    }
  }
}
