import TokenCrypto from '../src/tokenCrypto';

describe('TokenCrypto', () => {
  let tokenCrypto: TokenCrypto;

  beforeEach(() => {
    tokenCrypto = new TokenCrypto();
  });

  describe('key generation', () => {
    it('should generate a key pair for encryption', async () => {
      const result = await tokenCrypto.generateKeyPairForEncryption();
      
      expect(result).toHaveProperty('key');
      expect(result).toHaveProperty('publicKey');
      expect(typeof result.key).toBe('string');
      expect(result.publicKey).toHaveProperty('kty');
      expect(result.publicKey.kty).toBe('RSA');
    });

    it('should generate different keys each time', async () => {
      const result1 = await tokenCrypto.generateKeyPairForEncryption();
      const result2 = await tokenCrypto.generateKeyPairForEncryption();
      
      expect(result1.key).not.toBe(result2.key);
    });
  });

  describe('token encryption and decryption', () => {
    let keyId: string;

    beforeEach(async () => {
      const result = await tokenCrypto.generateKeyPairForEncryption();
      keyId = result.key;
    });

    it('should encrypt and decrypt a simple payload', async () => {
      const payload = { userId: 'test-user', items: ['item1', 'item2'] };
      
      const encrypted = await tokenCrypto.encryptToken(keyId, payload);
      expect(typeof encrypted).toBe('string');
      expect(encrypted.split('.')).toHaveLength(5); // JWE format
      
      const decrypted = await tokenCrypto.decryptToken(keyId, encrypted);
      expect(decrypted).toMatchObject(payload);
    });

    it('should include JWT claims in encrypted token', async () => {
      const payload = { test: 'data' };
      const options = {
        audience: 'test-app',
        expirationTime: '1h',
        issuer: 'test-issuer'
      };
      
      const encrypted = await tokenCrypto.encryptToken(keyId, payload, options);
      const decrypted = await tokenCrypto.decryptToken(keyId, encrypted);
      
      expect(decrypted).toMatchObject(payload);
      expect(decrypted).toHaveProperty('aud', 'test-app');
      expect(decrypted).toHaveProperty('iss', 'test-issuer');
      expect(decrypted).toHaveProperty('exp');
      expect(decrypted).toHaveProperty('iat');
      expect(decrypted).toHaveProperty('jti');
    });

    it('should fail to decrypt with wrong key', async () => {
      const payload = { test: 'data' };
      const encrypted = await tokenCrypto.encryptToken(keyId, payload);
      
      const wrongKeyResult = await tokenCrypto.generateKeyPairForEncryption();
      
      await expect(
        tokenCrypto.decryptToken(wrongKeyResult.key, encrypted)
      ).rejects.toThrow('Token decryption failed');
    });

    it('should fail when key not found', async () => {
      const payload = { test: 'data' };
      
      await expect(
        tokenCrypto.encryptToken('non-existent-key', payload)
      ).rejects.toThrow('Encryption key non-existent-key not found');
      
      await expect(
        tokenCrypto.decryptToken('non-existent-key', 'fake-token')
      ).rejects.toThrow('Decryption key non-existent-key not found');
    });
  });

  describe('key management', () => {
    it('should list available keys', async () => {
      expect(tokenCrypto.getAvailableKeys()).toEqual([]);
      
      const result1 = await tokenCrypto.generateKeyPairForEncryption();
      const result2 = await tokenCrypto.generateKeyPairForEncryption();
      
      const keys = tokenCrypto.getAvailableKeys();
      expect(keys).toContain(result1.key);
      expect(keys).toContain(result2.key);
      expect(keys).toHaveLength(2);
    });

    it('should check if key exists', async () => {
      const result = await tokenCrypto.generateKeyPairForEncryption();
      
      expect(tokenCrypto.hasKey(result.key)).toBe(true);
      expect(tokenCrypto.hasKey('non-existent-key')).toBe(false);
    });

    it('should export and import key pairs', async () => {
      const result = await tokenCrypto.generateKeyPairForEncryption();
      const exported = await tokenCrypto.exportKeyPair(result.key);
      
      expect(exported).toHaveProperty('kid', result.key);
      expect(exported).toHaveProperty('publicKey');
      expect(exported).toHaveProperty('privateKey');
      expect(exported).toHaveProperty('alg');
      
      const newTokenCrypto = new TokenCrypto();
      await newTokenCrypto.importKeyPairForEncryption(
        exported.kid,
        exported.publicKey,
        exported.privateKey,
        exported.alg!
      );
      
      expect(newTokenCrypto.hasKey(exported.kid)).toBe(true);
      
      // Test that imported keys work
      const payload = { test: 'import-test' };
      const encrypted = await tokenCrypto.encryptToken(result.key, payload);
      const decrypted = await newTokenCrypto.decryptToken(exported.kid, encrypted);
      
      expect(decrypted).toMatchObject(payload);
    });
  });

  describe('decrypt with any key', () => {
    it('should decrypt token using any available key', async () => {
      const key1 = await tokenCrypto.generateKeyPairForEncryption();
      const key2 = await tokenCrypto.generateKeyPairForEncryption();
      
      const payload = { test: 'any-key-test' };
      const encrypted = await tokenCrypto.encryptToken(key2.key, payload);
      
      const decrypted = await tokenCrypto.decryptTokenWithAnyKey(encrypted);
      expect(decrypted).toMatchObject(payload);
    });

    it('should fail when no keys can decrypt', async () => {
      await tokenCrypto.generateKeyPairForEncryption();
      
      await expect(
        tokenCrypto.decryptTokenWithAnyKey('invalid.jwt.token.format.here')
      ).rejects.toThrow('Token decryption failed with all available keys');
    });
  });
});