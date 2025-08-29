# CloudlessCart Performance Test Results

## Test Configuration
- **Date**: 2025-08-29T23:43:33.456Z
- **Environment**: Node.js v22.17.0
- **Payload Sizes**: ~100B, ~1KB, ~10KB, ~100KB
- **Compression Methods**: none, gzip, brotli
- **Modes Tested**: Sign-Only, Encrypt-Then-Sign, Sign-Then-Encrypt

## Performance Summary

### Compression Method Comparison

| Method | Avg Compression | Avg Time | Notes |
|--------|----------------|----------|-------|
| none | -100.4% | 1.81ms | Fastest, no compression |
| gzip | -27.7% | 2.85ms | Good balance |
| brotli | -24.4% | 21.25ms | Best compression, higher CPU |

### Detailed Results

```

==================================================================================================================================
PERFORMANCE TEST SUMMARY
==================================================================================================================================
Operation      | Mode                      | Size     | Original | Processed | Ratio  |     Time | Method
----------------------------------------------------------------------------------------------------------------------------------

--- ~100B Payload Results ---
Sign           | Sign-Only                 | ~100B    |     810B |    1.3KB |  -61.7% |     2.18ms | N/A
Verify         | Sign-Only                 | ~100B    |    1.3KB |     810B |     N/A |     1.07ms | N/A
Encrypt+Sign   | Encrypt-Then-Sign (none)  | ~100B    |     810B |    2.3KB | -185.9% |     1.93ms | none
Verify+Decrypt | Encrypt-Then-Sign (none)  | ~100B    |    2.3KB |     889B |     N/A |     1.26ms | none
Encrypt+Sign   | Encrypt-Then-Sign (gzip)  | ~100B    |     810B |    2.2KB | -179.0% |     4.40ms | gzip
Verify+Decrypt | Encrypt-Then-Sign (gzip)  | ~100B    |    2.2KB |     810B |     N/A |     2.76ms | gzip
Encrypt+Sign   | Encrypt-Then-Sign (brotli) | ~100B    |     810B |    2.1KB | -168.2% |    99.22ms | brotli
Verify+Decrypt | Encrypt-Then-Sign (brotli) | ~100B    |    2.1KB |     810B |     N/A |     2.61ms | brotli
Sign+Encrypt   | Sign-Then-Encrypt (none)  | ~100B    |     810B |    2.3KB | -189.8% |     2.45ms | none
Decrypt+Verify | Sign-Then-Encrypt (none)  | ~100B    |    2.3KB |     810B |     N/A |     1.24ms | none
Sign+Encrypt   | Sign-Then-Encrypt (gzip)  | ~100B    |     810B |    2.3KB | -189.6% |     2.89ms | gzip
Decrypt+Verify | Sign-Then-Encrypt (gzip)  | ~100B    |    2.3KB |     810B |     N/A |     3.50ms | gzip
Sign+Encrypt   | Sign-Then-Encrypt (brotli) | ~100B    |     810B |    2.3KB | -189.3% |     2.30ms | brotli
Decrypt+Verify | Sign-Then-Encrypt (brotli) | ~100B    |    2.3KB |     810B |     N/A |     1.53ms | brotli

--- ~1KB Payload Results ---
Sign           | Sign-Only                 | ~1KB     |    1.3KB |    1.7KB |  -38.9% |     1.79ms | N/A
Verify         | Sign-Only                 | ~1KB     |    1.7KB |    1.3KB |     N/A |     0.29ms | N/A
Encrypt+Sign   | Encrypt-Then-Sign (none)  | ~1KB     |    1.3KB |    2.9KB | -129.4% |     1.17ms | none
Verify+Decrypt | Encrypt-Then-Sign (none)  | ~1KB     |    2.9KB |    1.3KB |     N/A |     1.01ms | none
Encrypt+Sign   | Encrypt-Then-Sign (gzip)  | ~1KB     |    1.3KB |    2.3KB |  -80.3% |     1.44ms | gzip
Verify+Decrypt | Encrypt-Then-Sign (gzip)  | ~1KB     |    2.3KB |    1.3KB |     N/A |     1.29ms | gzip
Encrypt+Sign   | Encrypt-Then-Sign (brotli) | ~1KB     |    1.3KB |    2.2KB |  -73.0% |     3.41ms | brotli
Verify+Decrypt | Encrypt-Then-Sign (brotli) | ~1KB     |    2.2KB |    1.3KB |     N/A |     1.56ms | brotli
Sign+Encrypt   | Sign-Then-Encrypt (none)  | ~1KB     |    1.3KB |    2.9KB | -131.8% |     0.90ms | none
Decrypt+Verify | Sign-Then-Encrypt (none)  | ~1KB     |    2.9KB |    1.3KB |     N/A |     0.93ms | none
Sign+Encrypt   | Sign-Then-Encrypt (gzip)  | ~1KB     |    1.3KB |    2.4KB |  -87.3% |     3.87ms | gzip
Decrypt+Verify | Sign-Then-Encrypt (gzip)  | ~1KB     |    2.4KB |    1.3KB |     N/A |     2.50ms | gzip
Sign+Encrypt   | Sign-Then-Encrypt (brotli) | ~1KB     |    1.3KB |    2.3KB |  -86.3% |     4.33ms | brotli
Decrypt+Verify | Sign-Then-Encrypt (brotli) | ~1KB     |    2.3KB |    1.3KB |     N/A |     1.39ms | brotli

--- ~10KB Payload Results ---
Sign           | Sign-Only                 | ~10KB    |    8.2KB |    8.7KB |   -5.9% |     1.01ms | N/A
Verify         | Sign-Only                 | ~10KB    |    8.7KB |    8.2KB |     N/A |     1.90ms | N/A
Encrypt+Sign   | Encrypt-Then-Sign (none)  | ~10KB    |    8.2KB |   12.2KB |  -48.0% |     1.02ms | none
Verify+Decrypt | Encrypt-Then-Sign (none)  | ~10KB    |   12.2KB |    8.3KB |     N/A |     1.00ms | none
Encrypt+Sign   | Encrypt-Then-Sign (gzip)  | ~10KB    |    8.2KB |    2.7KB |  +66.8% |     1.55ms | gzip
Verify+Decrypt | Encrypt-Then-Sign (gzip)  | ~10KB    |    2.7KB |    8.2KB |     N/A |     1.48ms | gzip
Encrypt+Sign   | Encrypt-Then-Sign (brotli) | ~10KB    |    8.2KB |    2.5KB |  +69.3% |     5.47ms | brotli
Verify+Decrypt | Encrypt-Then-Sign (brotli) | ~10KB    |    2.5KB |    8.2KB |     N/A |     2.64ms | brotli
Sign+Encrypt   | Sign-Then-Encrypt (none)  | ~10KB    |    8.2KB |   12.2KB |  -48.3% |     1.03ms | none
Decrypt+Verify | Sign-Then-Encrypt (none)  | ~10KB    |   12.2KB |    8.2KB |     N/A |     0.88ms | none
Sign+Encrypt   | Sign-Then-Encrypt (gzip)  | ~10KB    |    8.2KB |    2.8KB |  +66.0% |     1.42ms | gzip
Decrypt+Verify | Sign-Then-Encrypt (gzip)  | ~10KB    |    2.8KB |    8.2KB |     N/A |     1.19ms | gzip
Sign+Encrypt   | Sign-Then-Encrypt (brotli) | ~10KB    |    8.2KB |    2.7KB |  +67.3% |     3.84ms | brotli
Decrypt+Verify | Sign-Then-Encrypt (brotli) | ~10KB    |    2.7KB |    8.2KB |     N/A |     3.87ms | brotli

--- ~100KB Payload Results ---
Sign           | Sign-Only                 | ~100KB   |   79.0KB |   79.4KB |   -0.6% |     2.44ms | N/A
Verify         | Sign-Only                 | ~100KB   |   79.4KB |   79.0KB |     N/A |     1.96ms | N/A
Encrypt+Sign   | Encrypt-Then-Sign (none)  | ~100KB   |   79.0KB |  106.5KB |  -34.9% |     3.22ms | none
Verify+Decrypt | Encrypt-Then-Sign (none)  | ~100KB   |  106.5KB |   79.0KB |     N/A |     3.60ms | none
Encrypt+Sign   | Encrypt-Then-Sign (gzip)  | ~100KB   |   79.0KB |    7.0KB |  +91.1% |     3.23ms | gzip
Verify+Decrypt | Encrypt-Then-Sign (gzip)  | ~100KB   |    7.0KB |   79.0KB |     N/A |     2.79ms | gzip
Encrypt+Sign   | Encrypt-Then-Sign (brotli) | ~100KB   |   79.0KB |    5.8KB |  +92.7% |    30.35ms | brotli
Verify+Decrypt | Encrypt-Then-Sign (brotli) | ~100KB   |    5.8KB |   79.0KB |     N/A |     9.86ms | brotli
Sign+Encrypt   | Sign-Then-Encrypt (none)  | ~100KB   |   79.0KB |  106.5KB |  -34.9% |     2.78ms | none
Decrypt+Verify | Sign-Then-Encrypt (none)  | ~100KB   |  106.5KB |   79.0KB |     N/A |     4.18ms | none
Sign+Encrypt   | Sign-Then-Encrypt (gzip)  | ~100KB   |   79.0KB |    7.0KB |  +91.1% |     4.04ms | gzip
Decrypt+Verify | Sign-Then-Encrypt (gzip)  | ~100KB   |    7.0KB |   79.0KB |     N/A |     3.46ms | gzip
Sign+Encrypt   | Sign-Then-Encrypt (brotli) | ~100KB   |   79.0KB |    5.9KB |  +92.5% |    21.04ms | brotli
Decrypt+Verify | Sign-Then-Encrypt (brotli) | ~100KB   |    5.9KB |   79.0KB |     N/A |     8.28ms | brotli

==================================================================================================================================
COMPRESSION METHOD COMPARISON
==================================================================================================================================

~100B Payload Compression Analysis:
--------------------------------------------------
  none    | Compression: -187.8% | Avg Time: 2.19ms | Avg Size: 2.3KB
  gzip    | Compression: -184.3% | Avg Time: 3.65ms | Avg Size: 2.2KB
  brotli  | Compression: -178.7% | Avg Time: 50.76ms | Avg Size: 2.2KB

~1KB Payload Compression Analysis:
--------------------------------------------------
  none    | Compression: -130.6% | Avg Time: 1.03ms | Avg Size: 2.9KB
  gzip    | Compression: -83.8% | Avg Time: 2.66ms | Avg Size: 2.3KB
  brotli  | Compression: -79.6% | Avg Time: 3.87ms | Avg Size: 2.3KB

~10KB Payload Compression Analysis:
--------------------------------------------------
  none    | Compression: -48.2% | Avg Time: 1.02ms | Avg Size: 12.2KB
  gzip    | Compression: +66.4% | Avg Time: 1.48ms | Avg Size: 2.8KB
  brotli  | Compression: +68.3% | Avg Time: 4.65ms | Avg Size: 2.6KB

~100KB Payload Compression Analysis:
--------------------------------------------------
  none    | Compression: -34.9% | Avg Time: 3.00ms | Avg Size: 106.5KB
  gzip    | Compression: +91.1% | Avg Time: 3.63ms | Avg Size: 7.0KB
  brotli  | Compression: +92.6% | Avg Time: 25.70ms | Avg Size: 5.8KB

==================================================================================================================================
PERFORMANCE INSIGHTS
==================================================================================================================================

Overall Compression Method Performance:
--------------------------------------------------
• none   : Avg compression -100.4%, Avg time 1.81ms
• gzip   : Avg compression -27.7%, Avg time 2.85ms
• brotli : Avg compression -24.4%, Avg time 21.25ms

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
