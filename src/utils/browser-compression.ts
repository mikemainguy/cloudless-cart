/**
 * Browser-specific compression module using brotli-wasm
 * This provides Brotli compression/decompression in browsers
 */

let brotliWasmModule: any = null;
let initPromise: Promise<void> | null = null;

/**
 * Initialize brotli-wasm module (lazy loading)
 */
async function initBrotliWasm() {
  if (initPromise) {
    return initPromise;
  }
  
  if (brotliWasmModule) {
    return;
  }

  initPromise = (async () => {
    try {
      // Try to dynamically import brotli-wasm
      const module = await import('brotli-wasm');
      // brotli-wasm exports compress and decompress directly
      brotliWasmModule = module;
      console.log('Brotli-wasm loaded successfully');
    } catch (error) {
      console.warn('Failed to load brotli-wasm:', error);
      // Fallback will be handled by the compress/decompress functions
    }
  })();

  return initPromise;
}

/**
 * Compress data using Brotli in the browser
 */
export async function compressBrotli(data: Uint8Array): Promise<Uint8Array> {
  await initBrotliWasm();
  
  if (brotliWasmModule && brotliWasmModule.compress) {
    try {
      // Use brotli-wasm compress function
      return await brotliWasmModule.compress(data, {
        quality: 4,  // 0-11, 4 is a good balance
        lgwin: 22    // Window size
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
 * Decompress data using Brotli in the browser
 */
export async function decompressBrotli(data: Uint8Array): Promise<Uint8Array> {
  await initBrotliWasm();
  
  if (brotliWasmModule && brotliWasmModule.decompress) {
    try {
      // Use brotli-wasm decompress function
      return await brotliWasmModule.decompress(data);
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