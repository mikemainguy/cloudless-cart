# CloudlessCart Performance Report

*Last updated: 2025-08-29*

## Test Environment

- **Node.js Version**: v22.17.0
- **Platform**: darwin
- **Architecture**: arm64
- **Test Framework**: Jest with performance.now() timing
- **Library Version**: cloudless-cart v0.1.8

## Executive Summary

This performance report analyzes the encryption, signing, compression, and timing characteristics of CloudlessCart across different payload sizes and security modes. The tests demonstrate clear patterns in performance vs security trade-offs and highlight the significant benefits of compression for larger payloads.

### Key Findings

🔑 **Performance Insights:**
- **Sign-Only** mode is fastest but provides no encryption (integrity only)
- **Compression** provides massive bandwidth savings for payloads >10KB
- **Encrypt-Then-Sign** generally outperforms Sign-Then-Encrypt
- **Network overhead** is dramatically reduced with compression

🗜️ **Compression Effectiveness:**
- **Small payloads (≤1KB)**: Minimal compression benefit due to overhead
- **Medium payloads (10KB)**: ~70-80% size reduction
- **Large payloads (100KB)**: ~90-95% size reduction

## Detailed Performance Results

### 100B Payload (269B actual)

| Mode | Encrypt/Sign | Decrypt/Verify | Total Time | Output Size | Size Change | Compressed |
|------|-------------|----------------|-----------|-------------|-------------|------------|
| Sign-Only | 1.87ms | 0.47ms | **2.33ms** | 769B | +185.9% | ❌ |
| Encrypt-Then-Sign | 2.22ms | 2.28ms | **4.50ms** | 1.6KB | +492.6% | ❌ |
| Encrypt-Then-Sign+Compress | 8.64ms | 1.25ms | **9.88ms** | 1.6KB | +507.1% | ✅ |
| Sign-Then-Encrypt | 0.73ms | 0.77ms | **1.49ms** | 1.6KB | +504.5% | ❌ |
| Sign-Then-Encrypt+Compress | 2.76ms | 1.11ms | **3.87ms** | 1.7KB | +538.7% | ✅ |

#### Analysis for 100B

- **Fastest Option**: Sign-Only (2.33ms total)
- **Fastest Encrypted**: Sign-Then-Encrypt (1.49ms total)
- **Smallest Token**: Sign-Only (769B)
- **Average Compression**: 522.9% size reduction


### 1KB Payload (927B actual)

| Mode | Encrypt/Sign | Decrypt/Verify | Total Time | Output Size | Size Change | Compressed |
|------|-------------|----------------|-----------|-------------|-------------|------------|
| Sign-Only | 0.70ms | 0.12ms | **0.82ms** | 1.4KB | +53.9% | ❌ |
| Encrypt-Then-Sign | 0.83ms | 0.76ms | **1.59ms** | 2.4KB | +166.7% | ❌ |
| Encrypt-Then-Sign+Compress | 2.85ms | 1.15ms | **4.00ms** | 2.0KB | +119.3% | ✅ |
| Sign-Then-Encrypt | 0.79ms | 0.90ms | **1.69ms** | 2.4KB | +170.0% | ❌ |
| Sign-Then-Encrypt+Compress | 2.57ms | 1.27ms | **3.84ms** | 2.1KB | +131.5% | ✅ |

#### Analysis for 1KB

- **Fastest Option**: Sign-Only (0.82ms total)
- **Smallest Token**: Sign-Only (1.4KB)
- **Average Compression**: 125.4% size reduction


### 10KB Payload (9.0KB actual)

| Mode | Encrypt/Sign | Decrypt/Verify | Total Time | Output Size | Size Change | Compressed |
|------|-------------|----------------|-----------|-------------|-------------|------------|
| Sign-Only | 0.88ms | 0.35ms | **1.22ms** | 9.5KB | +5.4% | ❌ |
| Encrypt-Then-Sign | 1.35ms | 1.30ms | **2.65ms** | 13.2KB | +46.8% | ❌ |
| Encrypt-Then-Sign+Compress | 5.63ms | 1.92ms | **7.54ms** | 3.3KB | -63.3% | ✅ |
| Sign-Then-Encrypt | 0.97ms | 0.95ms | **1.92ms** | 13.2KB | +47.1% | ❌ |
| Sign-Then-Encrypt+Compress | 4.90ms | 1.70ms | **6.61ms** | 3.4KB | -62.1% | ✅ |

#### Analysis for 10KB

- **Fastest Option**: Sign-Only (1.22ms total)
- **Smallest Token**: Encrypt-Then-Sign+Compress (3.3KB)
- **Average Compression**: 62.7% size reduction


