import JsonSignature from '../src/jsonSignature';

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
    void it('should generate keystore if not supplied', () => {
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
      const pair = await composer.exportKeyPair(keypair.key);
      const composer2 = new JsonSignature();
      expect(pair.alg).toBeDefined();
      await composer2.importKeyPair('testtest', pair.public, pair.private, pair.alg as string);
      const verified = await composer2.verify(signed, 'testtest');
      expect(verified).toEqual(message);
    });
  });
});
