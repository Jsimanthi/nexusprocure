import { chromium, Browser } from 'playwright';

class PDFService {
  private browser: Browser | null = null;

  async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
    }
    return this.browser;
  }

  async generatePDF(url: string): Promise<Buffer> {
    // For now, keep synchronous for immediate response
    // In production, this could be moved to queue
    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      await page.goto(url, { waitUntil: 'networkidle' });
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
      });
      return pdfBuffer;
    } finally {
      await page.close();
    }
  }


  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

const pdfService = new PDFService();

export default pdfService;