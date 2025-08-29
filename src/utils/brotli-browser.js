// Browser-compatible brotli shim
// This file replaces the Node.js brotli module in browser builds

// Check for brotli-wasm availability
let brotliWasm = null;

// Initialize brotli-wasm if available
async function initBrotliWasm() {
  if (!brotliWasm) {
    try {
      // Dynamic import to avoid errors if not available
      brotliWasm = await import('brotli-wasm');
      await brotliWasm.init();
    } catch (error) {
      console.warn('brotli-wasm not available:', error.message);
      brotliWasm = false; // Mark as unavailable
    }
  }
  return brotliWasm;
}

// Fallback compression using CompressionStream (Chrome 80+)
function supportsCompressionStream() {
  return typeof CompressionStream !== 'undefined' && 
         typeof DecompressionStream !== 'undefined';
}

async function compressWithStream(buffer, algorithm = 'gzip') {
  if (!supportsCompressionStream()) {
    throw new Error('CompressionStream not supported');
  }
  
  const stream = new CompressionStream(algorithm);
  const writer = stream.writable.getWriter();
  const reader = stream.readable.getReader();
  
  // Write data
  await writer.write(buffer);
  await writer.close();
  
  // Read compressed data
  const chunks = [];
  let done = false;
  
  while (!done) {
    const { value, done: streamDone } = await reader.read();
    done = streamDone;
    if (value) {
      chunks.push(value);
    }
  }
  
  // Combine chunks
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  
  return result;
}

async function decompressWithStream(buffer, algorithm = 'gzip') {
  if (!supportsCompressionStream()) {
    throw new Error('DecompressionStream not supported');
  }
  
  const stream = new DecompressionStream(algorithm);
  const writer = stream.writable.getWriter();
  const reader = stream.readable.getReader();
  
  // Write compressed data
  await writer.write(buffer);
  await writer.close();
  
  // Read decompressed data
  const chunks = [];
  let done = false;
  
  while (!done) {
    const { value, done: streamDone } = await reader.read();
    done = streamDone;
    if (value) {
      chunks.push(value);
    }
  }
  
  // Combine chunks
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  
  return result;
}

// Main compress function - tries brotli-wasm first, falls back to gzip
export async function compress(buffer, options = {}) {
  // Convert input to Uint8Array if needed
  const input = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  
  // Try brotli-wasm first
  const brotli = await initBrotliWasm();
  if (brotli && brotli.compress) {
    try {
      return brotli.compress(input, options.quality || 5);
    } catch (error) {
      console.warn('brotli-wasm compression failed:', error.message);
    }
  }
  
  // Fall back to CompressionStream with gzip
  if (supportsCompressionStream()) {
    try {
      return await compressWithStream(input, 'gzip');
    } catch (error) {
      console.warn('CompressionStream failed:', error.message);
    }
  }
  
  // Last resort: no compression
  console.warn('No compression available, returning uncompressed data');
  return input;
}

// Main decompress function
export async function decompress(buffer) {
  // Convert input to Uint8Array if needed
  const input = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  
  // Try brotli-wasm first
  const brotli = await initBrotliWasm();
  if (brotli && brotli.decompress) {
    try {
      return brotli.decompress(input);
    } catch (error) {
      console.warn('brotli-wasm decompression failed:', error.message);
    }
  }
  
  // Fall back to DecompressionStream with gzip
  if (supportsCompressionStream()) {
    try {
      return await decompressWithStream(input, 'gzip');
    } catch (error) {
      console.warn('DecompressionStream failed:', error.message);
    }
  }
  
  // Last resort: assume uncompressed
  console.warn('No decompression available, returning data as-is');
  return input;
}

// Export default object to match Node.js brotli module structure
export default {
  compress,
  decompress
};