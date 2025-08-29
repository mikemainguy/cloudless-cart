import CloudlessCrypto from '../src/cloudlessCrypto';
import { EncryptionOptions } from '../src/tokenCrypto';

describe('Performance Tests', () => {
  let crypto: CloudlessCrypto;
  let signingKey: string;
  let encryptionKey: string;

  beforeAll(async () => {
    crypto = new CloudlessCrypto();
    signingKey = (await crypto.generateSigningKeyPair()).key;
    encryptionKey = (await crypto.generateEncryptionKeyPair()).key;
  });

  // Utility functions for performance testing
  interface PerformanceResult {
    operation: string;
    mode: string;
    payloadSize: string;
    originalSize: number;
    processedSize: number;
    compressionRatio: number;
    operationTime: number;
    compressed: boolean;
  }

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  const calculateCompressionRatio = (original: number, compressed: number): number => {
    if (original === 0) return 0;
    return Number(((original - compressed) / original * 100).toFixed(2));
  };

  const measurePerformance = async <T>(
    operation: () => Promise<T>,
    description: string
  ): Promise<{ result: T; timeMs: number }> => {
    const start = performance.now();
    const result = await operation();
    const timeMs = Number((performance.now() - start).toFixed(2));
    return { result, timeMs };
  };

  // Test payload generators
  const generatePayload = (targetSize: number): Record<string, unknown> => {
    const baseItem = {
      id: 'item-',
      name: 'Product Name',
      description: 'A detailed product description with specifications and features',
      price: 29.99,
      quantity: 1,
      category: 'Electronics',
      sku: 'SKU-12345',
      inStock: true,
      tags: ['featured', 'bestseller'],
      attributes: {
        color: 'blue',
        size: 'medium',
        weight: 1.5,
        dimensions: { length: 10, width: 8, height: 6 }
      },
      reviews: {
        rating: 4.5,
        count: 127,
        featured: 'Great product with excellent quality and fast shipping!'
      }
    };

    const items: any[] = [];
    let currentSize = 0;
    let itemIndex = 0;

    while (currentSize < targetSize * 0.8) { // Leave some room for metadata
      const item = {
        ...baseItem,
        id: `item-${itemIndex}`,
        name: `Product ${itemIndex} ${baseItem.name}`,
        sku: `SKU-${itemIndex}-${Math.random().toString(36).substr(2, 9)}`
      };
      
      // Add padding for larger payloads
      if (targetSize > 1000) {
        item.description += ' '.repeat(Math.min(200, Math.max(0, targetSize / items.length / 10)));
      }

      items.push(item);
      currentSize = JSON.stringify({ items }).length;
      itemIndex++;
    }

    return {
      userId: 'user-12345',
      sessionId: `session-${Date.now()}`,
      timestamp: Date.now(),
      items,
      totals: {
        subtotal: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
        tax: 8.25,
        shipping: 5.99,
        total: items.reduce((sum, item) => sum + item.price * item.quantity, 0) + 8.25 + 5.99
      },
      metadata: {
        source: 'web-app',
        version: '1.0.0',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        clientIP: '192.168.1.100',
        referrer: 'https://example.com/products'
      }
    };
  };

  const payloadSizes = [
    { name: '~100B', target: 100 },
    { name: '~1KB', target: 1000 },
    { name: '~10KB', target: 10000 },
    { name: '~100KB', target: 100000 }
  ];

  const testPayloads = payloadSizes.map(size => ({
    ...size,
    payload: generatePayload(size.target),
    actualSize: 0
  }));

  // Calculate actual payload sizes
  beforeAll(() => {
    testPayloads.forEach(test => {
      test.actualSize = JSON.stringify(test.payload).length;
    });
  });

  const results: PerformanceResult[] = [];

  const logResult = (result: PerformanceResult) => {
    results.push(result);
    console.log(
      `${result.operation.padEnd(12)} | ${result.mode.padEnd(20)} | ${result.payloadSize.padEnd(8)} | ` +
      `${formatBytes(result.originalSize).padStart(8)} | ${formatBytes(result.processedSize).padStart(8)} | ` +
      `${result.compressionRatio.toFixed(1).padStart(6)}% | ${result.operationTime.toFixed(2).padStart(8)}ms | ` +
      `${result.compressed ? 'Yes' : 'No'}`
    );
  };

  describe('Sign-Only Mode Performance', () => {
    testPayloads.forEach(({ name, payload, actualSize }) => {
      it(`should measure sign-only performance for ${name} payload (${formatBytes(actualSize)})`, async () => {
        const originalSize = actualSize;

        // Sign operation
        const { result: signed, timeMs: signTime } = await measurePerformance(
          () => crypto.signObject(signingKey, payload),
          `sign-${name}`
        );

        const signedSize = JSON.stringify(signed).length;

        logResult({
          operation: 'Sign',
          mode: 'Sign-Only',
          payloadSize: name,
          originalSize,
          processedSize: signedSize,
          compressionRatio: calculateCompressionRatio(originalSize, signedSize),
          operationTime: signTime,
          compressed: false
        });

        // Verify operation
        const { timeMs: verifyTime } = await measurePerformance(
          () => crypto.verifyObject(signed, signingKey),
          `verify-${name}`
        );

        logResult({
          operation: 'Verify',
          mode: 'Sign-Only',
          payloadSize: name,
          originalSize: signedSize,
          processedSize: originalSize,
          compressionRatio: calculateCompressionRatio(signedSize, originalSize),
          operationTime: verifyTime,
          compressed: false
        });

        expect(signed).toBeDefined();
        expect(signTime).toBeGreaterThan(0);
        expect(verifyTime).toBeGreaterThan(0);
      });
    });
  });

  describe('Encrypt-Then-Sign Mode Performance', () => {
    testPayloads.forEach(({ name, payload, actualSize }) => {
      // Test with compression
      it(`should measure encrypt-then-sign with compression for ${name} payload (${formatBytes(actualSize)})`, async () => {
        const originalSize = actualSize;
        const options: EncryptionOptions = { compress: true };

        // Encrypt-then-sign operation
        const { result: signed, timeMs: encryptSignTime } = await measurePerformance(
          () => crypto.encryptThenSign(encryptionKey, signingKey, payload, options),
          `encrypt-sign-compressed-${name}`
        );

        const processedSize = JSON.stringify(signed).length;

        logResult({
          operation: 'Encrypt+Sign',
          mode: 'Encrypt-Then-Sign+Comp',
          payloadSize: name,
          originalSize,
          processedSize,
          compressionRatio: calculateCompressionRatio(originalSize, processedSize),
          operationTime: encryptSignTime,
          compressed: true
        });

        // Verify-then-decrypt operation
        const { result: decrypted, timeMs: verifyDecryptTime } = await measurePerformance(
          () => crypto.verifyThenDecrypt(signingKey, encryptionKey, signed),
          `verify-decrypt-compressed-${name}`
        );

        logResult({
          operation: 'Verify+Decrypt',
          mode: 'Encrypt-Then-Sign+Comp',
          payloadSize: name,
          originalSize: processedSize,
          processedSize: JSON.stringify(decrypted).length,
          compressionRatio: 0, // Not applicable for decryption
          operationTime: verifyDecryptTime,
          compressed: true
        });

        expect(signed).toBeDefined();
        expect(decrypted).toBeDefined();
      });

      // Test without compression
      it(`should measure encrypt-then-sign without compression for ${name} payload (${formatBytes(actualSize)})`, async () => {
        const originalSize = actualSize;
        const options: EncryptionOptions = { compress: false };

        // Encrypt-then-sign operation
        const { result: signed, timeMs: encryptSignTime } = await measurePerformance(
          () => crypto.encryptThenSign(encryptionKey, signingKey, payload, options),
          `encrypt-sign-uncompressed-${name}`
        );

        const processedSize = JSON.stringify(signed).length;

        logResult({
          operation: 'Encrypt+Sign',
          mode: 'Encrypt-Then-Sign',
          payloadSize: name,
          originalSize,
          processedSize,
          compressionRatio: calculateCompressionRatio(originalSize, processedSize),
          operationTime: encryptSignTime,
          compressed: false
        });

        // Verify-then-decrypt operation
        const { result: decrypted, timeMs: verifyDecryptTime } = await measurePerformance(
          () => crypto.verifyThenDecrypt(signingKey, encryptionKey, signed),
          `verify-decrypt-uncompressed-${name}`
        );

        logResult({
          operation: 'Verify+Decrypt',
          mode: 'Encrypt-Then-Sign',
          payloadSize: name,
          originalSize: processedSize,
          processedSize: JSON.stringify(decrypted).length,
          compressionRatio: 0,
          operationTime: verifyDecryptTime,
          compressed: false
        });

        expect(signed).toBeDefined();
        expect(decrypted).toBeDefined();
      });
    });
  });

  describe('Sign-Then-Encrypt Mode Performance', () => {
    testPayloads.forEach(({ name, payload, actualSize }) => {
      // Test with compression
      it(`should measure sign-then-encrypt with compression for ${name} payload (${formatBytes(actualSize)})`, async () => {
        const originalSize = actualSize;
        const options: EncryptionOptions = { compress: true };

        // Sign-then-encrypt operation
        const { result: encrypted, timeMs: signEncryptTime } = await measurePerformance(
          () => crypto.signAndEncrypt(signingKey, encryptionKey, payload, options),
          `sign-encrypt-compressed-${name}`
        );

        const processedSize = encrypted.length; // JWT string

        logResult({
          operation: 'Sign+Encrypt',
          mode: 'Sign-Then-Encrypt+Comp',
          payloadSize: name,
          originalSize,
          processedSize,
          compressionRatio: calculateCompressionRatio(originalSize, processedSize),
          operationTime: signEncryptTime,
          compressed: true
        });

        // Decrypt-then-verify operation
        const { result: decrypted, timeMs: decryptVerifyTime } = await measurePerformance(
          () => crypto.decryptAndVerify(encryptionKey, signingKey, encrypted),
          `decrypt-verify-compressed-${name}`
        );

        logResult({
          operation: 'Decrypt+Verify',
          mode: 'Sign-Then-Encrypt+Comp',
          payloadSize: name,
          originalSize: processedSize,
          processedSize: JSON.stringify(decrypted).length,
          compressionRatio: 0,
          operationTime: decryptVerifyTime,
          compressed: true
        });

        expect(encrypted).toBeDefined();
        expect(decrypted).toBeDefined();
      });

      // Test without compression
      it(`should measure sign-then-encrypt without compression for ${name} payload (${formatBytes(actualSize)})`, async () => {
        const originalSize = actualSize;
        const options: EncryptionOptions = { compress: false };

        // Sign-then-encrypt operation
        const { result: encrypted, timeMs: signEncryptTime } = await measurePerformance(
          () => crypto.signAndEncrypt(signingKey, encryptionKey, payload, options),
          `sign-encrypt-uncompressed-${name}`
        );

        const processedSize = encrypted.length;

        logResult({
          operation: 'Sign+Encrypt',
          mode: 'Sign-Then-Encrypt',
          payloadSize: name,
          originalSize,
          processedSize,
          compressionRatio: calculateCompressionRatio(originalSize, processedSize),
          operationTime: signEncryptTime,
          compressed: false
        });

        // Decrypt-then-verify operation
        const { result: decrypted, timeMs: decryptVerifyTime } = await measurePerformance(
          () => crypto.decryptAndVerify(encryptionKey, signingKey, encrypted),
          `decrypt-verify-uncompressed-${name}`
        );

        logResult({
          operation: 'Decrypt+Verify',
          mode: 'Sign-Then-Encrypt',
          payloadSize: name,
          originalSize: processedSize,
          processedSize: JSON.stringify(decrypted).length,
          compressionRatio: 0,
          operationTime: decryptVerifyTime,
          compressed: false
        });

        expect(encrypted).toBeDefined();
        expect(decrypted).toBeDefined();
      });
    });
  });

  afterAll(() => {
    console.log('\n' + '='.repeat(120));
    console.log('PERFORMANCE TEST SUMMARY');
    console.log('='.repeat(120));
    console.log(
      'Operation    | Mode                 | Size     | Original | Processed | Ratio  |     Time | Compressed'
    );
    console.log('-'.repeat(120));

    // Group results by payload size for better readability
    payloadSizes.forEach(({ name }) => {
      const sizeResults = results.filter(r => r.payloadSize === name);
      if (sizeResults.length > 0) {
        console.log(`\n--- ${name} Payload Results ---`);
        sizeResults.forEach(result => {
          console.log(
            `${result.operation.padEnd(12)} | ${result.mode.padEnd(20)} | ${result.payloadSize.padEnd(8)} | ` +
            `${formatBytes(result.originalSize).padStart(8)} | ${formatBytes(result.processedSize).padStart(8)} | ` +
            `${result.compressionRatio >= 0 ? result.compressionRatio.toFixed(1) + '%' : 'N/A'.padStart(6)} | ` +
            `${result.operationTime.toFixed(2).padStart(8)}ms | ${result.compressed ? 'Yes' : 'No'}`
          );
        });
      }
    });

    // Summary statistics
    console.log('\n' + '='.repeat(120));
    console.log('COMPRESSION EFFECTIVENESS SUMMARY');
    console.log('='.repeat(120));

    payloadSizes.forEach(({ name }) => {
      const compressedResults = results.filter(r => 
        r.payloadSize === name && 
        r.compressed && 
        r.operation.includes('+') &&
        r.compressionRatio > 0
      );

      if (compressedResults.length > 0) {
        const avgCompression = compressedResults.reduce((sum, r) => sum + r.compressionRatio, 0) / compressedResults.length;
        const maxCompression = Math.max(...compressedResults.map(r => r.compressionRatio));
        console.log(`${name}: Avg compression: ${avgCompression.toFixed(1)}%, Max compression: ${maxCompression.toFixed(1)}%`);
      }
    });

    console.log('\n' + '='.repeat(120));
    console.log('PERFORMANCE INSIGHTS');
    console.log('='.repeat(120));
    console.log('• Larger payloads benefit more from compression');
    console.log('• Encrypt-then-sign typically offers better compression due to structure');
    console.log('• Sign-only mode is fastest but offers no confidentiality');
    console.log('• Compression overhead is minimal compared to encryption/signing operations');
    console.log('='.repeat(120));
  });
});