# CloudlessCart Performance Test Results

## Test Configuration
- **Date**: 2025-08-29T21:17:46.679Z
- **Environment**: Node.js v22.17.0
- **Payload Sizes**: ~100B, ~1KB, ~10KB, ~100KB
- **Compression Methods**: none, gzip, brotli
- **Modes Tested**: Sign-Only, Encrypt-Then-Sign, Sign-Then-Encrypt

## Performance Summary

### Compression Method Comparison

| Method | Avg Compression | Avg Time | Notes |
|--------|----------------|----------|-------|
| none | -100.4% | 2.03ms | Fastest, no compression |
| gzip | -27.6% | 3.58ms | Good balance |
| brotli | -24.6% | 21.73ms | Best compression, higher CPU |

### Detailed Results

```

==================================================================================================================================
PERFORMANCE TEST SUMMARY
==================================================================================================================================
Operation      | Mode                      | Size     | Original | Processed | Ratio  |     Time | Method
----------------------------------------------------------------------------------------------------------------------------------

--- ~100B Payload Results ---
Sign           | Sign-Only                 | ~100B    |     810B |    1.3KB |  -61.7% |     1.27ms | N/A
Verify         | Sign-Only                 | ~100B    |    1.3KB |     810B |     N/A |     1.08ms | N/A
Encrypt+Sign   | Encrypt-Then-Sign (none)  | ~100B    |     810B |    2.3KB | -185.9% |     1.03ms | none
Verify+Decrypt | Encrypt-Then-Sign (none)  | ~100B    |    2.3KB |     889B |     N/A |     1.19ms | none
Encrypt+Sign   | Encrypt-Then-Sign (gzip)  | ~100B    |     810B |    2.2KB | -179.0% |     2.40ms | gzip
Verify+Decrypt | Encrypt-Then-Sign (gzip)  | ~100B    |    2.2KB |     810B |     N/A |     1.13ms | gzip
Encrypt+Sign   | Encrypt-Then-Sign (brotli) | ~100B    |     810B |    2.1KB | -168.2% |   107.32ms | brotli
Verify+Decrypt | Encrypt-Then-Sign (brotli) | ~100B    |    2.1KB |     810B |     N/A |     2.19ms | brotli
Sign+Encrypt   | Sign-Then-Encrypt (none)  | ~100B    |     810B |    2.3KB | -189.8% |     1.48ms | none
Decrypt+Verify | Sign-Then-Encrypt (none)  | ~100B    |    2.3KB |     810B |     N/A |     0.85ms | none
Sign+Encrypt   | Sign-Then-Encrypt (gzip)  | ~100B    |     810B |    2.3KB | -189.0% |     3.39ms | gzip
Decrypt+Verify | Sign-Then-Encrypt (gzip)  | ~100B    |    2.3KB |     810B |     N/A |     1.91ms | gzip
Sign+Encrypt   | Sign-Then-Encrypt (brotli) | ~100B    |     810B |    2.3KB | -189.3% |     6.19ms | brotli
Decrypt+Verify | Sign-Then-Encrypt (brotli) | ~100B    |    2.3KB |     810B |     N/A |     3.76ms | brotli

--- ~1KB Payload Results ---
Sign           | Sign-Only                 | ~1KB     |    1.3KB |    1.7KB |  -38.9% |     1.11ms | N/A
Verify         | Sign-Only                 | ~1KB     |    1.7KB |    1.3KB |     N/A |     0.18ms | N/A
Encrypt+Sign   | Encrypt-Then-Sign (none)  | ~1KB     |    1.3KB |    2.9KB | -129.4% |     3.75ms | none
Verify+Decrypt | Encrypt-Then-Sign (none)  | ~1KB     |    2.9KB |    1.3KB |     N/A |    11.69ms | none
Encrypt+Sign   | Encrypt-Then-Sign (gzip)  | ~1KB     |    1.3KB |    2.3KB |  -80.7% |     8.92ms | gzip
Verify+Decrypt | Encrypt-Then-Sign (gzip)  | ~1KB     |    2.3KB |    1.3KB |     N/A |     2.97ms | gzip
Encrypt+Sign   | Encrypt-Then-Sign (brotli) | ~1KB     |    1.3KB |    2.2KB |  -73.4% |     5.42ms | brotli
Verify+Decrypt | Encrypt-Then-Sign (brotli) | ~1KB     |    2.2KB |    1.3KB |     N/A |     5.62ms | brotli
Sign+Encrypt   | Sign-Then-Encrypt (none)  | ~1KB     |    1.3KB |    2.9KB | -131.8% |     1.51ms | none
Decrypt+Verify | Sign-Then-Encrypt (none)  | ~1KB     |    2.9KB |    1.3KB |     N/A |     1.40ms | none
Sign+Encrypt   | Sign-Then-Encrypt (gzip)  | ~1KB     |    1.3KB |    2.4KB |  -87.3% |     1.16ms | gzip
Decrypt+Verify | Sign-Then-Encrypt (gzip)  | ~1KB     |    2.4KB |    1.3KB |     N/A |     0.92ms | gzip
Sign+Encrypt   | Sign-Then-Encrypt (brotli) | ~1KB     |    1.3KB |    2.4KB |  -87.5% |     2.26ms | brotli
Decrypt+Verify | Sign-Then-Encrypt (brotli) | ~1KB     |    2.4KB |    1.3KB |     N/A |     1.26ms | brotli

--- ~10KB Payload Results ---
Sign           | Sign-Only                 | ~10KB    |    8.2KB |    8.7KB |   -5.9% |     0.82ms | N/A
Verify         | Sign-Only                 | ~10KB    |    8.7KB |    8.2KB |     N/A |     0.34ms | N/A
Encrypt+Sign   | Encrypt-Then-Sign (none)  | ~10KB    |    8.2KB |   12.2KB |  -48.0% |     1.39ms | none
Verify+Decrypt | Encrypt-Then-Sign (none)  | ~10KB    |   12.2KB |    8.3KB |     N/A |     8.54ms | none
Encrypt+Sign   | Encrypt-Then-Sign (gzip)  | ~10KB    |    8.2KB |    2.7KB |  +66.8% |     2.14ms | gzip
Verify+Decrypt | Encrypt-Then-Sign (gzip)  | ~10KB    |    2.7KB |    8.2KB |     N/A |     1.36ms | gzip
Encrypt+Sign   | Encrypt-Then-Sign (brotli) | ~10KB    |    8.2KB |    2.5KB |  +69.1% |     5.39ms | brotli
Verify+Decrypt | Encrypt-Then-Sign (brotli) | ~10KB    |    2.5KB |    8.2KB |     N/A |     2.06ms | brotli
Sign+Encrypt   | Sign-Then-Encrypt (none)  | ~10KB    |    8.2KB |   12.2KB |  -48.3% |     0.95ms | none
Decrypt+Verify | Sign-Then-Encrypt (none)  | ~10KB    |   12.2KB |    8.2KB |     N/A |     0.86ms | none
Sign+Encrypt   | Sign-Then-Encrypt (gzip)  | ~10KB    |    8.2KB |    2.8KB |  +66.0% |     1.40ms | gzip
Decrypt+Verify | Sign-Then-Encrypt (gzip)  | ~10KB    |    2.8KB |    8.2KB |     N/A |     1.09ms | gzip
Sign+Encrypt   | Sign-Then-Encrypt (brotli) | ~10KB    |    8.2KB |    2.7KB |  +67.2% |     3.60ms | brotli
Decrypt+Verify | Sign-Then-Encrypt (brotli) | ~10KB    |    2.7KB |    8.2KB |     N/A |     1.57ms | brotli

--- ~100KB Payload Results ---
Sign           | Sign-Only                 | ~100KB   |   79.0KB |   79.4KB |   -0.6% |     2.37ms | N/A
Verify         | Sign-Only                 | ~100KB   |   79.4KB |   79.0KB |     N/A |     1.81ms | N/A
Encrypt+Sign   | Encrypt-Then-Sign (none)  | ~100KB   |   79.0KB |  106.5KB |  -34.9% |     3.65ms | none
Verify+Decrypt | Encrypt-Then-Sign (none)  | ~100KB   |  106.5KB |   79.0KB |     N/A |     3.17ms | none
Encrypt+Sign   | Encrypt-Then-Sign (gzip)  | ~100KB   |   79.0KB |    7.0KB |  +91.1% |     3.97ms | gzip
Verify+Decrypt | Encrypt-Then-Sign (gzip)  | ~100KB   |    7.0KB |   79.0KB |     N/A |     4.87ms | gzip
Encrypt+Sign   | Encrypt-Then-Sign (brotli) | ~100KB   |   79.0KB |    5.8KB |  +92.7% |    25.68ms | brotli
Verify+Decrypt | Encrypt-Then-Sign (brotli) | ~100KB   |    5.8KB |   79.0KB |     N/A |     6.30ms | brotli
Sign+Encrypt   | Sign-Then-Encrypt (none)  | ~100KB   |   79.0KB |  106.5KB |  -34.9% |     2.45ms | none
Decrypt+Verify | Sign-Then-Encrypt (none)  | ~100KB   |  106.5KB |   79.0KB |     N/A |     6.63ms | none
Sign+Encrypt   | Sign-Then-Encrypt (gzip)  | ~100KB   |   79.0KB |    7.0KB |  +91.1% |     5.27ms | gzip
Decrypt+Verify | Sign-Then-Encrypt (gzip)  | ~100KB   |    7.0KB |   79.0KB |     N/A |     2.71ms | gzip
Sign+Encrypt   | Sign-Then-Encrypt (brotli) | ~100KB   |   79.0KB |    5.9KB |  +92.6% |    17.95ms | brotli
Decrypt+Verify | Sign-Then-Encrypt (brotli) | ~100KB   |    5.9KB |   79.0KB |     N/A |     3.95ms | brotli

==================================================================================================================================
COMPRESSION METHOD COMPARISON
==================================================================================================================================

~100B Payload Compression Analysis:
--------------------------------------------------
  none    | Compression: -187.8% | Avg Time: 1.25ms | Avg Size: 2.3KB
  gzip    | Compression: -184.0% | Avg Time: 2.90ms | Avg Size: 2.2KB
  brotli  | Compression: -178.7% | Avg Time: 56.75ms | Avg Size: 2.2KB

~1KB Payload Compression Analysis:
--------------------------------------------------
  none    | Compression: -130.6% | Avg Time: 2.63ms | Avg Size: 2.9KB
  gzip    | Compression: -84.0% | Avg Time: 5.04ms | Avg Size: 2.3KB
  brotli  | Compression: -80.5% | Avg Time: 3.84ms | Avg Size: 2.3KB

~10KB Payload Compression Analysis:
--------------------------------------------------
  none    | Compression: -48.2% | Avg Time: 1.17ms | Avg Size: 12.2KB
  gzip    | Compression: +66.4% | Avg Time: 1.77ms | Avg Size: 2.8KB
  brotli  | Compression: +68.2% | Avg Time: 4.50ms | Avg Size: 2.6KB

~100KB Payload Compression Analysis:
--------------------------------------------------
  none    | Compression: -34.9% | Avg Time: 3.05ms | Avg Size: 106.5KB
  gzip    | Compression: +91.1% | Avg Time: 4.62ms | Avg Size: 7.0KB
  brotli  | Compression: +92.6% | Avg Time: 21.81ms | Avg Size: 5.8KB

==================================================================================================================================
PERFORMANCE INSIGHTS
==================================================================================================================================

Overall Compression Method Performance:
--------------------------------------------------
• none   : Avg compression -100.4%, Avg time 2.03ms
• gzip   : Avg compression -27.6%, Avg time 3.58ms
• brotli : Avg compression -24.6%, Avg time 21.73ms

Key Findings:
• Larger payloads benefit more from compression
• Brotli offers best compression ratio but with higher CPU cost
• Gzip provides good balance between compression and speed
• No compression (none) is fastest but produces largest tokens
• Encrypt-then-sign typically offers better compression due to structure
• Sign-only mode is fastest but offers no confidentiality
==================================================================================================================================
```

## Recommendations

1. **For maximum speed**: Use no compression (none)
2. **For balanced performance**: Use gzip compression
3. **For maximum compression**: Use brotli compression
4. **For small payloads (<1KB)**: Compression overhead may not be worth it
5. **For large payloads (>10KB)**: Compression significantly reduces token size

## Test Methodology

Tests were performed using:
- Multiple payload sizes from ~100B to ~100KB
- All three compression methods (none, gzip, brotli)
- Three operation modes (Sign-Only, Encrypt-Then-Sign, Sign-Then-Encrypt)
- Each test averaged over multiple runs for accuracy
