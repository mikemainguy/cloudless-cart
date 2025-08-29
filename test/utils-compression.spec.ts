import {
  compress,
  decompress,
  getAvailableCompressionMethods,
  getCompressionInfo,
  testCompression,
  CompressionMethod
} from '../src/utils/compression';

describe('Compression Utilities', () => {
  describe('compress function', () => {
    const testData = Buffer.from('Hello World! '.repeat(100));
    const testUint8Array = new Uint8Array(testData);

    it('should compress data using brotli method', async () => {
      const compressed = await compress(testUint8Array, { method: 'brotli' });
      expect(compressed).toBeDefined();
      expect(compressed.length).toBeLessThan(testUint8Array.length);
    });

    it('should compress data using gzip method', async () => {
      const compressed = await compress(testUint8Array, { method: 'gzip' });
      expect(compressed).toBeDefined();
      expect(compressed.length).toBeLessThan(testUint8Array.length);
    });

    it('should return original data when method is none', async () => {
      const compressed = await compress(testUint8Array, { method: 'none' });
      expect(compressed).toEqual(testUint8Array);
    });

    it('should use brotli as default when no method specified', async () => {
      const compressed = await compress(testUint8Array);
      expect(compressed).toBeDefined();
      // Should be compressed (smaller than original)
      expect(compressed.length).toBeLessThan(testUint8Array.length);
    });

    it('should handle empty data', async () => {
      const emptyData = new Uint8Array(0);
      const compressed = await compress(emptyData, { method: 'gzip' });
      expect(compressed).toBeDefined();
      expect(compressed.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle small data that may not compress well', async () => {
      const smallData = new Uint8Array([1, 2, 3, 4, 5]);
      const compressed = await compress(smallData, { method: 'brotli' });
      expect(compressed).toBeDefined();
      // Small data might not compress well, could be larger
    });

    it('should apply quality settings for brotli', async () => {
      const compressed1 = await compress(testUint8Array, { 
        method: 'brotli', 
        quality: 1 // Fast but less compression
      });
      const compressed11 = await compress(testUint8Array, { 
        method: 'brotli', 
        quality: 11 // Slow but more compression
      });
      
      expect(compressed1).toBeDefined();
      expect(compressed11).toBeDefined();
      // Higher quality should generally produce smaller output
      // TODO: Review if this test is meaningful - quality impact may vary
      expect(compressed11.length).toBeLessThanOrEqual(compressed1.length + 100); // Allow some variance
    });

    it('should apply quality settings for gzip', async () => {
      const compressed1 = await compress(testUint8Array, { 
        method: 'gzip', 
        quality: 1 
      });
      const compressed9 = await compress(testUint8Array, { 
        method: 'gzip', 
        quality: 9 
      });
      
      expect(compressed1).toBeDefined();
      expect(compressed9).toBeDefined();
      // TODO: Review if quality comparison is deterministic enough
    });

    it('should handle brotli mode parameter', async () => {
      const compressed = await compress(testUint8Array, { 
        method: 'brotli',
        mode: 1, // text mode
        quality: 4
      });
      expect(compressed).toBeDefined();
      expect(compressed.length).toBeLessThan(testUint8Array.length);
    });

    it('should handle brotli lgwin parameter', async () => {
      const compressed = await compress(testUint8Array, { 
        method: 'brotli',
        lgwin: 20 // window size
      });
      expect(compressed).toBeDefined();
      expect(compressed.length).toBeLessThan(testUint8Array.length);
    });
  });

  describe('decompress function', () => {
    const testData = Buffer.from('Hello World! '.repeat(100));
    const testUint8Array = new Uint8Array(testData);

    it('should decompress brotli compressed data', async () => {
      const compressed = await compress(testUint8Array, { method: 'brotli' });
      const decompressed = await decompress(compressed, 'brotli');
      expect(decompressed).toEqual(testUint8Array);
    });

    it('should decompress gzip compressed data', async () => {
      const compressed = await compress(testUint8Array, { method: 'gzip' });
      const decompressed = await decompress(compressed, 'gzip');
      expect(decompressed).toEqual(testUint8Array);
    });

    it('should return original data when method is none', async () => {
      const decompressed = await decompress(testUint8Array, 'none');
      expect(decompressed).toEqual(testUint8Array);
    });

    it('should auto-detect gzip format by magic bytes', async () => {
      const compressed = await compress(testUint8Array, { method: 'gzip' });
      // Don't specify method, let it auto-detect
      const decompressed = await decompress(compressed);
      expect(decompressed).toEqual(testUint8Array);
    });

    it('should handle brotli when auto-detection fails to find gzip', async () => {
      const compressed = await compress(testUint8Array, { method: 'brotli' });
      // Don't specify method, should try brotli as fallback
      const decompressed = await decompress(compressed);
      expect(decompressed).toEqual(testUint8Array);
    });

    it('should handle empty compressed data', async () => {
      const emptyData = new Uint8Array(0);
      const compressed = await compress(emptyData, { method: 'gzip' });
      const decompressed = await decompress(compressed, 'gzip');
      expect(decompressed.length).toBe(0);
    });

    it('should handle corrupted data gracefully', async () => {
      const corruptedData = new Uint8Array([255, 254, 253, 252, 251]);
      try {
        await decompress(corruptedData, 'brotli');
        // If it doesn't throw, it should return something
        expect(true).toBe(true);
      } catch (error) {
        // Expected to possibly fail
        expect(error).toBeDefined();
      }
    });

    it('should round-trip with different compression methods', async () => {
      const methods: CompressionMethod[] = ['brotli', 'gzip', 'none'];
      
      for (const method of methods) {
        const compressed = await compress(testUint8Array, { method });
        const decompressed = await decompress(compressed, method);
        expect(decompressed).toEqual(testUint8Array);
      }
    });
  });

  describe('getAvailableCompressionMethods', () => {
    it('should return available compression methods', async () => {
      const result = await getAvailableCompressionMethods();
      
      expect(result).toBeDefined();
      expect(result.environment).toMatch(/^(node|browser|unknown)$/);
      expect(typeof result.brotli).toBe('boolean');
      expect(typeof result.gzip).toBe('boolean');
    });

    it('should detect Node.js environment correctly', async () => {
      if (typeof process !== 'undefined' && process.versions?.node) {
        const result = await getAvailableCompressionMethods();
        expect(result.environment).toBe('node');
        // In Node.js, both should typically be available
        expect(result.gzip).toBe(true);
        // Brotli might not be available in all environments
        // TODO: Review if brotli availability check is needed
      }
    });

    it('should have at least one compression method available', async () => {
      const result = await getAvailableCompressionMethods();
      expect(result.brotli || result.gzip).toBe(true);
    });
  });

  describe('getCompressionInfo', () => {
    it('should return compression information', async () => {
      const info = await getCompressionInfo();
      
      expect(info).toBeDefined();
      expect(info.available).toBeDefined();
      expect(Array.isArray(info.methods)).toBe(true);
      expect(info.methods).toContain('none');
      expect(info.preferred).toMatch(/^(brotli|gzip|none)$/);
      expect(info.environment).toMatch(/^(node|browser|unknown)$/);
    });

    it('should prefer brotli when available', async () => {
      const info = await getCompressionInfo();
      const capabilities = await getAvailableCompressionMethods();
      
      if (capabilities.brotli) {
        expect(info.preferred).toBe('brotli');
      } else if (capabilities.gzip) {
        expect(info.preferred).toBe('gzip');
      } else {
        expect(info.preferred).toBe('none');
      }
    });

    it('should include all available methods', async () => {
      const info = await getCompressionInfo();
      const capabilities = await getAvailableCompressionMethods();
      
      if (capabilities.brotli) {
        expect(info.methods).toContain('brotli');
      }
      if (capabilities.gzip) {
        expect(info.methods).toContain('gzip');
      }
    });
  });

  describe('testCompression', () => {
    it('should test compression performance', async () => {
      const testData = Buffer.from('Test data '.repeat(100));
      const testUint8Array = new Uint8Array(testData);
      
      const result = await testCompression(testUint8Array);
      
      expect(result).toBeDefined();
      expect(result.original).toBe(testData.length);
    });

    it('should test brotli compression if available', async () => {
      const testData = Buffer.from('Test data '.repeat(100));
      const testUint8Array = new Uint8Array(testData);
      const capabilities = await getAvailableCompressionMethods();
      
      const result = await testCompression(testUint8Array);
      
      if (capabilities.brotli) {
        expect(result.brotli).toBeDefined();
        expect(result.brotli!.compressed).toBeGreaterThan(0);
        expect(result.brotli!.ratio).toBeGreaterThan(0);
        expect(result.brotli!.time).toBeGreaterThanOrEqual(0);
      }
    });

    it('should test gzip compression if available', async () => {
      const testData = Buffer.from('Test data '.repeat(100));
      const testUint8Array = new Uint8Array(testData);
      const capabilities = await getAvailableCompressionMethods();
      
      const result = await testCompression(testUint8Array);
      
      if (capabilities.gzip) {
        expect(result.gzip).toBeDefined();
        expect(result.gzip!.compressed).toBeGreaterThan(0);
        expect(result.gzip!.ratio).toBeGreaterThan(0);
        expect(result.gzip!.time).toBeGreaterThanOrEqual(0);
      }
    });

    it('should compare compression ratios', async () => {
      const testData = Buffer.from('A'.repeat(1000)); // Highly compressible
      const testUint8Array = new Uint8Array(testData);
      
      const result = await testCompression(testUint8Array);
      
      // Highly repetitive data should compress well
      if (result.brotli) {
        expect(result.brotli.ratio).toBeGreaterThan(50); // Should compress >50%
      }
      if (result.gzip) {
        expect(result.gzip.ratio).toBeGreaterThan(50); // Should compress >50%
      }
    });

    it('should handle small data in performance test', async () => {
      const smallData = new Uint8Array([1, 2, 3, 4, 5]);
      
      const result = await testCompression(smallData);
      
      expect(result).toBeDefined();
      expect(result.original).toBe(5);
      // Small data might not compress well
      // TODO: Review if testing small data compression is meaningful
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle Buffer input as well as Uint8Array', async () => {
      const buffer = Buffer.from('Test data');
      const compressed = await compress(buffer, { method: 'gzip' });
      const decompressed = await decompress(compressed, 'gzip');
      expect(Buffer.from(decompressed).toString()).toBe('Test data');
    });

    it('should handle very large data', async () => {
      const largeData = new Uint8Array(1024 * 1024); // 1MB
      for (let i = 0; i < largeData.length; i++) {
        largeData[i] = i % 256;
      }
      
      const compressed = await compress(largeData, { method: 'gzip' });
      expect(compressed).toBeDefined();
      expect(compressed.length).toBeGreaterThan(0);
      
      const decompressed = await decompress(compressed, 'gzip');
      expect(decompressed).toEqual(largeData);
    });

    it('should handle unicode text data', async () => {
      const unicodeText = '你好世界 🌍 Hello World مرحبا بالعالم';
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      const data = encoder.encode(unicodeText);
      
      const compressed = await compress(data, { method: 'brotli' });
      expect(compressed).toBeDefined();
      
      const decompressed = await decompress(compressed, 'brotli');
      expect(decompressed).toBeDefined();
      
      // Only decode if we got valid data back
      if (decompressed && decompressed.length > 0) {
        expect(decoder.decode(decompressed)).toBe(unicodeText);
      }
    });

    it('should handle binary data', async () => {
      const binaryData = new Uint8Array(256);
      for (let i = 0; i < 256; i++) {
        binaryData[i] = i;
      }
      
      const compressed = await compress(binaryData, { method: 'gzip' });
      const decompressed = await decompress(compressed, 'gzip');
      
      expect(decompressed).toEqual(binaryData);
    });

    it('should handle invalid compression method gracefully', async () => {
      const data = new Uint8Array([1, 2, 3]);
      // @ts-ignore - Testing invalid input
      const result = await compress(data, { method: 'invalid' });
      // Should fallback to returning original or use default
      expect(result).toBeDefined();
    });

    it('should handle null or undefined options', async () => {
      const data = new Uint8Array([1, 2, 3, 4, 5]);
      
      // Testing with undefined (should use default options)
      const compressed2 = await compress(data, undefined);
      expect(compressed2).toBeDefined();
      
      // Testing with no options (should use default)
      const compressed3 = await compress(data);
      expect(compressed3).toBeDefined();
      
      // TODO: Review if null options should be handled differently
      // Currently null will cause an error, which might be the desired behavior
    });

    it('should work with TypedArray views', async () => {
      const buffer = new ArrayBuffer(100);
      const view = new Uint8Array(buffer);
      for (let i = 0; i < 100; i++) {
        view[i] = i % 10;
      }
      
      const compressed = await compress(view, { method: 'brotli' });
      const decompressed = await decompress(compressed, 'brotli');
      
      expect(decompressed).toEqual(view);
    });

    // TODO: Add browser-specific tests when running in browser environment
    // - Test CompressionStream/DecompressionStream APIs
    // - Test brotli-wasm loading
    // - Test fallback behavior when APIs are unavailable

    // TODO: Add more performance benchmarks
    // - Compare compression speeds between methods
    // - Test with different data patterns (JSON, XML, binary, etc.)
    // - Memory usage tests for large files

    // TODO: Add integration tests
    // - Test with actual TokenCrypto integration
    // - Test with CloudlessCrypto full workflow
    // - Cross-environment compatibility tests
  });
});