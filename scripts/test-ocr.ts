import fs from 'fs';
import path from 'path';
import { OCRService } from '../src/lib/ocr-service';

async function main() {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.error('❌ Please provide a path to an invoice image/pdf.');
        console.error('Usage: npx tsx scripts/test-ocr.ts <path-to-file>');
        process.exit(1);
    }

    const filePath = args[0];
    const absolutePath = path.resolve(filePath);

    if (!fs.existsSync(absolutePath)) {
        console.error(`❌ File not found at: ${absolutePath}`);
        process.exit(1);
    }

    console.log(`🔍 Scanning Invoice: ${absolutePath}...`);
    try {
        const fileBuffer = fs.readFileSync(absolutePath);
        const result = await OCRService.processInvoice(fileBuffer);

        console.log('\n✅ Scan Complete!');
        console.log('------------------------------------------------');
        console.log(`🧾 Extracted Text (First 100 chars): ${result.text.substring(0, 100).replace(/\n/g, ' ')}...`);
        console.log(`💰 Inferred Total:  ${result.inferredTotal ? '$' + result.inferredTotal : 'Not Found'}`);
        console.log(`📅 Inferred Date:   ${result.inferredDate || 'Not Found'}`);
        console.log(`🏢 Inferred Vendor: ${result.inferredVendor || 'Not Found'}`);
        console.log('------------------------------------------------');

    } catch (error) {
        console.error('❌ OCR Failed:', error);
        process.exit(1);
    }
}

main();
