# Browser Installation Guide

This guide covers different approaches to use cloudless-cart in browser environments, with special focus on avoiding the optional Brotli WASM module when needed.

## Overview

Cloudless-cart supports multiple compression methods:
- **Gzip** (native browser APIs) - Good compression, enabled by default
- **Brotli** (via WASM) - Best compression ratio, requires explicit opt-in
- **None** - No compression, fastest processing

**By default**, the library uses gzip compression with native browser APIs and requires no additional setup. Brotli WASM support is completely optional and must be explicitly enabled.

## Installation Approaches

### Approach 1: Standard Installation (Recommended - No WASM by Default)

```bash
# Standard install - WASM is NOT included by default
npm install cloudless-cart
```

**Advantages:**
- ✅ Smallest footprint (~50KB)
- ✅ No architecture conflicts or WASM issues
- ✅ No WASM loading delays
- ✅ Uses native browser gzip compression
- ✅ All crypto functionality works immediately

**Disadvantages:**
- ❌ Slightly larger compressed payloads (gzip vs brotli ~15-25% difference)
- ❌ Requires extra steps to enable brotli if desired later

**Usage:**
```javascript
import { CloudlessCrypto } from 'cloudless-cart';

const crypto = new CloudlessCrypto();
// Automatically uses gzip compression
const token = await crypto.encryptThenSign(encKey, signKey, payload);
```

### Approach 2: Enabling Brotli WASM (Optional Best Compression)

If you want the best compression ratios, you can explicitly enable brotli WASM:

```bash
# Step 1: Install the library
npm install cloudless-cart

# Step 2: Install brotli-wasm separately
npm install brotli-wasm
```

**Usage with explicit WASM enable:**
```javascript
import { CloudlessCrypto, enableBrotliWasm, getCompressionInfo } from 'cloudless-cart';

// Check what's available initially
console.log(await getCompressionInfo());
// Output: { methods: ['none', 'gzip'], preferred: 'gzip' }

// Explicitly enable WASM support
const wasmEnabled = await enableBrotliWasm();
console.log('Brotli WASM enabled:', wasmEnabled);

// Check again after enabling
console.log(await getCompressionInfo());
// Output: { methods: ['none', 'gzip', 'brotli'], preferred: 'brotli' }

const crypto = new CloudlessCrypto();

// Now you can use brotli compression
const token = await crypto.encryptThenSign(
  encKey, 
  signKey, 
  payload,
  { compress: 'brotli' }  // Best compression
);

// Or let it auto-choose the best available (now brotli)
const token2 = await crypto.encryptThenSign(encKey, signKey, payload);
```

**Advantages:**
- ✅ Best compression ratios (20-30% better than gzip)
- ✅ Explicit control over WASM loading
- ✅ Graceful fallback if WASM fails

**Disadvantages:**
- ❌ Requires extra installation step
- ❌ Larger bundle size (~100KB additional)
- ❌ Potential WASM loading issues in some environments

### Approach 3: CDN Direct Loading

```html
<!-- Load directly from CDN -->
<script src="https://unpkg.com/cloudless-cart@latest/dist/browser/cloudless-cart.js"></script>

<script>
  const { CloudlessCrypto, getCompressionInfo } = CloudlessCart;
  
  // Check what's available (should be gzip by default)
  getCompressionInfo().then(info => {
    console.log('Available compression:', info.methods);
    // Output: ['none', 'gzip'] - no brotli without explicit opt-in
  });
  
  const crypto = new CloudlessCrypto();
  
  // Uses gzip compression automatically
  const encrypted = await crypto.encryptThenSign(encKey, signKey, payload);
</script>
```

**Advantages:**
- ✅ No npm/build process required
- ✅ CDN caching benefits
- ✅ Quick prototyping and testing
- ✅ No WASM issues or conflicts
- ✅ Uses native browser compression

**Disadvantages:**
- ❌ External dependency on CDN availability
- ❌ Less control over versioning
- ❌ May not work offline
- ❌ Cannot easily enable WASM from CDN

### Approach 4: Explicit Compression Control

Even with the default gzip compression, you can explicitly control which compression method to use:

```javascript
import { CloudlessCrypto, enableBrotliWasm } from 'cloudless-cart';

const crypto = new CloudlessCrypto();

// Force specific compression methods
const gzipToken = await crypto.encryptThenSign(
  encKey, signKey, payload,
  { compress: 'gzip' }  // Force gzip
);

const uncompressedToken = await crypto.encryptThenSign(
  encKey, signKey, payload,
  { compress: 'none' }  // No compression
);

// Enable WASM then use brotli
await enableBrotliWasm();
const brotliToken = await crypto.encryptThenSign(
  encKey, signKey, payload,
  { compress: 'brotli' }  // Best compression (if WASM available)
);
```

**Advantages:**
- ✅ Full control over compression per operation
- ✅ Can optimize for different use cases
- ✅ Fallback handling built-in
- ✅ No surprises - explicit compression choice

**Disadvantages:**
- ❌ Requires understanding of compression trade-offs
- ❌ More verbose API usage

### Approach 4: Bundler Exclusion

For webpack, rollup, or other bundlers:

