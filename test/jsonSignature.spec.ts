import JsonSignature from '../src/jsonSignature';


void describe('json signature', () => {
  void it('should generate keystore if not supplied', async () => {
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