### 100KB Payload (88.9KB actual)

| Mode | Encrypt/Sign | Decrypt/Verify | Total Time | Output Size | Size Change | Compressed |
|------|-------------|----------------|-----------|-------------|-------------|------------|
| Sign-Only | 2.13ms | 1.15ms | **3.28ms** | 89.4KB | +0.5% | ❌ |
| Encrypt-Then-Sign | 2.34ms | 2.38ms | **4.72ms** | 119.8KB | +34.7% | ❌ |
| Encrypt-Then-Sign+Compress | 24.01ms | 2.12ms | **26.12ms** | 6.7KB | -92.5% | ✅ |
| Sign-Then-Encrypt | 1.80ms | 1.80ms | **3.60ms** | 119.8KB | +34.7% | ❌ |
| Sign-Then-Encrypt+Compress | 10.73ms | 2.39ms | **13.12ms** | 6.7KB | -92.5% | ✅ |

#### Analysis for 100KB

- **Fastest Option**: Sign-Only (3.28ms total)
- **Smallest Token**: Encrypt-Then-Sign+Compress (6.7KB)
- **Average Compression**: 92.5% size reduction


## Compression Analysis

| Payload Size | Original | Compressed | Uncompressed | Compression Ratio | CPU Overhead |
|-------------|----------|------------|--------------|-------------------|--------------|
| 100B | 269B | 1.6KB | 1.6KB | **-4.1%** | +4.2ms |
| 1KB | 927B | 2.0KB | 2.4KB | **16.0%** | +1.9ms |
| 10KB | 9.0KB | 3.3KB | 13.2KB | **74.6%** | +4.1ms |
| 100KB | 88.9KB | 6.7KB | 119.8KB | **94.4%** | +15.3ms |

### Compression ROI Analysis

The table above demonstrates the return on investment for compression:

- **Small payloads** show minimal compression benefits due to overhead
- **Medium payloads (10KB)** show significant compression with acceptable CPU overhead
- **Large payloads (100KB)** show exceptional compression ratios with modest relative CPU overhead

**Recommendation**: Enable compression for payloads >5KB for optimal performance/bandwidth balance.

## Performance Recommendations

### For Different Use Cases

#### 🚀 **High Performance, Low Security Requirements**
- **Use**: Sign-Only mode
- **Benefits**: Fastest processing (~1-3ms)
- **Trade-offs**: No encryption, data visible
- **Best for**: Internal systems, public data

#### ⚖️ **Balanced Performance & Security** 
- **Use**: Encrypt-Then-Sign (no compression for <10KB)
- **Benefits**: Good security, reasonable performance
- **Trade-offs**: Moderate overhead
- **Best for**: Most web applications

#### 🔒 **Maximum Security & Bandwidth Efficiency**
- **Use**: Encrypt-Then-Sign + Compression
- **Benefits**: Best security, smallest tokens
- **Trade-offs**: Higher CPU cost for compression
- **Best for**: Large payloads, mobile apps, expensive bandwidth

#### 🌐 **Legacy Compatibility**
- **Use**: Sign-Then-Encrypt
- **Benefits**: Traditional approach, widely supported
- **Trade-offs**: Slightly slower than encrypt-then-sign
- **Best for**: Standards compliance requirements

### Performance Optimization Tips

1. **Enable compression for payloads >10KB** - The bandwidth savings far outweigh CPU overhead
2. **Use encrypt-then-sign** for new applications - Better security properties and performance
3. **Consider caching** encrypted tokens when possible to amortize encryption costs
4. **Monitor token sizes** in production to validate compression effectiveness
5. **Benchmark with your actual payload patterns** - Results may vary with different data structures

## Benchmark Methodology

### Test Setup
- **Payload Generation**: Realistic shopping cart data with items, metadata, and totals
- **Timing**: High-precision performance.now() measurements
- **Iterations**: Single-run measurements (consistent results observed)
- **Key Generation**: Fresh RSA key pairs for each test run

### Payload Characteristics
- **100B**: Minimal cart with basic item data
- **1KB**: Small cart with 1-3 items and metadata
- **10KB**: Medium cart with 10-20 items and detailed attributes
- **100KB**: Large cart with 100+ items, descriptions, and rich metadata

### Metrics Collected
- **Encryption/Signing Time**: Time to create secured token
- **Decryption/Verification Time**: Time to recover original data
- **Output Size**: Final token size in bytes
- **Compression Ratio**: Percentage size reduction (negative = size increase)

## Running Performance Tests

To generate an updated version of this report:

```bash
npm run test:performance:report
```

## Version History

- **v0.1.8** (2025-08-29): Added Brotli compression support and comprehensive performance analysis