```javascript
// webpack.config.js
module.exports = {
  externals: {
    'brotli-wasm': 'undefined'  // Exclude from bundle
  },
  // or use resolve.alias
  resolve: {
    alias: {
      'brotli-wasm': false
    }
  }
};
```

```javascript
// rollup.config.js
export default {
  external: ['brotli-wasm'],
  // ...
};
```

**Advantages:**
- ✅ Fine-grained control over bundle contents
- ✅ Can be configured per environment (dev vs prod)
- ✅ Works with existing npm install

**Disadvantages:**
- ❌ Requires bundler configuration
- ❌ More complex setup
- ❌ May cause build warnings

## Browser Compatibility

### Gzip Compression Support (CompressionStream API)
- ✅ Chrome 80+
- ✅ Firefox 113+
- ✅ Safari 16.4+
- ✅ Edge 80+

### Fallback Behavior
If neither Brotli WASM nor CompressionStream is available:
- Library falls back to uncompressed mode
- All functionality continues to work
- Larger token sizes but full compatibility

## Performance Comparison

| Method | Bundle Size | Compression Ratio | Browser Compatibility | Load Time | Default |
|--------|-------------|-------------------|----------------------|-----------|---------|
| Gzip Native | ~50KB | Good (115-125%) | Modern browsers | Fast | ✅ Yes |
| Brotli WASM | +100KB | Best (100%) | Modern browsers | Slower (WASM init) | ❌ Opt-in only |
| No Compression | ~50KB | None (200-400%) | All browsers | Fastest | ❌ Manual only |

## Recommendations

### For Production Web Apps (Most Common)
**Use Approach 1** (Standard install):
- No setup required - works immediately
- Reliable gzip compression 
- No WASM issues or conflicts
- Predictable performance

### For Bandwidth-Critical Applications  
**Use Approach 2** (Enable brotli WASM):
- 20-30% better compression ratios
- Worth the extra setup complexity
- Significant bandwidth savings at scale

### For Libraries/SDKs
**Use Approach 4** (Explicit compression control):
- Let consumers choose compression method
- Maximum flexibility
- Clear API expectations

### for Prototypes/Demos  
**Use Approach 3** (CDN):
- Fastest setup
- No build process required
- Immediate testing capability

## Testing Your Setup

```javascript
// Check what compression methods are available
import { getCompressionInfo, enableBrotliWasm } from 'cloudless-cart';

// Initial state (default)
let info = await getCompressionInfo();
console.log('Default compression:', info.methods);
console.log('Preferred method:', info.preferred);

// Output: 
// Default compression: ['none', 'gzip']
// Preferred method: 'gzip'

// Try to enable brotli WASM (if installed)
const wasmEnabled = await enableBrotliWasm();
console.log('Brotli WASM enabled:', wasmEnabled);

if (wasmEnabled) {
  info = await getCompressionInfo();
  console.log('With WASM:', info.methods);
  console.log('New preferred:', info.preferred);
  
  // Output if WASM available:
  // With WASM: ['none', 'gzip', 'brotli']
  // New preferred: 'brotli'
}
```

## Troubleshooting

### WASM Loading Issues
**Problem**: Getting WASM errors or "brotli-wasm not found" warnings  
**Solution**: This is expected! WASM is now opt-in only.

```javascript
// Default behavior - no WASM needed
const crypto = new CloudlessCrypto();
const token = await crypto.encryptThenSign(encKey, signKey, payload); // Uses gzip

// Only install brotli-wasm if you specifically want it
// npm install brotli-wasm
// await enableBrotliWasm();
```

### Cannot Find Brotli Module
**Problem**: `Cannot find module 'brotli-wasm'`  
**Solution**: This is normal! Install it only if you want brotli compression:

```bash
npm install brotli-wasm
```

### Mac Architecture Conflicts
**Problem**: Rollup native dependency errors  
**Solution**: The library now avoids these by default. No WASM = no conflicts.

### Bundle Size Issues
Check what's actually in your bundle:
```bash
# Should be ~50KB without WASM
ls -lh node_modules/cloudless-cart/dist/browser/

# Check if brotli-wasm was accidentally included
ls node_modules/brotli-wasm 2>/dev/null && echo "WASM present" || echo "WASM not installed"
```

### Testing Compression Performance
```javascript
import { testCompression, enableBrotliWasm } from 'cloudless-cart';

const testData = new TextEncoder().encode(JSON.stringify(yourTypicalPayload));

// Test with default methods (gzip)
console.log(await testCompression(testData));

// Test with WASM enabled (if available)
if (await enableBrotliWasm()) {
  console.log('With WASM:', await testCompression(testData));
}
```

### Vite/Modern Bundler Issues
**Problem**: Buffer is not defined, crypto issues  
**Solution**: Add polyfills or use explicit gzip:

```javascript
// vite.config.js
export default defineConfig({
  define: { global: 'globalThis' },
  resolve: { alias: { buffer: 'buffer' } }
});

// Or avoid polyfills by using explicit compression
const token = await crypto.encryptThenSign(
  encKey, signKey, payload,
  { compress: 'gzip' }  // Uses native browser APIs only
);
```