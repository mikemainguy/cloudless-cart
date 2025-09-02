import * as jose from 'jose';
import { JWK, KeyLike, JWTPayload } from 'jose';
import { v4 as uuidv4 } from 'uuid';
import { KeyStore, KeyPair } from './jsonSignature';
import { 
  compress as compressData, 
  decompress as decompressData,
  CompressionMethod 
} from './utils/compression';

export interface EncryptionOptions {
  audience?: string;
  expirationTime?: string;
  issuer?: string;
  compress?: boolean | CompressionMethod;  // Can be boolean, 'brotli', 'gzip', or 'none'
}

/**
 * Compression header implementation
 * 
 * Since the jose library (v5.x) removed zip header support for security reasons,
 * we use a custom 'x-compression' header that clients can read before decryption:
 * 
 * - "brotli": Brotli compression algorithm
 * - "gzip": Gzip compression algorithm  
 * - "deflate": Deflate compression algorithm
 * 
 * This allows clients to detect compression before decryption while maintaining
 * compatibility with the current jose library.
 */

export default class TokenCrypto {
  private readonly _keys: KeyStore;
  private debug = false;

  constructor(keyStore?: KeyStore, debug = false) {
    if (debug) {
      console.error(
        'Warning, Debug mode enabled, do not use in production...you may leak sensitive information!'
      );
    }
    this.debug = debug;
    this._keys = keyStore || new Map<string, KeyPair>();
  }

  private log(message: string, ...optionalParams: any[]) {
    if (this.debug) {
      console.log(message, optionalParams);
    }
  }

  public async generateKeyPairForEncryption(
    alg = 'RSA-OAEP-256'
  ): Promise<{ key: string; publicKey: JWK }> {
    const keyPair = await jose.generateKeyPair(alg, { extractable: true });
    const key = uuidv4();

    this._keys.set(key, {
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey,
      alg: alg,
    });

    const pubKey = await jose.exportJWK(keyPair.publicKey);
    this.log('Generated encryption key pair with ID:', key);

    return { key, publicKey: pubKey };
  }

  public async importKeyPairForEncryption(
    key: string,
    pub: JWK,
    priv: JWK,
    alg = 'RSA-OAEP-256'
  ): Promise<void> {
    const pubImp = await jose.importJWK(pub, alg);
    const privImp = await jose.importJWK(priv, alg);

    const pair: KeyPair = {
      publicKey: pubImp as KeyLike,
      privateKey: privImp as KeyLike,
      alg: alg,
    };

    this._keys.set(key, pair);
    this.log('Imported encryption key pair with ID:', key);
  }

  public async exportKeyPair(key: string): Promise<{
    kid: string;
    publicKey: JWK;
    privateKey: JWK;
    alg: string | undefined;
  }> {
    const value = this._keys.get(key);
    if (!value?.publicKey || !value?.privateKey) {
      throw new Error('Not a valid key pair');
    }

    const pub: JWK = await jose.exportJWK(value.publicKey);
    const priv: JWK = await jose.exportJWK(value.privateKey);

    return { kid: key, publicKey: pub, privateKey: priv, alg: value.alg };
  }

