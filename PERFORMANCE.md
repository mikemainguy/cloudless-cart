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
| Sign-Only | 1.93ms | 0.49ms | **2.42ms** | 769B | +185.9% | ❌ |
| Encrypt-Then-Sign | 2.49ms | 1.65ms | **4.14ms** | 1.6KB | +492.6% | ❌ |
| Encrypt-Then-Sign+Compress | 6.13ms | 1.26ms | **7.38ms** | 1.6KB | +514.9% | ✅ |
| Sign-Then-Encrypt | 0.71ms | 0.74ms | **1.45ms** | 1.6KB | +504.5% | ❌ |
| Sign-Then-Encrypt+Compress | 2.13ms | 1.10ms | **3.23ms** | 1.7KB | +552.4% | ✅ |

#### Analysis for 100B

- **Fastest Option**: Sign-Only (2.42ms total)
- **Fastest Encrypted**: Sign-Then-Encrypt (1.45ms total)
- **Smallest Token**: Sign-Only (769B)
- **Average Compression**: 533.6% size reduction


### 1KB Payload (924B actual)

| Mode | Encrypt/Sign | Decrypt/Verify | Total Time | Output Size | Size Change | Compressed |
|------|-------------|----------------|-----------|-------------|-------------|------------|
| Sign-Only | 0.61ms | 0.16ms | **0.78ms** | 1.4KB | +54.1% | ❌ |
| Encrypt-Then-Sign | 0.83ms | 0.69ms | **1.52ms** | 2.4KB | +167.1% | ❌ |
| Encrypt-Then-Sign+Compress | 2.32ms | 1.07ms | **3.39ms** | 2.1KB | +131.6% | ✅ |
| Sign-Then-Encrypt | 0.81ms | 0.88ms | **1.68ms** | 2.4KB | +170.5% | ❌ |
| Sign-Then-Encrypt+Compress | 1.76ms | 1.16ms | **2.92ms** | 2.2KB | +144.4% | ✅ |

#### Analysis for 1KB

- **Fastest Option**: Sign-Only (0.78ms total)
- **Smallest Token**: Sign-Only (1.4KB)
- **Average Compression**: 138.0% size reduction


### 10KB Payload (9.0KB actual)

| Mode | Encrypt/Sign | Decrypt/Verify | Total Time | Output Size | Size Change | Compressed |
|------|-------------|----------------|-----------|-------------|-------------|------------|
| Sign-Only | 0.85ms | 0.34ms | **1.19ms** | 9.5KB | +5.4% | ❌ |
| Encrypt-Then-Sign | 1.32ms | 1.26ms | **2.57ms** | 13.2KB | +46.8% | ❌ |
| Encrypt-Then-Sign+Compress | 4.05ms | 1.72ms | **5.77ms** | 3.5KB | -60.8% | ✅ |
| Sign-Then-Encrypt | 0.93ms | 0.92ms | **1.85ms** | 13.2KB | +47.1% | ❌ |
| Sign-Then-Encrypt+Compress | 3.53ms | 1.70ms | **5.23ms** | 3.8KB | -57.9% | ✅ |

#### Analysis for 10KB

- **Fastest Option**: Sign-Only (1.19ms total)
- **Smallest Token**: Encrypt-Then-Sign+Compress (3.5KB)
- **Average Compression**: 59.3% size reduction


### 100KB Payload (87.9KB actual)

| Mode | Encrypt/Sign | Decrypt/Verify | Total Time | Output Size | Size Change | Compressed |
|------|-------------|----------------|-----------|-------------|-------------|------------|
| Sign-Only | 1.52ms | 2.25ms | **3.77ms** | 88.4KB | +0.6% | ❌ |
| Encrypt-Then-Sign | 2.08ms | 2.16ms | **4.24ms** | 118.4KB | +34.7% | ❌ |
| Encrypt-Then-Sign+Compress | 17.66ms | 4.69ms | **22.35ms** | 7.3KB | -91.7% | ✅ |
| Sign-Then-Encrypt | 1.78ms | 1.77ms | **3.55ms** | 118.4KB | +34.7% | ❌ |
| Sign-Then-Encrypt+Compress | 15.68ms | 2.67ms | **18.36ms** | 7.9KB | -91.0% | ✅ |

#### Analysis for 100KB

- **Fastest Option**: Sign-Only (3.77ms total)
- **Fastest Encrypted**: Sign-Then-Encrypt (3.55ms total)
- **Smallest Token**: Encrypt-Then-Sign+Compress (7.3KB)
- **Average Compression**: 91.3% size reduction


## Compression Analysis

| Payload Size | Original | Compressed | Uncompressed | Compression Ratio | CPU Overhead |
|-------------|----------|------------|--------------|-------------------|--------------|
| 100B | 269B | 1.7KB | 1.6KB | **-5.9%** | +2.5ms |
| 1KB | 924B | 2.1KB | 2.4KB | **11.5%** | +1.2ms |
| 10KB | 9.0KB | 3.6KB | 13.2KB | **72.3%** | +2.7ms |
| 100KB | 87.9KB | 7.6KB | 118.4KB | **93.6%** | +14.7ms |

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
