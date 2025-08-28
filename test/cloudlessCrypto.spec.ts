import CloudlessCrypto from '../src/cloudlessCrypto';

describe('CloudlessCrypto', () => {
  let crypto: CloudlessCrypto;

  beforeEach(() => {
    crypto = new CloudlessCrypto();
  });

  describe('factory functionality', () => {
    it('should provide access to both signer and encryptor', () => {
      expect(crypto.signer).toBeDefined();
      expect(crypto.encryptor).toBeDefined();
      expect(typeof crypto.signer.sign).toBe('function');
      expect(typeof crypto.encryptor.encryptToken).toBe('function');
    });

    it('should share the same key store between components', async () => {
      const signingKey = await crypto.generateSigningKeyPair();
      const encryptionKey = await crypto.generateEncryptionKeyPair();
      
      expect(typeof crypto.signer.hasKey).toBe('function');
      expect(crypto.encryptor.hasKey(encryptionKey.key)).toBe(true);
    });
  });

  describe('signing operations', () => {
    let signingKey: string;

    beforeEach(async () => {
      const result = await crypto.generateSigningKeyPair();
      signingKey = result.key;
    });

    it('should sign and verify objects', async () => {
      const payload = { userId: 'test', action: 'purchase' };
      
      const signed = await crypto.signObject(signingKey, payload);
      expect(signed).toHaveProperty('signature');
      expect(signed).toHaveProperty('protected');
      expect(signed).toHaveProperty('payload');
      
      const verified = await crypto.verifyObject(signed);
      expect(verified).toMatchObject(payload);
    });
  });

  describe('encryption operations', () => {
    let encryptionKey: string;

    beforeEach(async () => {
      const result = await crypto.generateEncryptionKeyPair();
      encryptionKey = result.key;
    });

    it('should encrypt and decrypt tokens', async () => {
      const payload = { userId: 'test', items: ['item1'] };
      
      const encrypted = await crypto.encryptToken(encryptionKey, payload);
      expect(typeof encrypted).toBe('string');
      
      const decrypted = await crypto.decryptToken(encryptionKey, encrypted);
      expect(decrypted).toMatchObject(payload);
    });

    it('should encrypt with options', async () => {
      const payload = { test: 'data' };
      const options = {
        audience: 'test-app',
        expirationTime: '30m',
        issuer: 'cloudless-crypto'
      };
      
      const encrypted = await crypto.encryptToken(encryptionKey, payload, options);
      const decrypted = await crypto.decryptToken(encryptionKey, encrypted);
      
      expect(decrypted).toMatchObject(payload);
      expect(decrypted).toHaveProperty('aud', 'test-app');
      expect(decrypted).toHaveProperty('iss', 'cloudless-crypto');
    });
  });

  describe('combined operations', () => {
    let signingKey: string;
    let encryptionKey: string;

    beforeEach(async () => {
      const signResult = await crypto.generateSigningKeyPair();
      const encryptResult = await crypto.generateEncryptionKeyPair();
      signingKey = signResult.key;
      encryptionKey = encryptResult.key;
    });

    it('should sign then encrypt data', async () => {
      const payload = { userId: 'test', items: ['item1', 'item2'] };
      const options = { audience: 'shopping-app' };
      
      const signedAndEncrypted = await crypto.signAndEncrypt(
        signingKey,
        encryptionKey,
        payload,
        options
      );
      
      expect(typeof signedAndEncrypted).toBe('string');
      expect(signedAndEncrypted.split('.')).toHaveLength(5); // JWE format
    });

    it('should decrypt then verify data', async () => {
      const payload = { userId: 'test', action: 'checkout' };
      
      const signedAndEncrypted = await crypto.signAndEncrypt(
        signingKey,
        encryptionKey,
        payload
      );
      
      const decryptedAndVerified = await crypto.decryptAndVerify(
        encryptionKey,
        signingKey,
        signedAndEncrypted
      );
      
      expect(decryptedAndVerified).toMatchObject(payload);
    });

    it('should handle full roundtrip with different keys', async () => {
      // Use separate key pairs for sender and receiver
      const senderSigning = await crypto.generateSigningKeyPair();
      const receiverEncryption = await crypto.generateEncryptionKeyPair();
      
      const payload = { message: 'secure communication', timestamp: Date.now() };
      
      // Sender signs with their private key and encrypts with receiver's public key
      const encrypted = await crypto.signAndEncrypt(
        senderSigning.key,
        receiverEncryption.key,
        payload,
        { audience: 'receiver', issuer: 'sender' }
      );
      
      // Receiver decrypts with their private key and verifies sender's signature
      const decrypted = await crypto.decryptAndVerify(
        receiverEncryption.key,
        senderSigning.key,
        encrypted
      );
      
      expect(decrypted).toMatchObject(payload);
    });
  });

  describe('error handling', () => {
    it('should handle missing keys gracefully', async () => {
      await expect(
        crypto.signObject('missing-key', {})
      ).rejects.toThrow('Key not found');
      
      await expect(
        crypto.encryptToken('missing-key', {})
      ).rejects.toThrow('Encryption key missing-key not found');
      
      await expect(
        crypto.decryptToken('missing-key', 'fake-token')
      ).rejects.toThrow('Decryption key missing-key not found');
    });
  });
});