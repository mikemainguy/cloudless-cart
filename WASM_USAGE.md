# WASM Compression Usage Guide

## Default Behavior (No WASM Download)

By default, cloudless-cart uses native browser gzip compression to avoid the overhead of downloading WASM modules. This provides good compression with zero additional network requests.

```javascript
import { compress, decompress } from 'cloudless-cart';

// Uses gzip compression by default in browsers
const data = new TextEncoder().encode('Hello, World!');
const compressed = await compress(data, { method: 'gzip' });
const decompressed = await decompress(compressed);
```

## Opt-in to Brotli WASM (Better Compression)

If you want better compression ratios and don't mind the initial WASM download (~200KB), you can explicitly enable Brotli WASM support:

### Step 1: Install the optional dependency

```bash
npm install brotli-wasm
# or
yarn add brotli-wasm
# or
pnpm add brotli-wasm
```

### Step 2: Enable WASM in your application

```javascript
import { enableBrotliWasm, compress, decompress } from 'cloudless-cart';

// Enable WASM at application startup (one-time)
async function initApp() {
  const wasmEnabled = await enableBrotliWasm();
  
  if (wasmEnabled) {
    console.log('Brotli WASM compression enabled - better compression ratios');
  } else {
    console.log('Using native gzip compression - no WASM overhead');
  }
  
  // Now compression will use Brotli if available
  const data = new TextEncoder().encode('Hello, World!');
  const compressed = await compress(data, { method: 'brotli' });
  const decompressed = await decompress(compressed);
}

initApp();
```

## Compression Method Comparison

| Method | Pros | Cons | Use When |
|--------|------|------|----------|
| **Gzip (Default)** | • No WASM download<br>• Native browser support<br>• Fast compression | • Lower compression ratio | • You want fast page loads<br>• Compression ratio is less critical |
| **Brotli (Opt-in)** | • Better compression (20-30% smaller)<br>• Industry standard | • Requires WASM download (~200KB)<br>• Initial load overhead | • You have large datasets<br>• Users have good connections<br>• Compression ratio is critical |

## Dynamic Selection Based on User Preference

You can also let users choose their compression preference:

```javascript
import { enableBrotliWasm, compress, getCompressionInfo } from 'cloudless-cart';

// Check current capabilities
const info = await getCompressionInfo();
console.log('Available methods:', info.methods);
console.log('Current method:', info.preferred);

// Let user opt-in to better compression
const enableWasmButton = document.getElementById('enable-wasm');
enableWasmButton.addEventListener('click', async () => {
  const success = await enableBrotliWasm();
  if (success) {
    alert('Brotli compression enabled for better performance!');
  }
});
```

## Bundle Size Considerations

- **Without brotli-wasm**: Core library only, minimal bundle size
- **With brotli-wasm**: Additional ~200KB download (lazy-loaded only when enabled)

The WASM module is never downloaded unless you explicitly call `enableBrotliWasm()`, ensuring your users don't pay for features they don't use.