  public async encryptToken(
    keyId: string,
    payload: JWTPayload,
    options: EncryptionOptions = {}
  ): Promise<string> {
    const keyPair = this._keys.get(keyId);
    if (!keyPair?.publicKey) {
      throw new Error(`Encryption key ${keyId} not found`);
    }

    const start = performance.now();
    this.log('Starting token encryption for key:', keyId);

    try {
      let processedPayload = payload;
      const headers = {
        alg: keyPair.alg || 'RSA-OAEP-256',
        enc: 'A256GCM' as const,
        kid: keyId,
        'x-compression': undefined as string | undefined,
      };

      // Apply compression and set zip header if enabled
      if (options.compress !== false && options.compress !== 'none') {
        // Determine compression method
        let compressionMethod: CompressionMethod = 'brotli'; // default
        if (typeof options.compress === 'string') {
          compressionMethod = options.compress as CompressionMethod;
        } else if (options.compress === true) {
          compressionMethod = 'brotli'; // default when true
        }
        
        const payloadString = JSON.stringify(payload);
        const payloadBuffer = Buffer.from(payloadString, 'utf8');
        
        try {
          // Try compression with the requested method
          const compressed = await compressData(payloadBuffer, {
            method: compressionMethod,
            mode: 1, // 1 = text mode for JSON data
            quality: compressionMethod === 'brotli' ? 4 : 6, // Optimized quality for each method
            lgwin: 22 // Window size for brotli
          });
          
          if (compressed && compressed.length < payloadBuffer.length) {
            // Detect actual compression method used by examining the compressed data
            let actualMethod = this.detectCompressionMethod(compressed, compressionMethod);
            
            processedPayload = {
              _compressed: Buffer.from(compressed).toString('base64'),
              _originalSize: payloadBuffer.length,
              _compression: actualMethod === 'brotli' ? 'br' : actualMethod,
            };
            
            // Set header to the ACTUAL method used, not the requested method
            headers['x-compression'] = actualMethod;
            
            this.log(
              `Payload compressed (requested: ${compressionMethod}, actual: ${actualMethod}) with x-compression header:`,
              payloadBuffer.length,
              '->',
              compressed.length,
              'bytes'
            );
          } else {
            this.log('Compression skipped - no size benefit, removing compression header');
            headers['x-compression'] = undefined; // Remove compression header if not beneficial
          }
        } catch (compressionError) {
          this.log('Compression failed, using uncompressed, removing compression header:', compressionError);
          headers['x-compression'] = undefined; // Remove compression header if compression failed
        }
      }

      // Create protected header, only including defined values
      const protectedHeader: any = {
        alg: headers.alg,
        enc: headers.enc,
        kid: headers.kid,
      };
      
      // Include compression header if compression was applied
      if (headers['x-compression']) {
        protectedHeader['x-compression'] = headers['x-compression'];
      }

      const jwt = new jose.EncryptJWT(processedPayload)
        .setProtectedHeader(protectedHeader)
        .setIssuedAt()
        .setJti(uuidv4())
        .setExpirationTime(options.expirationTime || '2h');

      if (options.audience) {
        jwt.setAudience(options.audience);
      }

      if (options.issuer) {
        jwt.setIssuer(options.issuer);
      }

      const encrypted = await jwt.encrypt(keyPair.publicKey);

      this.log(
        'Token encryption completed in:',
        performance.now() - start,
        'ms'
      );
      return encrypted;
    } catch (error) {
      throw new Error(`Token encryption failed: ${(error as Error).message}`);
    }
  }

  public async decryptToken(
    keyId: string,
    encryptedJWT: string
  ): Promise<Record<string, unknown>> {
    const keyPair = this._keys.get(keyId);
    if (!keyPair?.privateKey) {
      throw new Error(`Decryption key ${keyId} not found`);
    }

    const start = performance.now();
    this.log('Starting token decryption for key:', keyId);

    try {
      const { payload, protectedHeader } = await jose.jwtDecrypt(
        encryptedJWT,
        keyPair.privateKey
      );

      this.log(
        'Token decryption completed in:',
        performance.now() - start,
        'ms'
      );
      this.log('Protected header:', protectedHeader);

      // Check compression header for compression info
      if (protectedHeader['x-compression']) {
        this.log(`Found compression header: ${protectedHeader['x-compression']}`);
        
        // Validate compression header value
        const compressionAlgorithm = protectedHeader['x-compression'] as string;
        const validCompressionValues = ['brotli', 'gzip', 'deflate'];
        if (!validCompressionValues.includes(compressionAlgorithm)) {
          this.log(`Warning: Unknown compression algorithm: ${compressionAlgorithm}`);
        }
      }
      
      // Handle decompression if compressed (existing logic)
      if (payload._compressed && payload._compression) {
        const compressionType = payload._compression as string;
        const compressedBuffer = Buffer.from(
          payload._compressed as string,
          'base64'
        );
        
        // Validate compression type matches header if present
        if (protectedHeader['x-compression']) {
          const expectedCompression = compressionType === 'br' ? 'brotli' : compressionType;
          if (protectedHeader['x-compression'] !== expectedCompression) {
            this.log(`Warning: compression header "${protectedHeader['x-compression']}" doesn't match compression type "${compressionType}"`);
          }
        }
        
        // Determine decompression method
        const method: CompressionMethod = compressionType === 'br' ? 'brotli' : 
                                          compressionType === 'gzip' ? 'gzip' : 
                                          'none';
        
        const decompressed = await decompressData(compressedBuffer, method);

        if (!decompressed) {
          throw new Error('Failed to decompress payload');
        }

        const decompressedString = Buffer.from(decompressed).toString('utf8');
        const originalPayload = JSON.parse(decompressedString) as Record<
          string,
          unknown
        >;

        this.log(
          `Payload decompressed (compression: ${protectedHeader['x-compression'] || 'none'}):`,
          compressedBuffer.length,
          '->',
          decompressed.length,
          'bytes'
        );
        return originalPayload;
      } else if (protectedHeader['x-compression']) {
        // If compression header is present but no compression data found, log warning
        this.log(`Warning: compression header "${protectedHeader['x-compression']}" present but no compressed data found`);
      }

      return payload;
    } catch (error) {
      throw new Error(`Token decryption failed: ${(error as Error).message}`);
    }
  }

