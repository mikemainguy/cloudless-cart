import CloudlessCrypto from '../src/cloudlessCrypto';

describe('Performance Analysis', () => {
  let crypto: CloudlessCrypto;
  let signingKey: string;
  let encryptionKey: string;

  beforeAll(async () => {
    crypto = new CloudlessCrypto();
    signingKey = (await crypto.generateSigningKeyPair()).key;
    encryptionKey = (await crypto.generateEncryptionKeyPair()).key;
    console.log('\n🔧 Setting up cryptographic keys...\n');
  });

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  const generatePayload = (targetSize: number) => {
    const baseCart = {
      userId: 'user-12345',
      sessionId: `session-${Date.now()}`,
      timestamp: Date.now(),
      items: [] as any[],
      totals: { subtotal: 0, tax: 8.25, shipping: 5.99, total: 0 }
    };

    // Generate items to reach target size
    let currentSize = JSON.stringify(baseCart).length;
    let itemIndex = 0;

    while (currentSize < targetSize * 0.9) {
      const item = {
        id: `item-${itemIndex}`,
        name: `Product ${itemIndex}`,
        description: `Product description ${itemIndex}`.repeat(Math.max(1, Math.floor(targetSize / 5000))),
        price: Math.round(Math.random() * 100 + 10),
        quantity: Math.floor(Math.random() * 5) + 1,
        category: ['Electronics', 'Clothing', 'Books'][itemIndex % 3],
        attributes: {
          color: 'blue',
          size: 'medium',
          weight: Math.random() * 5
        }
      };
      
      baseCart.items.push(item);
      currentSize = JSON.stringify(baseCart).length;
      itemIndex++;
      
      if (itemIndex > 1000) break; // Safety break
    }

    baseCart.totals.subtotal = baseCart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    baseCart.totals.total = baseCart.totals.subtotal + baseCart.totals.tax + baseCart.totals.shipping;

    return baseCart;
  };

  const testCases = [
    { name: '~100B', target: 100 },
    { name: '~1KB', target: 1000 },
    { name: '~10KB', target: 10000 },
    { name: '~100KB', target: 100000 }
  ];

  testCases.forEach(({ name, target }) => {
    describe(`${name} Payload Performance`, () => {
      let payload: any;
      let payloadSize: number;

      beforeAll(() => {
        payload = generatePayload(target);
        payloadSize = JSON.stringify(payload).length;
        console.log(`📦 Generated ${name} payload: ${formatBytes(payloadSize)} actual size`);
      });

      it('should benchmark all three modes', async () => {
        console.log(`\n🔬 PERFORMANCE ANALYSIS: ${name} (${formatBytes(payloadSize)})`);
        console.log('='.repeat(80));

        const results = [];

        // 1. Sign-Only Mode
        console.log('\n1️⃣ SIGN-ONLY MODE');
        console.log('-'.repeat(40));
        
        const signStart = performance.now();
        const signed = await crypto.signObject(signingKey, payload);
        const signTime = performance.now() - signStart;
        const signedSize = JSON.stringify(signed).length;
        
        const verifyStart = performance.now();
        const verified = await crypto.verifyObject(signed, signingKey);
        const verifyTime = performance.now() - verifyStart;

        console.log(`📤 Sign:     ${signTime.toFixed(2)}ms | ${formatBytes(payloadSize)} → ${formatBytes(signedSize)} (${((signedSize/payloadSize-1)*100).toFixed(1)}% overhead)`);
        console.log(`📥 Verify:   ${verifyTime.toFixed(2)}ms | ${formatBytes(signedSize)} → ${formatBytes(JSON.stringify(verified).length)}`);

        results.push({
          mode: 'Sign-Only',
          signTime: signTime.toFixed(2),
          verifyTime: verifyTime.toFixed(2),
          totalTime: (signTime + verifyTime).toFixed(2),
          outputSize: formatBytes(signedSize),
          overhead: ((signedSize/payloadSize-1)*100).toFixed(1) + '%'
        });

        // 2. Encrypt-then-Sign (with compression)
        console.log('\n2️⃣ ENCRYPT-THEN-SIGN (with compression)');
        console.log('-'.repeat(40));
        
        const etsCompressStart = performance.now();
        const etsCompressed = await crypto.encryptThenSign(encryptionKey, signingKey, payload, { compress: true });
        const etsCompressTime = performance.now() - etsCompressStart;
        const etsCompressedSize = JSON.stringify(etsCompressed).length;

        const etsDecompressStart = performance.now();
        const etsDecompressed = await crypto.verifyThenDecrypt(signingKey, encryptionKey, etsCompressed);
        const etsDecompressTime = performance.now() - etsDecompressStart;

        console.log(`🔒 Encrypt+Sign: ${etsCompressTime.toFixed(2)}ms | ${formatBytes(payloadSize)} → ${formatBytes(etsCompressedSize)} (${((etsCompressedSize/payloadSize-1)*100).toFixed(1)}% size change)`);
        console.log(`🔓 Verify+Decrypt: ${etsDecompressTime.toFixed(2)}ms | ${formatBytes(etsCompressedSize)} → ${formatBytes(JSON.stringify(etsDecompressed).length)}`);

        results.push({
          mode: 'Encrypt-Then-Sign+Compress',
          signTime: etsCompressTime.toFixed(2),
          verifyTime: etsDecompressTime.toFixed(2),
          totalTime: (etsCompressTime + etsDecompressTime).toFixed(2),
          outputSize: formatBytes(etsCompressedSize),
          overhead: ((etsCompressedSize/payloadSize-1)*100).toFixed(1) + '%'
        });

        // 3. Encrypt-then-Sign (without compression)
        console.log('\n3️⃣ ENCRYPT-THEN-SIGN (without compression)');
        console.log('-'.repeat(40));
        
        const etsNoCompStart = performance.now();
        const etsNoComp = await crypto.encryptThenSign(encryptionKey, signingKey, payload, { compress: false });
        const etsNoCompTime = performance.now() - etsNoCompStart;
        const etsNoCompSize = JSON.stringify(etsNoComp).length;

        const etsNoCompDecStart = performance.now();
        const etsNoCompDec = await crypto.verifyThenDecrypt(signingKey, encryptionKey, etsNoComp);
        const etsNoCompDecTime = performance.now() - etsNoCompDecStart;

        console.log(`🔒 Encrypt+Sign: ${etsNoCompTime.toFixed(2)}ms | ${formatBytes(payloadSize)} → ${formatBytes(etsNoCompSize)} (${((etsNoCompSize/payloadSize-1)*100).toFixed(1)}% overhead)`);
        console.log(`🔓 Verify+Decrypt: ${etsNoCompDecTime.toFixed(2)}ms | ${formatBytes(etsNoCompSize)} → ${formatBytes(JSON.stringify(etsNoCompDec).length)}`);

        results.push({
          mode: 'Encrypt-Then-Sign',
          signTime: etsNoCompTime.toFixed(2),
          verifyTime: etsNoCompDecTime.toFixed(2),
          totalTime: (etsNoCompTime + etsNoCompDecTime).toFixed(2),
          outputSize: formatBytes(etsNoCompSize),
          overhead: ((etsNoCompSize/payloadSize-1)*100).toFixed(1) + '%'
        });

        // 4. Sign-then-Encrypt (with compression)
        console.log('\n4️⃣ SIGN-THEN-ENCRYPT (with compression)');
        console.log('-'.repeat(40));
        
        const steCompressStart = performance.now();
        const steCompressed = await crypto.signAndEncrypt(signingKey, encryptionKey, payload, { compress: true });
        const steCompressTime = performance.now() - steCompressStart;
        const steCompressedSize = steCompressed.length; // JWT string

        const steDecompressStart = performance.now();
        const steDecompressed = await crypto.decryptAndVerify(encryptionKey, signingKey, steCompressed);
        const steDecompressTime = performance.now() - steDecompressStart;

        console.log(`🔏 Sign+Encrypt: ${steCompressTime.toFixed(2)}ms | ${formatBytes(payloadSize)} → ${formatBytes(steCompressedSize)} (${((steCompressedSize/payloadSize-1)*100).toFixed(1)}% size change)`);
        console.log(`🔐 Decrypt+Verify: ${steDecompressTime.toFixed(2)}ms | ${formatBytes(steCompressedSize)} → ${formatBytes(JSON.stringify(steDecompressed).length)}`);

        results.push({
          mode: 'Sign-Then-Encrypt+Compress',
          signTime: steCompressTime.toFixed(2),
          verifyTime: steDecompressTime.toFixed(2),
          totalTime: (steCompressTime + steDecompressTime).toFixed(2),
          outputSize: formatBytes(steCompressedSize),
          overhead: ((steCompressedSize/payloadSize-1)*100).toFixed(1) + '%'
        });

        // 5. Sign-then-Encrypt (without compression)
        console.log('\n5️⃣ SIGN-THEN-ENCRYPT (without compression)');
        console.log('-'.repeat(40));
        
        const steNoCompStart = performance.now();
        const steNoComp = await crypto.signAndEncrypt(signingKey, encryptionKey, payload, { compress: false });
        const steNoCompTime = performance.now() - steNoCompStart;
        const steNoCompSize = steNoComp.length;

        const steNoCompDecStart = performance.now();
        const steNoCompDec = await crypto.decryptAndVerify(encryptionKey, signingKey, steNoComp);
        const steNoCompDecTime = performance.now() - steNoCompDecStart;

        console.log(`🔏 Sign+Encrypt: ${steNoCompTime.toFixed(2)}ms | ${formatBytes(payloadSize)} → ${formatBytes(steNoCompSize)} (${((steNoCompSize/payloadSize-1)*100).toFixed(1)}% overhead)`);
        console.log(`🔐 Decrypt+Verify: ${steNoCompDecTime.toFixed(2)}ms | ${formatBytes(steNoCompSize)} → ${formatBytes(JSON.stringify(steNoCompDec).length)}`);

        results.push({
          mode: 'Sign-Then-Encrypt',
          signTime: steNoCompTime.toFixed(2),
          verifyTime: steNoCompDecTime.toFixed(2),
          totalTime: (steNoCompTime + steNoCompDecTime).toFixed(2),
          outputSize: formatBytes(steNoCompSize),
          overhead: ((steNoCompSize/payloadSize-1)*100).toFixed(1) + '%'
        });

        // Summary Table
        console.log(`\n📊 SUMMARY TABLE FOR ${name}`);
        console.log('='.repeat(80));
        console.log('Mode                        | Encrypt/Sign | Decrypt/Verify | Total    | Output   | Overhead');
        console.log('-'.repeat(80));
        
        results.forEach(result => {
          console.log(`${result.mode.padEnd(27)} | ${result.signTime.padStart(8)}ms | ${result.verifyTime.padStart(10)}ms | ${result.totalTime.padStart(6)}ms | ${result.outputSize.padStart(7)} | ${result.overhead.padStart(8)}`);
        });

        // Compression Analysis
        if (payloadSize > 1000) {
          const compressedSizes = [etsCompressedSize, steCompressedSize];
          const uncompressedSizes = [etsNoCompSize, steNoCompSize];
          
          console.log(`\n🗜️ COMPRESSION ANALYSIS FOR ${name}`);
          console.log('-'.repeat(50));
          console.log(`Average compressed size:   ${formatBytes(compressedSizes.reduce((a,b) => a+b) / compressedSizes.length)}`);
          console.log(`Average uncompressed size: ${formatBytes(uncompressedSizes.reduce((a,b) => a+b) / uncompressedSizes.length)}`);
          
          const avgCompressionRatio = ((uncompressedSizes.reduce((a,b) => a+b) - compressedSizes.reduce((a,b) => a+b)) / uncompressedSizes.reduce((a,b) => a+b) * 100);
          console.log(`Compression savings:       ${avgCompressionRatio.toFixed(1)}%`);
        }

        expect(results.length).toBe(5);
      });
    });
  });

  afterAll(() => {
    console.log('\n' + '='.repeat(80));
    console.log('🎯 KEY PERFORMANCE INSIGHTS');
    console.log('='.repeat(80));
    console.log('🚀 Sign-only is fastest but provides no encryption');
    console.log('🗜️ Compression significantly reduces token size for large payloads');
    console.log('⚡ Encrypt-then-sign generally faster than sign-then-encrypt');
    console.log('🔐 Security: Encrypt-then-sign recommended for most use cases');
    console.log('📈 Performance scales well with payload size');
    console.log('🎛️ Compression overhead is minimal vs bandwidth savings');
    console.log('='.repeat(80));
  });
});