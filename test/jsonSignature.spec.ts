import JsonSignature, { KeyPair, KeyStore, SignedObject } from '../src/jsonSignature';
import * as jose from 'jose';
void describe('json signature', () => {
  describe('debug mode', () => {
    void it('should log debug messages', async () => {
      const logSpy = jest.spyOn(global.console, 'log');
      const errorSpy = jest.spyOn(global.console, 'error');
      const composer = new JsonSignature(undefined, true);
      const keypair = await composer.generateKeyPair();
      const message = { message: 'hello', id: 1 };
      const signed = await composer.sign(keypair.key, message);
      expect(signed).toBeDefined();
      expect(signed.signature).toBeDefined();
      expect(signed.payload).toEqual(message);
      const verified = await composer.verify(signed);
      expect(verified).toEqual(message);
      expect(logSpy).toHaveBeenCalledTimes(6);
      expect(errorSpy).toHaveBeenCalledTimes(1);
      logSpy.mockRestore();
    });
  });
  describe('core operations', () => {
    void it('should accept keystore if supplied', () => {
      const composer = new JsonSignature();
      expect(composer).toBeDefined();
    });
    void it('should generate keystore if not supplied', async () => {
      const composer = new JsonSignature();
      const keypair = await composer.generateKeyPair();
      expect(keypair.key).toBeDefined();
      expect(keypair.publicKey).toBeDefined();
    });
    void it('should sign and verify a message', async () => {
      const composer = new JsonSignature();
      const keypair = await composer.generateKeyPair();
      const message = { message: 'hello', id: 1 };
      const signed = await composer.sign(keypair.key, message);
      expect(signed).toBeDefined();
      expect(signed.signature).toBeDefined();
      expect(signed.payload).toEqual(message);
      const verified = await composer.verify(signed);
      expect(verified).toEqual(message);
    });
  });
  describe('key store operations', () => {
    void it('should be able to be created with default keystore', async() => {
      const keys = new Map<string, KeyPair>();
      expect(keys.size).toEqual(0);
      const composer = new JsonSignature(keys as KeyStore);
      expect(composer).toBeDefined();
      const keypair = await composer.generateKeyPair();
      expect(keys.size).toEqual(1);
      expect(keys.get(keypair.key)).toBeDefined();
    });
    void it('should set and get a key pair', async () => {
      const composer = new JsonSignature();
      const keypair = await composer.generateKeyPair();
      const pair = await composer.exportKeyPair(keypair.key);
      expect(pair).toBeDefined();
    });
    void it('should be able to sign with exported key pair', async () => {
      const composer = new JsonSignature();
      const keypair = await composer.generateKeyPair();
      const message = { message: 'hello', id: 1 };
      const signed = await composer.sign(keypair.key, message);
      const pubKey = await composer.getPublicKey(keypair.key);
      const composer2 = new JsonSignature();
      await composer2.setPublicKey('testtest', pubKey);
      const verified = await composer2.verify(signed, 'testtest');
      expect(verified).toEqual(message);
    });
    void it('Should throw and error if public key not found', async () => {
      const composer = new JsonSignature();
      const keypair = await composer.generateKeyPair();
      await expect(composer.getPublicKey('foo')).rejects.toThrow('Key not found');
    });
    void it('Should return error object if protected header invalid', async () => {
      const composer = new JsonSignature();
      const keypair = await composer.generateKeyPair();
      const message: SignedObject = { signature: 'asdf', protected: 'aaa', payload: { message: 'hello', id: 1 } };
      const decoded = await composer.verify(message);
      expect(decoded).toEqual({ error: "Invalid Token or Protected Header formatting" });
    });
    void it('Should return error object if protected header invalid', async () => {
      const composer = new JsonSignature();
      const keypair = await composer.generateKeyPair();
      const message = await composer.sign(keypair.key, { message: 'hello', id: 1 });
      const decoded = await composer.verify(message, 'foo');
      expect(decoded).toEqual({ error: "Key foo not found" });
    });
    void it('Should return error object if protected header invalid', async () => {
      const composer = new JsonSignature();
      const keypair = await composer.generateKeyPair();
      const message = await composer.sign(keypair.key, { message: 'hello', id: 1 });
      const header = jose.decodeProtectedHeader({protected: message.protected, signature: message.signature});

      const decoded = await composer.verify(message, 'foo');
      expect(decoded).toEqual({ error: "Key foo not found" });
    });
  });
});
