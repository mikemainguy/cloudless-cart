/**
 * Browser-specific compression module with optional brotli-wasm support
 * By default uses native gzip compression to avoid WASM download overhead
 * Call enableBrotliWasm() to opt-in to Brotli compression
 */

let brotliWasmModule: any = null;
let initPromise: Promise<void> | null = null;
let wasmEnabled = false;

/**
 * Initialize brotli-wasm module (only when explicitly enabled)
 */
async function initBrotliWasm() {
  if (!wasmEnabled) {
    return; // Don't load WASM unless explicitly enabled
  }
  
  if (initPromise) {
    return initPromise;
  }
  
  if (brotliWasmModule) {
    return;
  }

  initPromise = (async () => {
    try {
      // Dynamic import - only when opted in
      // @ts-ignore - optional peer dependency
      const brotliPromise = await import('brotli-wasm');
      // brotli-wasm exports a promise that resolves to the actual module
      brotliWasmModule = await brotliPromise.default;
      console.log('Brotli-wasm loaded successfully');
    } catch (error) {
      console.warn('Failed to load brotli-wasm:', error);
      console.warn('Install with: npm install brotli-wasm');
    }
  })();

  return initPromise;
}

/**
 * Enable WASM-based Brotli compression
 * Must be called before using Brotli compression
 */
export async function enableBrotliWasm(): Promise<boolean> {
  wasmEnabled = true;
  await initBrotliWasm();
  return brotliWasmModule !== null;
}

/**
 * Disable WASM and free resources
 */
export function disableBrotliWasm(): void {
  wasmEnabled = false;
  brotliWasmModule = null;
  initPromise = null;
}

/**
 * Compress data using Brotli in the browser (requires enableBrotliWasm())
 * Falls back to gzip if WASM not enabled
 */
export async function compressBrotli(data: Uint8Array): Promise<Uint8Array> {
  if (wasmEnabled) {
    await initBrotliWasm();
  }
  
  if (wasmEnabled && brotliWasmModule && brotliWasmModule.compress) {
    try {
      // Use brotli-wasm compress function
      // brotli-wasm compress API: compress(buffer, { quality: 1-11 })
      return brotliWasmModule.compress(data, {
        quality: 4  // 1-11, 4 is a good balance for speed/compression
      });
    } catch (error) {
      console.warn('Brotli compression failed:', error);
    }
  }
  
  // Fallback: Try native CompressionStream with gzip
  if (typeof CompressionStream !== 'undefined') {
    try {
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
      
      // Concatenate all chunks
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }
      
      return result;
    } catch (error) {
      console.warn('Gzip compression failed:', error);
    }
  }
  
  // Last resort: return uncompressed
  console.warn('No compression available, returning uncompressed data');
  return data;
}

/**
 * Decompress data using Brotli in the browser (requires enableBrotliWasm())
 * Falls back to gzip if WASM not enabled
 */
export async function decompressBrotli(data: Uint8Array): Promise<Uint8Array> {
  if (wasmEnabled) {
    await initBrotliWasm();
  }
  
  if (wasmEnabled && brotliWasmModule && brotliWasmModule.decompress) {
    try {
      // Use brotli-wasm decompress function
      return brotliWasmModule.decompress(data);
    } catch (error) {
      console.warn('Brotli decompression failed:', error);
    }
  }
  
  // Fallback: Try native DecompressionStream with gzip
  if (typeof DecompressionStream !== 'undefined') {
    try {
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
      
      // Concatenate all chunks
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }
      
      return result;
    } catch (error) {
      console.warn('Gzip decompression failed:', error);
    }
  }
  
  // Last resort: assume uncompressed
  console.warn('No decompression available, returning data as-is');
  return data;
}

/**
 * Check if Brotli compression is available
 */
export async function isBrotliAvailable(): Promise<boolean> {
  if (!wasmEnabled) {
    return false;
  }
  await initBrotliWasm();
  return brotliWasmModule !== null;
}

/**
 * Get compression capabilities info
 */
export async function getCompressionInfo(): Promise<{
  brotli: boolean;
  gzip: boolean;
  method: 'brotli' | 'gzip' | 'none';
}> {
  const hasBrotli = await isBrotliAvailable();
  const hasGzip = typeof CompressionStream !== 'undefined';
  
  let method: 'brotli' | 'gzip' | 'none' = 'none';
  if (hasBrotli) {
    method = 'brotli';
  } else if (hasGzip) {
    method = 'gzip';
  }
  
  return {
    brotli: hasBrotli,
    gzip: hasGzip,
    method
  };
}