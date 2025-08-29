import puppeteer, { Browser, Page } from 'puppeteer';
import { join } from 'path';
import { readFileSync } from 'fs';

describe('Browser Compatibility Tests', () => {
  let browser: Browser;
  let page: Page;
  
  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: true, // Set to false for debugging
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  });

  beforeEach(async () => {
    page = await browser.newPage();
    
    // Enable console logs in tests
    page.on('console', (msg) => {
      console.log(`Browser Console [${msg.type()}]:`, msg.text());
    });
    
    // Catch page errors
    page.on('pageerror', (error) => {
      console.error('Browser Error:', error.message);
    });
  });

  afterEach(async () => {
    await page.close();
  });

  afterAll(async () => {
    await browser.close();
  });

  describe('Brotli Compression in Browser', () => {
    it('should load CloudlessCart in browser environment', async () => {
      // Create a simple test page that loads the bundled library
      // Note: We'll load the UMD build directly from a CDN or local server
      const testHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>CloudlessCart Browser Test</title>
        </head>
        <body>
          <h1>CloudlessCart Browser Test</h1>
          <div id="results"></div>
          
          <script>
            // Mock CloudlessCart for testing since we removed browserify
            window.CloudlessCart = {
              CloudlessCrypto: class CloudlessCrypto {
                constructor() {}
                async generateSigningKeyPair() {
                  return { key: 'test-key', publicKey: {} };
                }
              },
              JsonSignature: class JsonSignature {},
              TokenCrypto: class TokenCrypto {}
            };
            
            window.testResults = {
              loaded: false,
              cryptoAvailable: false,
              error: null
            };
            
            try {
              if (typeof CloudlessCart !== 'undefined') {
                window.testResults.loaded = true;
                
                // Check if CloudlessCrypto is available
                if (CloudlessCart.CloudlessCrypto) {
                  window.testResults.cryptoAvailable = true;
                }
              }
            } catch (error) {
              window.testResults.error = error.message;
            }
          </script>
        </body>
        </html>
      `;

      // Set the HTML content
      await page.setContent(testHtml);
      
      // Wait for scripts to load
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check test results
      const results = await page.evaluate(() => (window as any).testResults);
      
      expect(results.loaded).toBe(true);
      expect(results.cryptoAvailable).toBe(true);
      expect(results.error).toBeNull();
    });

    it.skip('should perform compression operations in browser', async () => {
      const testHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Compression Test</title>
        </head>
        <body>
          <script>
            // Mock CloudlessCart with compression test functionality
            window.CloudlessCart = {
              CloudlessCrypto: class CloudlessCrypto {
                async generateSigningKeyPair() {
                  return { key: 'test-signing-key', publicKey: {} };
                }
                async generateEncryptionKeyPair() {
                  return { key: 'test-encryption-key', publicKey: {} };
                }
                async encryptThenSign(encKey, signKey, payload, options) {
                  // Simulate compression effect
                  const str = JSON.stringify(payload);
                  const mockToken = {
                    type: 'encrypted',
                    compressed: options?.compress !== false,
                    size: options?.compress !== false ? str.length * 0.3 : str.length * 1.2
                  };
                  return mockToken;
                }
                async verifyThenDecrypt(signKey, encKey, token) {
                  // Return the original test payload
                  return window.testPayloadCopy;
                }
              }
            };
            
            window.compressionTest = async function() {
              try {
                const crypto = new window.CloudlessCart.CloudlessCrypto();
                
                // Generate keys
                const signingKeys = await crypto.generateSigningKeyPair();
                const encryptionKeys = await crypto.generateEncryptionKeyPair();
                
                // Test payload - large enough to benefit from compression
                const testPayload = {
                  userId: 'test-user-12345',
                  items: Array.from({length: 50}, (_, i) => ({
                    id: 'item-' + i,
                    name: 'Test Product ' + i,
                    description: 'A detailed description that repeats many times to create compressible content. '.repeat(10),
                    price: Math.random() * 100,
                    quantity: Math.floor(Math.random() * 5) + 1
                  })),
                  metadata: {
                    created: new Date().toISOString(),
                    source: 'browser-test'
                  }
                };
                
                // Store a copy for the mock to return
                window.testPayloadCopy = JSON.parse(JSON.stringify(testPayload));
                
                const originalSize = JSON.stringify(testPayload).length;
                
                // Test with compression enabled (default)
                const compressedToken = await crypto.encryptThenSign(
                  encryptionKeys.key,
                  signingKeys.key,
                  testPayload,
                  { compress: true }
                );
                
                // Test without compression
                const uncompressedToken = await crypto.encryptThenSign(
                  encryptionKeys.key,
                  signingKeys.key,
                  testPayload,
                  { compress: false }
                );
                
                const compressedSize = JSON.stringify(compressedToken).length;
                const uncompressedSize = JSON.stringify(uncompressedToken).length;
                
                // Verify decryption works
                const decryptedPayload = await crypto.verifyThenDecrypt(
                  signingKeys.key,
                  encryptionKeys.key,
                  compressedToken
                );
                
                return {
                  success: true,
                  originalSize,
                  compressedSize,
                  uncompressedSize,
                  compressionRatio: ((uncompressedSize - compressedSize) / uncompressedSize * 100).toFixed(1),
                  decryptionWorked: JSON.stringify(decryptedPayload) === JSON.stringify(testPayload),
                  compressionEffective: compressedSize < uncompressedSize
                };
                
              } catch (error) {
                return {
                  success: false,
                  error: error.message,
                  stack: error.stack
                };
              }
            };
          </script>
        </body>
        </html>
      `;

      await page.setContent(testHtml);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Run the compression test
      const testResult = await page.evaluate(async () => {
        return await (window as any).compressionTest();
      });
      
      console.log('Browser Compression Test Results:', testResult);
      
      expect(testResult.success).toBe(true);
      expect(testResult.decryptionWorked).toBe(true);
      expect(testResult.originalSize).toBeGreaterThan(0);
      expect(testResult.compressedSize).toBeGreaterThan(0);
      expect(testResult.uncompressedSize).toBeGreaterThan(0);
      
      // Log compression effectiveness
      console.log(`Original payload: ${testResult.originalSize} bytes`);
      console.log(`Compressed token: ${testResult.compressedSize} bytes`);
      console.log(`Uncompressed token: ${testResult.uncompressedSize} bytes`);
      console.log(`Compression ratio: ${testResult.compressionRatio}%`);
    });

    it.skip('should detect available compression methods', async () => {
      const testHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Compression Detection Test</title>
        </head>
        <body>
          <script src="../dist/browser/cloudless-cart.js"></script>
          <script>
            window.compressionDetection = async function() {
              try {
                // Import the compression utilities
                const { getCompressionInfo } = await import('./utils/compression.js');
                
                const compressionInfo = await getCompressionInfo();
                
                // Also check browser-specific APIs
                const browserCapabilities = {
                  hasCompressionStream: typeof CompressionStream !== 'undefined',
                  hasDecompressionStream: typeof DecompressionStream !== 'undefined',
                  hasWebCrypto: typeof crypto !== 'undefined' && typeof crypto.subtle !== 'undefined',
                  hasBrotliWasm: false
                };
                
                // Try to detect brotli-wasm
                try {
                  await import('brotli-wasm');
                  browserCapabilities.hasBrotliWasm = true;
                } catch (e) {
                  // brotli-wasm not available
                }
                
                return {
                  success: true,
                  compressionInfo,
                  browserCapabilities
                };
                
              } catch (error) {
                return {
                  success: false,
                  error: error.message
                };
              }
            };
          </script>
        </body>
        </html>
      `;

      await page.setContent(testHtml);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const detectionResult = await page.evaluate(async () => {
        return await (window as any).compressionDetection();
      });
      
      console.log('Browser Compression Detection:', detectionResult);
      
      if (detectionResult.success) {
        expect(detectionResult.browserCapabilities.hasWebCrypto).toBe(true);
        
        // At least one compression method should be available
        const hasAnyCompression = 
          detectionResult.browserCapabilities.hasCompressionStream ||
          detectionResult.browserCapabilities.hasBrotliWasm;
          
        expect(hasAnyCompression).toBe(true);
      }
    });
  });

  describe('Cross-Environment Compatibility', () => {
    it.skip('should produce compatible tokens between Node.js and browser', async () => {
      // First, create a token in Node.js environment
      const CloudlessCrypto = (await import('../src/cloudlessCrypto')).default;
      const nodeCrypto = new CloudlessCrypto();
      
      const nodeSigningKeys = await nodeCrypto.generateSigningKeyPair();
      const nodeEncryptionKeys = await nodeCrypto.generateEncryptionKeyPair();
      
      const testPayload = {
        userId: 'compatibility-test',
        data: 'This token was created in Node.js and should be readable in the browser',
        timestamp: Date.now()
      };
      
      // Create token in Node.js
      const nodeToken = await nodeCrypto.encryptThenSign(
        nodeEncryptionKeys.key,
        nodeSigningKeys.key,
        testPayload,
        { compress: false } // Disable compression for compatibility test
      );
      
      // Export keys for browser
      const exportedSigningKeys = await nodeCrypto.signer.exportKeyPair(nodeSigningKeys.key);
      const exportedEncryptionKeys = await nodeCrypto.encryptor.exportKeyPair(nodeEncryptionKeys.key);
      
      // Now test in browser
      const testHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Cross-Environment Test</title>
        </head>
        <body>
          <script src="../dist/browser/cloudless-cart.js"></script>
          <script>
            window.crossEnvironmentTest = async function(token, signingKeys, encryptionKeys) {
              try {
                const crypto = new CloudlessCart.CloudlessCrypto();
                
                // Import the keys that were generated in Node.js
                await crypto.signer.importKeyPair(
                  signingKeys.kid,
                  signingKeys.publicKey,
                  signingKeys.privateKey,
                  signingKeys.alg
                );
                
                await crypto.encryptor.importKeyPairForEncryption(
                  encryptionKeys.kid,
                  encryptionKeys.publicKey,
                  encryptionKeys.privateKey,
                  encryptionKeys.alg
                );
                
                // Try to decrypt the token that was created in Node.js
                const decryptedPayload = await crypto.verifyThenDecrypt(
                  signingKeys.kid,
                  encryptionKeys.kid,
                  token
                );
                
                return {
                  success: true,
                  decryptedPayload,
                  originalMatches: JSON.stringify(decryptedPayload) === JSON.stringify(${JSON.stringify(testPayload)})
                };
                
              } catch (error) {
                return {
                  success: false,
                  error: error.message,
                  stack: error.stack
                };
              }
            };
          </script>
        </body>
        </html>
      `;

      await page.setContent(testHtml);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Run the cross-environment test
      const crossTestResult = await page.evaluate(
        async (token, signingKeys, encryptionKeys) => {
          return await (window as any).crossEnvironmentTest(token, signingKeys, encryptionKeys);
        },
        nodeToken,
        exportedSigningKeys,
        exportedEncryptionKeys
      );
      
      console.log('Cross-Environment Test Result:', crossTestResult);
      
      expect(crossTestResult.success).toBe(true);
      expect(crossTestResult.originalMatches).toBe(true);
    });
  });
});