
import fs from 'fs';
import mammoth from 'mammoth';
import path from 'path';

async function main() {
    const filePath = 'INTER OFFICE MEMO IT09122025.docx';
    const absolutePath = path.resolve(filePath);

    if (!fs.existsSync(absolutePath)) {
        console.error(`❌ File not found: ${absolutePath}`);
        process.exit(1);
    }

    console.log(`📖 Reading ${filePath}...`);
    try {
        const result = await mammoth.extractRawText({ path: absolutePath });
        console.log('--- RAW TEXT START ---');
        console.log(result.value);
        console.log('--- RAW TEXT END ---');
    } catch (error) {
        console.error('❌ Failed to read DOCX:', error);
    }
}

main();
