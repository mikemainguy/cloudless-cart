// Dual-environment compression utility with Brotli and Gzip support
// This file will work in both Node.js and browsers

export type CompressionMethod = 'brotli' | 'gzip' | 'none';

export interface CompressionOptions {
  method?: CompressionMethod;  // Compression method to use
  mode?: 0 | 1 | 2;            // Brotli: 0 = generic, 1 = text, 2 = font
  quality?: number;             // Brotli: 0-11, Gzip: 1-9
  lgwin?: number;               // Brotli: window size
}

// Runtime environment detection
const isNode = typeof process !== 'undefined' && process.versions?.node;
const isBrowser = typeof window !== 'undefined';

// Lazy-loaded compression implementations
let nodeBrotli: any = null;
let nodeZlib: any = null;
let browserBrotliWasm: any = null;

// WASM opt-in flag - false by default to avoid automatic WASM downloads
let wasmEnabled = false;

/**
 * Initialize Node.js Brotli compression
 */
async function initNodeBrotli() {
  if (!nodeBrotli && isNode) {
    try {
      nodeBrotli = await import('brotli');
      return nodeBrotli;
    } catch (e) {
      console.warn('Node.js brotli not available');
    }
  }
  return nodeBrotli;
}

/**
 * Initialize Node.js Zlib (for gzip)
 */
async function initNodeZlib() {
  if (!nodeZlib && isNode) {
    try {
      nodeZlib = await import('zlib');
      return nodeZlib;
    } catch (e) {
      console.warn('Node.js zlib not available');
    }
  }
  return nodeZlib;
}

/**
 * Initialize browser Brotli-WASM (only when explicitly enabled)
 * This will NOT be called automatically to avoid unwanted network downloads
 */
async function initBrowserBrotliWasm() {
  if (!browserBrotliWasm && isBrowser && wasmEnabled) {
    try {
      // Dynamic import - only loaded when explicitly enabled
      // @ts-ignore
      const brotliPromise = await import('brotli-wasm');
      // brotli-wasm exports a promise that resolves to the actual module
      browserBrotliWasm = await brotliPromise.default;
      return browserBrotliWasm;
    } catch (e) {
      console.warn('brotli-wasm not available. Install with: npm install brotli-wasm');
      return null;
    }
  }
  return browserBrotliWasm;
}

/**
 * Explicitly enable WASM support for Brotli compression in browsers
 * Must be called before using Brotli compression in the browser
 * @returns Promise<boolean> - true if WASM was successfully enabled
 * @example
 * // In your application initialization:
 * import { enableBrotliWasm } from 'cloudless-cart';
 * 
 * // Enable WASM for better compression (optional)
 * const wasmAvailable = await enableBrotliWasm();
 * if (wasmAvailable) {
 *   console.log('Brotli WASM compression enabled');
 * } else {
 *   console.log('Using gzip compression (default)');
 * }
 */
export async function enableBrotliWasm(): Promise<boolean> {
  if (!isBrowser) return false;
  
  wasmEnabled = true;
  const wasm = await initBrowserBrotliWasm();
  return wasm !== null;
}

/**
 * Disable WASM support and free resources
 */
export function disableBrotliWasm(): void {
  wasmEnabled = false;
  browserBrotliWasm = null;
}

/**
 * Compress using Brotli in Node.js
 */
async function compressBrotliNode(data: Uint8Array, options: CompressionOptions): Promise<Uint8Array> {
  const brotli = await initNodeBrotli();
  if (!brotli) throw new Error('Brotli not available in Node.js');
  
  return brotli.compress(Buffer.from(data), {
    mode: options.mode ?? 1,       // text mode for JSON
    quality: options.quality ?? 4,  // balanced quality
    lgwin: options.lgwin ?? 22      // window size
  });
}

/**
 * Decompress using Brotli in Node.js
 */
async function decompressBrotliNode(data: Uint8Array): Promise<Uint8Array> {
  const brotli = await initNodeBrotli();
  if (!brotli) throw new Error('Brotli not available in Node.js');
  
  return brotli.decompress(Buffer.from(data));
}

/**
 * Compress using Gzip in Node.js
 */
