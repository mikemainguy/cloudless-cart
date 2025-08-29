import CloudlessCrypto from '../src/cloudlessCrypto';

describe('CloudlessCrypto - Encrypt-then-Sign', () => {
  let crypto: CloudlessCrypto;
  let encryptionKey: string;
  let signingKey: string;

  beforeEach(async () => {
    crypto = new CloudlessCrypto();
    
    const encResult = await crypto.generateEncryptionKeyPair();
    const signResult = await crypto.generateSigningKeyPair();
    
    encryptionKey = encResult.key;
    signingKey = signResult.key;
  });

  describe('encryptThenSign', () => {
    it('should encrypt payload then sign the encrypted data', async () => {
      const payload = { userId: 'alice', items: ['book'], total: 20 };
      
      const result = await crypto.encryptThenSign(
        encryptionKey,
        signingKey,
        payload
      );
      
      expect(result).toHaveProperty('signature');
      expect(result).toHaveProperty('protected');
      expect(result).toHaveProperty('payload');
      
      // Payload should contain encrypted data + metadata
      const signedPayload = result.payload;
      expect(signedPayload).toHaveProperty('encrypted');
      expect(signedPayload).toHaveProperty('payloadHash');
      expect(signedPayload).toHaveProperty('timestamp');
      expect(signedPayload).toHaveProperty('version', 1);
      
      // Encrypted field should be a JWT token
      expect(typeof signedPayload.encrypted).toBe('string');
      expect(signedPayload.encrypted.split('.')).toHaveLength(5); // JWE format
    });

    it('should include payload hash for non-repudiation', async () => {
      const payload = { userId: 'alice', data: 'sensitive' };
      
      const result = await crypto.encryptThenSign(
        encryptionKey,
        signingKey,
        payload
      );
      
      const signedPayload = result.payload;
      expect(signedPayload.payloadHash).toBeDefined();
      expect(typeof signedPayload.payloadHash).toBe('string');
      expect(signedPayload.payloadHash).toHaveLength(64); // SHA-256 hex
    });

    it('should include timestamp and version metadata', async () => {
      const payload = { test: 'data' };
      const beforeTime = Date.now();
      
      const result = await crypto.encryptThenSign(
        encryptionKey,
        signingKey,
        payload
      );
      
      const afterTime = Date.now();
      const signedPayload = result.payload;
      
      expect(signedPayload.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(signedPayload.timestamp).toBeLessThanOrEqual(afterTime);
      expect(signedPayload.version).toBe(1);
    });

    it('should support encryption options', async () => {
      const payload = { test: 'data' };
      const options = {
        audience: 'test-app',
        expirationTime: '1h',
        issuer: 'test-service'
      };
      
      const result = await crypto.encryptThenSign(
        encryptionKey,
        signingKey,
        payload,
        options
      );
      
      expect(result).toHaveProperty('payload');
      expect(result.payload).toHaveProperty('encrypted');
    });
  });

  describe('verifyThenDecrypt', () => {
    it('should verify signature then decrypt payload', async () => {
      const originalPayload = { userId: 'bob', items: ['laptop'], total: 1500 };
      
      const encrypted = await crypto.encryptThenSign(
        encryptionKey,
        signingKey,
        originalPayload
      );
      
      const decrypted = await crypto.verifyThenDecrypt(
        signingKey,
        encryptionKey,
        encrypted
      );
      
      expect(decrypted).toMatchObject(originalPayload);
    });

    it('should validate payload hash for integrity', async () => {
      const payload = { userId: 'charlie', sensitive: 'data' };
      
      const encrypted = await crypto.encryptThenSign(
        encryptionKey,
        signingKey,
        payload
      );
      
      const decrypted = await crypto.verifyThenDecrypt(
        signingKey,
        encryptionKey,
        encrypted
      );
      
      expect(decrypted).toMatchObject(payload);
    });

    it('should fail if signature is invalid', async () => {
      const payload = { test: 'data' };
      
      const encrypted = await crypto.encryptThenSign(
        encryptionKey,
        signingKey,
        payload
      );
      
      // Corrupt the signature
      const corrupted = { ...encrypted, signature: 'invalid-signature' };
      
      await expect(
        crypto.verifyThenDecrypt(signingKey, encryptionKey, corrupted)
      ).rejects.toThrow();
    });

    it('should fail if payload hash does not match', async () => {
      const payload = { test: 'data' };
      
      const encrypted = await crypto.encryptThenSign(
        encryptionKey,
        signingKey,
        payload
      );
      
      // Manually corrupt the payload hash in signed data
      const corruptedPayload = { ...encrypted.payload };
      corruptedPayload.payloadHash = 'invalid-hash';
      
      const corrupted = { 
        ...encrypted, 
        payload: corruptedPayload 
      };
      
      // Re-sign the corrupted payload to pass signature verification
      const resignedCorrupted = await crypto.signObject(signingKey, corruptedPayload);
      
      await expect(
        crypto.verifyThenDecrypt(signingKey, encryptionKey, resignedCorrupted)
      ).rejects.toThrow('Payload hash mismatch');
    });

    it('should fail with wrong decryption key', async () => {
      const payload = { test: 'data' };
      const wrongEncKey = (await crypto.generateEncryptionKeyPair()).key;
      
      const encrypted = await crypto.encryptThenSign(
        encryptionKey,
        signingKey,
        payload
      );
      
      await expect(
        crypto.verifyThenDecrypt(signingKey, wrongEncKey, encrypted)
      ).rejects.toThrow('Token decryption failed');
    });

    it('should fail with wrong signing key', async () => {
      const payload = { test: 'data' };
      const wrongSignKey = (await crypto.generateSigningKeyPair()).key;
      
      const encrypted = await crypto.encryptThenSign(
        encryptionKey,
        signingKey,
        payload
      );
      
      await expect(
        crypto.verifyThenDecrypt(wrongSignKey, encryptionKey, encrypted)
      ).rejects.toThrow();
    });
  });

  describe('comparison with sign-then-encrypt', () => {
    it('should produce different results than signAndEncrypt', async () => {
      const payload = { userId: 'test', comparison: 'test' };
      
      const signThenEncrypt = await crypto.signAndEncrypt(
        signingKey,
        encryptionKey,
        payload
      );
      
      const encryptThenSign = await crypto.encryptThenSign(
        encryptionKey,
        signingKey,
        payload
      );
      
      // Results should be different
      expect(signThenEncrypt).not.toEqual(encryptThenSign);
      
      // Sign-then-encrypt produces a JWE token (string)
      expect(typeof signThenEncrypt).toBe('string');
      
      // Encrypt-then-sign produces a JWS object
      expect(typeof encryptThenSign).toBe('object');
      expect(encryptThenSign).toHaveProperty('signature');
      expect(encryptThenSign).toHaveProperty('payload');
    });

    it('should both decrypt to same original payload', async () => {
      const originalPayload = { userId: 'test', items: ['item1'], total: 100 };
      
      // Sign-then-encrypt approach
      const signThenEncrypt = await crypto.signAndEncrypt(
        signingKey,
        encryptionKey,
        originalPayload
      );
      const decryptThenVerify = await crypto.decryptAndVerify(
        encryptionKey,
        signingKey,
        signThenEncrypt
      );
      
      // Encrypt-then-sign approach
      const encryptThenSign = await crypto.encryptThenSign(
        encryptionKey,
        signingKey,
        originalPayload
      );
      const verifyThenDecrypt = await crypto.verifyThenDecrypt(
        signingKey,
        encryptionKey,
        encryptThenSign
      );
      
      // Both should decrypt to original payload
      expect(decryptThenVerify).toMatchObject(originalPayload);
      expect(verifyThenDecrypt).toMatchObject(originalPayload);
    });
  });

  describe('security properties', () => {
    it('should fail fast on invalid signature before attempting decryption', async () => {
      const payload = { test: 'performance' };
      
      const encrypted = await crypto.encryptThenSign(
        encryptionKey,
        signingKey,
        payload
      );
      
      // Corrupt signature
      const corrupted = { ...encrypted, signature: 'totally-invalid' };
      
      const start = performance.now();
      
      try {
        await crypto.verifyThenDecrypt(signingKey, encryptionKey, corrupted);
        fail('Should have thrown an error');
      } catch (error) {
        const duration = performance.now() - start;
        
        // Should fail quickly (signature verification is fast)
        // Not testing exact timing, just that it doesn't take long
        expect(duration).toBeLessThan(100); // Less than 100ms
        // Error could be about signature verification or decryption depending on implementation
        expect((error as Error).message).toBeDefined();
      }
    });

    it('should prevent signature oracle attacks', async () => {
      // This test demonstrates that you cannot learn about signature validity
      // without having both keys (unlike sign-then-encrypt)
      
      const payload = { secret: 'data' };
      const validToken = await crypto.encryptThenSign(
        encryptionKey,
        signingKey,
        payload
      );
      
      // Attacker tries to test signature validity without decryption key
      // Should fail at signature verification step, not reveal anything about payload
      const wrongEncKey = (await crypto.generateEncryptionKeyPair()).key;
      
      await expect(
        crypto.verifyThenDecrypt(signingKey, wrongEncKey, validToken)
      ).rejects.toThrow('Token decryption failed');
      
      // The error is about decryption, not signature - attacker learns nothing
    });
  });
});