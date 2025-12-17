import logger from '@/lib/logger';
// @ts-ignore - types not resolving in this env despite install
import Tesseract from 'tesseract.js';

export interface InvoiceData {
    text: string;
    inferredTotal?: number;
    inferredDate?: string;
    inferredVendor?: string;
}

export class OCRService {
    /**
     * Extracts text and basic data from an image buffer (or URL).
     * Note: For real PDFs, efficient parsing often requires 'pdf-parse' for text layers, 
     * but Tesseract is used here for scanned docs/images flexibility.
     */
    static async processInvoice(imageBuffer: Buffer): Promise<InvoiceData> {
        try {
            logger.info("Starting OCR processing on invoice");

            const { data: { text } } = await Tesseract.recognize(
                imageBuffer,
                'eng',
                { logger: (m: unknown) => logger.debug(m, "OCR Progress") }
            );

            return {
                text,
                inferredTotal: this.extractTotal(text),
                inferredDate: this.extractDate(text),
                inferredVendor: this.extractVendor(text) // Heuristic
            };
        } catch (error) {
            logger.error({ error }, "OCR Processing failed");
            throw new Error("Failed to process invoice image.");
        }
    }

    private static extractTotal(text: string): number | undefined {
        // Regex to find "Total: $1,234.56" or similar patterns
        const totalRegex = /(?:total|amount|due)[\s:]*[$€£]?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i;
        const match = text.match(totalRegex);
        if (match && match[1]) {
            return parseFloat(match[1].replace(/,/g, ''));
        }
        return undefined;
    }

    private static extractDate(text: string): string | undefined {
        // Simple regex for dates like YYYY-MM-DD or MM/DD/YYYY
        const dateRegex = /\b(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})\b/;
        const match = text.match(dateRegex);
        return match ? match[1] : undefined;
    }

    private static extractVendor(text: string): string | undefined {
        // Very naive heuristic: first non-empty line is often the vendor name in headers
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        return lines.length > 0 ? lines[0] : undefined;
    }
}