async function compressGzipNode(data: Uint8Array, options: CompressionOptions): Promise<Uint8Array> {
  const zlib = await initNodeZlib();
  if (!zlib) throw new Error('Zlib not available in Node.js');
  
  return new Promise((resolve, reject) => {
    zlib.gzip(Buffer.from(data), {
      level: options.quality ?? 6  // Default to level 6
    }, (err: Error | null, result: Buffer) => {
      if (err) reject(err);
      else resolve(new Uint8Array(result));
    });
  });
}

/**
 * Decompress using Gzip in Node.js
 */
async function decompressGzipNode(data: Uint8Array): Promise<Uint8Array> {
  const zlib = await initNodeZlib();
  if (!zlib) throw new Error('Zlib not available in Node.js');
  
  return new Promise((resolve, reject) => {
    zlib.gunzip(Buffer.from(data), (err: Error | null, result: Buffer) => {
      if (err) reject(err);
      else resolve(new Uint8Array(result));
    });
  });
}

/**
 * Compress using Brotli in browser
 */
async function compressBrotliBrowser(data: Uint8Array, options: CompressionOptions): Promise<Uint8Array> {
  const brotliWasm = await initBrowserBrotliWasm();
  if (!brotliWasm) throw new Error('Brotli-WASM not available in browser');
  
  return brotliWasm.compress(data, {
    quality: options.quality ?? 4
  });
}

/**
 * Decompress using Brotli in browser
 */
async function decompressBrotliBrowser(data: Uint8Array): Promise<Uint8Array> {
  const brotliWasm = await initBrowserBrotliWasm();
  if (!brotliWasm) throw new Error('Brotli-WASM not available in browser');
  
  return brotliWasm.decompress(data);
}

/**
 * Compress using Gzip in browser (CompressionStream API)
 */
