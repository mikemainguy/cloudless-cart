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
 * ZIP header values according to RFC 7516 Section 4.1.3
 * - "DEF": DEFLATE compression algorithm (standard)
 * - "BR": Brotli compression algorithm (custom, could be registered in IANA registry)
 * 
 * The zip header parameter specifies the compression algorithm applied to the
 * plaintext before encryption and MUST be integrity protected by appearing 
 * only within the JWE Protected Header.
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
        zip: undefined as string | undefined,
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
        
        // Set zip header according to RFC 7516 Section 4.1.3
        // "DEF" is the standard value for DEFLATE compression
        // For other algorithms, we use custom values that can be registered
        switch (compressionMethod) {
          case 'gzip':
            // gzip uses DEFLATE internally, so we can use the standard "DEF" value
            headers.zip = 'DEF';
            break;
          case 'brotli':
            // Custom compression algorithm - could be registered in IANA registry
            headers.zip = 'BR';
            break;
          default:
            // For any other compression, use generic deflate
            headers.zip = 'DEF';
            break;
        }
        
        const payloadString = JSON.stringify(payload);
        const payloadBuffer = Buffer.from(payloadString, 'utf8');
        
        try {
          const compressed = await compressData(payloadBuffer, {
            method: compressionMethod,
            mode: 1, // 1 = text mode for JSON data
            quality: compressionMethod === 'brotli' ? 4 : 6, // Optimized quality for each method
            lgwin: 22 // Window size for brotli
          });
          
          if (compressed && compressed.length < payloadBuffer.length) {
            processedPayload = {
              _compressed: Buffer.from(compressed).toString('base64'),
              _originalSize: payloadBuffer.length,
              _compression: compressionMethod === 'brotli' ? 'br' : compressionMethod,
            };
            this.log(
              `Payload compressed (${compressionMethod}) with zip header "${headers.zip}":`,
              payloadBuffer.length,
              '->',
              compressed.length,
              'bytes'
            );
          } else {
            this.log('Compression skipped - no size benefit, removing zip header');
            headers.zip = undefined; // Remove zip header if compression wasn't beneficial
          }
        } catch (compressionError) {
          this.log('Compression failed, using uncompressed, removing zip header:', compressionError);
          headers.zip = undefined; // Remove zip header if compression failed
        }
      }

      // Create protected header, only including defined values
      const protectedHeader: any = {
        alg: headers.alg,
        enc: headers.enc,
        kid: headers.kid,
      };
      
      // Only include zip header if it's defined (RFC 7516 Section 4.1.3)
      if (headers.zip) {
        protectedHeader.zip = headers.zip;
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

      // Check zip header and handle decompression according to RFC 7516 Section 4.1.3
      if (protectedHeader.zip) {
        this.log(`Found zip header indicating compression: ${protectedHeader.zip}`);
        
        // Validate zip header value according to RFC 7516
        const validZipValues = ['DEF', 'BR']; // DEF is standard, BR is our custom brotli
        if (!validZipValues.includes(protectedHeader.zip)) {
          this.log(`Warning: Unknown zip header value: ${protectedHeader.zip}`);
        }
      }
      
      // Handle decompression if compressed (existing logic)
      if (payload._compressed && payload._compression) {
        const compressionType = payload._compression as string;
        const compressedBuffer = Buffer.from(
          payload._compressed as string,
          'base64'
        );
        
        // Validate compression type matches zip header if present
        if (protectedHeader.zip) {
          const expectedZip = compressionType === 'br' ? 'BR' : 'DEF';
          if (protectedHeader.zip !== expectedZip) {
            this.log(`Warning: zip header "${protectedHeader.zip}" doesn't match compression type "${compressionType}"`);
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
          `Payload decompressed (zip: ${protectedHeader.zip || 'none'}):`,
          compressedBuffer.length,
          '->',
          decompressed.length,
          'bytes'
        );
        return originalPayload;
      } else if (protectedHeader.zip) {
        // If zip header is present but no compression data found, log warning
        this.log(`Warning: zip header "${protectedHeader.zip}" present but no compressed data found`);
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
}
