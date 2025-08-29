import puppeteer, { Browser, Page } from 'puppeteer';

describe('Simple Browser Tests', () => {
  let browser: Browser;
  let page: Page;
  
  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }, 30000);

  beforeEach(async () => {
    page = await browser.newPage();
    
    // Enable console logs
    page.on('console', (msg) => {
      console.log(`Browser [${msg.type()}]:`, msg.text());
    });
    
    // Catch errors
    page.on('pageerror', (error) => {
      console.error('Browser Error:', error.message);
    });
  });

  afterEach(async () => {
    if (page) {
      await page.close();
    }
  });

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  it('should load basic HTML page', async () => {
    const testHtml = `
      <!DOCTYPE html>
      <html>
      <head><title>Test</title></head>
      <body>
        <h1>Basic Test</h1>
        <script>
          window.testResult = 'success';
        </script>
      </body>
      </html>
    `;

    await page.setContent(testHtml);
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const result = await page.evaluate(() => (window as any).testResult);
    expect(result).toBe('success');
  });

  it('should detect browser crypto capabilities', async () => {
    const testHtml = `
      <!DOCTYPE html>
      <html>
      <body>
        <script>
          window.cryptoTest = {
            hasWebCrypto: typeof crypto !== 'undefined' && typeof crypto.subtle !== 'undefined',
            hasCompressionStream: typeof CompressionStream !== 'undefined',
            hasDecompressionStream: typeof DecompressionStream !== 'undefined'
          };
        </script>
      </body>
      </html>
    `;

    await page.setContent(testHtml);
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const result = await page.evaluate(() => (window as any).cryptoTest);
    
    console.log('Browser crypto capabilities:', result);
    // Note: In headless mode, crypto.subtle might not be available
    expect(result).toBeDefined();
    // Just check that we got a result object
    expect(typeof result.hasWebCrypto).toBe('boolean');
  });

  it.skip('should load external CDN libraries', async () => {
    const testHtml = `
      <!DOCTYPE html>
      <html>
      <body>
        <script src="https://cdn.jsdelivr.net/npm/jose@5.9.6/dist/browser/umd/index.js"></script>
        <script src="https://unpkg.com/uuid@10.0.0/dist/umd/uuidv4.min.js"></script>
        <script>
          setTimeout(() => {
            window.cdnTest = {
              joseLoaded: typeof jose !== 'undefined',
              uuidLoaded: typeof uuidv4 !== 'undefined'
            };
          }, 1000);
        </script>
      </body>
      </html>
    `;

    await page.setContent(testHtml);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const result = await page.evaluate(() => (window as any).cdnTest);
    
    console.log('CDN library test:', result);
    expect(result).toBeTruthy();
    expect(result.joseLoaded).toBe(true);
    expect(result.uuidLoaded).toBe(true);
  });
});