async function compressGzipBrowser(data: Uint8Array): Promise<Uint8Array> {
  if (!('CompressionStream' in window)) {
    throw new Error('CompressionStream not available in browser');
  }
  
  const stream = new CompressionStream('gzip');
  const writer = stream.writable.getWriter();
  const reader = stream.readable.getReader();
  
  writer.write(data);
  writer.close();
  
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  
  // Concatenate chunks
  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

/**
 * Decompress using Gzip in browser (DecompressionStream API)
 */
async function decompressGzipBrowser(data: Uint8Array): Promise<Uint8Array> {
  if (!('DecompressionStream' in window)) {
    throw new Error('DecompressionStream not available in browser');
  }
  
  const stream = new DecompressionStream('gzip');
  const writer = stream.writable.getWriter();
  const reader = stream.readable.getReader();
  
  writer.write(data);
  writer.close();
  
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  
  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

/**
 * Compress data using specified method
 */
export async function compress(
  data: Uint8Array, 
  options: CompressionOptions = {}
): Promise<Uint8Array> {
  const method = options.method ?? 'brotli'; // Default to brotli
  
  // Handle 'none' compression
  if (method === 'none') {
    return data;
  }
  
  try {
    if (isNode) {
      // Node.js environment
      if (method === 'brotli') {
        return await compressBrotliNode(data, options);
      } else if (method === 'gzip') {
        return await compressGzipNode(data, options);
      }
    } else if (isBrowser) {
      // Browser environment
      if (method === 'brotli') {
        // Check if WASM is enabled
        if (!wasmEnabled) {
          // Silently fall back to gzip if WASM not enabled
          return await compressGzipBrowser(data);
        }
        try {
          return await compressBrotliBrowser(data, options);
        } catch (e) {
          console.warn('Brotli failed, falling back to gzip:', e);
          return await compressGzipBrowser(data);
        }
      } else if (method === 'gzip') {
        return await compressGzipBrowser(data);
      }
    }
  } catch (error) {
    console.warn(`Compression failed for ${method}:`, error);
  }
  
  // Fallback: return uncompressed
  console.warn('No compression available, returning uncompressed data');
  return data;
}

/**
 * Decompress data with automatic detection
 */
export async function decompress(
  data: Uint8Array,
  method?: CompressionMethod
): Promise<Uint8Array> {
  // If no method specified, try to detect
  if (!method) {
    // Check for gzip magic bytes (1f 8b)
    if (data[0] === 0x1f && data[1] === 0x8b) {
      method = 'gzip';
    } else {
      // Assume brotli for other compressed data
      method = 'brotli';
    }
  }
  
  if (method === 'none') {
    return data;
  }
  
  try {
    if (isNode) {
      // Node.js environment
      if (method === 'brotli') {
        return await decompressBrotliNode(data);
      } else if (method === 'gzip') {
        return await decompressGzipNode(data);
      }
    } else if (isBrowser) {
      // Browser environment
      if (method === 'brotli') {
        // Check if WASM is enabled
        if (!wasmEnabled) {
          // Try gzip if WASM not enabled
          return await decompressGzipBrowser(data);
        }
        try {
          return await decompressBrotliBrowser(data);
        } catch (e) {
          console.warn('Brotli decompression failed, trying gzip:', e);
          return await decompressGzipBrowser(data);
        }
      } else if (method === 'gzip') {
        return await decompressGzipBrowser(data);
      }
    }
  } catch (error) {
    console.warn(`Decompression failed for ${method}:`, error);
  }
  
  // Fallback: assume uncompressed
  console.warn('Decompression failed, returning data as-is');
  return data;
}

/**
 * Check what compression methods are available
 */
export async function getAvailableCompressionMethods(): Promise<{
  brotli: boolean;
  gzip: boolean;
  environment: 'node' | 'browser' | 'unknown';
}> {
  const environment = isNode ? 'node' : isBrowser ? 'browser' : 'unknown';
  
  let brotli = false;
  let gzip = false;
  
  if (isNode) {
    // Check Node.js compression
    try {
      await initNodeBrotli();
      brotli = nodeBrotli !== null;
    } catch {}
    
    try {
      await initNodeZlib();
      gzip = nodeZlib !== null;
    } catch {}
  } else if (isBrowser) {
    // Check browser compression - WASM only available if explicitly enabled
    brotli = wasmEnabled && browserBrotliWasm !== null;
    gzip = 'CompressionStream' in window;
  }
  
  return { brotli, gzip, environment };
}

/**
 * Get compression info for the current environment
 */
export async function getCompressionInfo(): Promise<{
  available: boolean;
  methods: CompressionMethod[];
  preferred: CompressionMethod;
  environment: 'node' | 'browser' | 'unknown';
}> {
  const capabilities = await getAvailableCompressionMethods();
  const methods: CompressionMethod[] = ['none'];
  
  if (capabilities.brotli) methods.push('brotli');
  if (capabilities.gzip) methods.push('gzip');
  
  const available = capabilities.brotli || capabilities.gzip;
  const preferred: CompressionMethod = capabilities.brotli ? 'brotli' : 
                                        capabilities.gzip ? 'gzip' : 'none';
  
  return {
    available,
    methods,
    preferred,
    environment: capabilities.environment
  };
}

/**
 * Test compression with different methods
 */
export async function testCompression(data: Uint8Array): Promise<{
  original: number;
  brotli?: { compressed: number; ratio: number; time: number };
  gzip?: { compressed: number; ratio: number; time: number };
}> {
  const result: any = {
    original: data.length
  };
  
  const methods = await getAvailableCompressionMethods();
  
  // Test Brotli
  if (methods.brotli) {
    try {
      const start = performance.now();
      const compressed = await compress(data, { method: 'brotli', quality: 4 });
      const time = performance.now() - start;
      
      result.brotli = {
        compressed: compressed.length,
        ratio: ((1 - compressed.length / data.length) * 100),
        time
      };
    } catch (e) {
      console.warn('Brotli test failed:', e);
    }
  }
  
  // Test Gzip
  if (methods.gzip) {
    try {
      const start = performance.now();
      const compressed = await compress(data, { method: 'gzip', quality: 6 });
      const time = performance.now() - start;
      
      result.gzip = {
        compressed: compressed.length,
        ratio: ((1 - compressed.length / data.length) * 100),
        time
      };
    } catch (e) {
      console.warn('Gzip test failed:', e);
    }
  }
  
  return result;
}