  public async decryptTokenWithAnyKey(
    encryptedJWT: string
  ): Promise<Record<string, unknown>> {
    let lastError: Error | null = null;
    const keyEntries =
      this._keys instanceof Map
        ? Array.from(this._keys.entries())
        : Object.entries(this._keys as any);

    for (const [keyId, keyPair] of keyEntries) {
      if (!keyPair || !(keyPair as KeyPair).privateKey) continue;

      try {
        return await this.decryptToken(keyId, encryptedJWT);
      } catch (error) {
        lastError = error as Error;
        this.log(`Failed to decrypt with key ${String(keyId)}:`, error);
        continue;
      }
    }

    throw new Error(
      `Token decryption failed with all available keys. Last error: ${
        lastError?.message || 'Unknown error'
      }`
    );
  }

  public getAvailableKeys(): string[] {
    const keys =
      this._keys instanceof Map
        ? Array.from(this._keys.keys())
        : Object.keys(this._keys as Record<string, unknown>);
    return keys as string[];
  }

  public hasKey(keyId: string): boolean {
    return this._keys.get(keyId) !== undefined;
  }

  /**
   * Detect the actual compression method used by examining compressed data
   * This is necessary because compression utilities may silently fall back to different methods
   * 
   * @private
   * @param compressed The compressed data
   * @param requested The compression method that was requested
   * @returns The actual compression method detected
   */
  private detectCompressionMethod(compressed: Uint8Array, requested: CompressionMethod): CompressionMethod {
    // Check for gzip magic bytes (1f 8b)
    if (compressed.length >= 2 && compressed[0] === 0x1f && compressed[1] === 0x8b) {
      if (requested !== 'gzip') {
        this.log(`Detected fallback from ${requested} to gzip compression (magic bytes: 1f 8b)`);
      }
      return 'gzip';
    }
    
    // Check for deflate/zlib wrapper (typically starts with 78)
    // Note: Some gzip implementations might use deflate internally
    if (compressed.length >= 1 && compressed[0] === 0x78) {
      // Since our CompressionMethod doesn't include 'deflate', treat as gzip
      if (requested !== 'gzip') {
        this.log(`Detected deflate/zlib compression (magic byte: 78), treating as gzip fallback`);
      }
      return 'gzip';
    }
    
    // For brotli, there's no standard magic number, but we can make reasonable assumptions
    if (compressed.length >= 1) {
      const firstByte = compressed[0];
      
      // If we requested brotli and don't see gzip magic bytes, assume it's brotli
      if (requested === 'brotli' && firstByte !== 0x1f && firstByte !== 0x78) {
        return 'brotli';
      }
    }
    
    // Default: return the requested method if we can't definitively detect otherwise
    return requested;
  }

  /**
   * Check if a JWE token uses compression without decrypting it
   * Clients can call this before decryption to detect compression
   * 
   * @param encryptedJWT The JWE token to inspect
   * @returns Object with compression info or null if no compression
   */
  public static getCompressionInfo(encryptedJWT: string): {
    algorithm: string;
    isCompressed: boolean;
  } | null {
    try {
      const protectedHeader = jose.decodeProtectedHeader(encryptedJWT);
      
      if (protectedHeader['x-compression']) {
        return {
          algorithm: protectedHeader['x-compression'] as string,
          isCompressed: true
        };
      }
      
      return {
        algorithm: 'none',
        isCompressed: false
      };
    } catch (error) {
      // If we can't decode the header, return null
      return null;
    }
  }

  /**
   * Decode the JWE protected header without decrypting
   * Useful for inspecting token metadata including compression info
   * 
   * @param encryptedJWT The JWE token to inspect
   * @returns The protected header object
   */
  public static decodeProtectedHeader(encryptedJWT: string): any {
    return jose.decodeProtectedHeader(encryptedJWT);
  }
}
