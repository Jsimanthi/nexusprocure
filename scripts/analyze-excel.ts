
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';

async function main() {
    const filePath = 'Purchase Order SBLT-IT.xlsm';
    const absolutePath = path.resolve(filePath);

    if (!fs.existsSync(absolutePath)) {
        console.error(`❌ File not found: ${absolutePath}`);
        process.exit(1);
    }

    console.log(`📖 Reading ${filePath}...`);
    try {
        const buffer = fs.readFileSync(absolutePath);
        const workbook = XLSX.read(buffer, { type: 'buffer' });

        console.log('--- SHEETS FOUND ---');
        console.log(workbook.SheetNames);

        const firstSheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheetName];

        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

        console.log(`\n--- DATA PREVIEW (${firstSheetName}) ---`);

        // Find header row
        let headerRowIndex = -1;
        for (let i = 0; i < jsonData.length; i++) {
            const rowStr = jsonData[i].join(' ').toLowerCase();
            if (rowStr.includes('description') || rowStr.includes('particulars')) {
                headerRowIndex = i;
                console.log(`FOUND HEADER AT ROW ${i}:`, jsonData[i]);
                // Print indices
                jsonData[i].forEach((col, idx) => console.log(`   Col ${idx}: ${col}`));
                break;
            }
        }

        if (headerRowIndex > -1) {
            console.log(`\n=== HEADER ROW (Row ${headerRowIndex}) ===`);
            jsonData[headerRowIndex].forEach((col, idx) => console.log(`[${idx}] ${col}`));

            console.log(`\n=== DATA ROW 1 (Row ${headerRowIndex + 1}) ===`);
            const row1 = jsonData[headerRowIndex + 1];
            if (row1) row1.forEach((col, idx) => console.log(`[${idx}] ${col}  (Type: ${typeof col})`));

            console.log(`\n=== DATA ROW 2 (Row ${headerRowIndex + 2}) ===`);
            const row2 = jsonData[headerRowIndex + 2];
            if (row2) row2.forEach((col, idx) => console.log(`[${idx}] ${col}  (Type: ${typeof col})`));
        } else {
            console.log('❌ Could not find header row (Description/Particulars)');
            console.log(jsonData.slice(0, 15)); // Print raw top rows
        }

    } catch (error) {
        console.error('❌ Failed to read Excel:', error);
    }
}

main();
