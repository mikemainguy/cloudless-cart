# Browser Installation Guide

This guide covers different approaches to use cloudless-cart in browser environments, with special focus on avoiding the optional Brotli WASM module when needed.

## Overview

Cloudless-cart supports multiple compression methods:
- **Brotli** (via WASM) - Best compression ratio, requires WASM download
- **Gzip** (native browser APIs) - Good compression, no extra downloads
- **None** - No compression, fastest processing

The library automatically detects available compression methods and falls back gracefully.

## Installation Approaches

### Approach 1: NPM with Optional Dependencies Skipped (Recommended)

```bash
# Install without optional dependencies (skips brotli-wasm)
npm install cloudless-cart --no-optional

# On Mac with architecture conflicts, try:
# npm run install:no-wasm
# or if that fails:
# yarn install --ignore-optional
```

**Advantages:**
- ✅ Smallest footprint (~50KB vs ~150KB)
- ✅ Faster installation
- ✅ No WASM loading delays
- ✅ Uses native browser gzip compression
- ✅ All crypto functionality works identically

**Disadvantages:**
- ❌ Slightly larger compressed payloads (gzip vs brotli ~15-25% difference)
- ❌ Cannot use brotli compression even if desired later

**Usage:**
```javascript
import { CloudlessCrypto } from 'cloudless-cart';

const crypto = new CloudlessCrypto();
// Will automatically use gzip compression
const token = await crypto.encryptThenSign(encKey, signKey, payload);
```

### Approach 2: CDN Direct Loading

```html
<!-- Load directly from CDN -->
<script src="https://unpkg.com/cloudless-cart@latest/dist/browser/cloudless-cart.js"></script>

<script>
  const { CloudlessCrypto } = CloudlessCart;
  const crypto = new CloudlessCrypto();
  
  // Library will use best available compression (likely gzip)
  const encrypted = await crypto.encryptThenSign(encKey, signKey, payload);
</script>
```

**Advantages:**
- ✅ No npm/build process required
- ✅ CDN caching benefits
- ✅ Quick prototyping and testing
- ✅ WASM not included in CDN bundle

**Disadvantages:**
- ❌ External dependency on CDN availability
- ❌ Less control over versioning
- ❌ May not work offline

### Approach 3: Standard NPM Install with Explicit Compression Control

```bash
# Normal install (includes optional brotli-wasm)
npm install cloudless-cart
```

**Force gzip usage even when WASM is available:**
```javascript
import { CloudlessCrypto } from 'cloudless-cart';

const crypto = new CloudlessCrypto();

// Explicitly use gzip compression
const token = await crypto.encryptThenSign(
  encryptionKey, 
  signingKey, 
  payload,
  { compress: 'gzip' }  // Force gzip over brotli
);
```

**Advantages:**
- ✅ Full flexibility - can switch compression methods
- ✅ Can use brotli when optimal
- ✅ Can force lighter compression when needed
- ✅ Best for applications with varying requirements

**Disadvantages:**
- ❌ Larger initial download (includes WASM)
- ❌ WASM loading overhead even if not used
- ❌ Requires explicit compression method selection

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

| Method | Bundle Size | Compression Ratio | Browser Compatibility | Load Time |
|--------|-------------|-------------------|----------------------|-----------|
| Brotli WASM | ~150KB | Best (100%) | Modern browsers | Slower (WASM init) |
| Gzip Native | ~50KB | Good (115-125%) | Modern browsers | Faster |
| No Compression | ~50KB | None (200-400%) | All browsers | Fastest |

## Recommendations

### For Production Web Apps
**Use Approach 1** (`--no-optional`):
- Smallest footprint
- Reliable performance
- Good compression with native gzip

### For Libraries/SDKs
**Use Approach 3** (standard install + explicit control):
- Maximum flexibility for consumers
- Can optimize per use case

### For Prototypes/Demos  
**Use Approach 2** (CDN):
- Fastest setup
- No build process required

### For High-Traffic/Bandwidth-Sensitive Apps
**Use Approach 3** (with brotli when possible):
- Best compression ratios
- Significant bandwidth savings

## Testing Your Setup

```javascript
// Check what compression methods are available
import { getCompressionInfo } from 'cloudless-cart';

const info = await getCompressionInfo();
console.log('Available compression:', info.methods);
console.log('Preferred method:', info.preferred);
console.log('Environment:', info.environment);

// Example output without WASM:
// Available compression: ['none', 'gzip']
// Preferred method: 'gzip'  
// Environment: 'browser'
```

## Troubleshooting

### WASM Loading Issues
If you see WASM-related errors but want to use gzip:
```javascript
// Force gzip compression to avoid WASM issues
const options = { compress: 'gzip' };
```

### Bundle Size Issues
Check what's included in your bundle:
```bash
# Analyze bundle contents
npx webpack-bundle-analyzer dist/main.js

# Check if WASM is included
grep -r "brotli.*wasm" dist/
```

### Performance Issues
Compare compression methods in your environment:
```javascript
import { testCompression } from 'cloudless-cart';

const testData = new TextEncoder().encode(JSON.stringify(yourTypicalPayload));
const results = await testCompression(testData);
console.log('Compression benchmark:', results);
```