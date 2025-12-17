
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

export interface IngestedPO {
    vendorName: string;
    items: {
        name: string;
        quantity: number;
        unitPrice: number;
        total: number;
    }[];
    totalAmount: number;
}

export interface IngestedIOM {
    iomNumber: string;
    date: string;
    from: string;
    to: string;
    subject: string;
    justification: string;
    totalAmount: number;
}

export class IngestService {
    /**
   * Parses an Excel file where EACH SHEET is a separate PO Form.
   * Format: "Vendor Name :" in one cell, value in adjacent cell.
   */
    static async parseExcelPO(buffer: Buffer): Promise<IngestedPO[]> {
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const extractedPOs: IngestedPO[] = [];
        console.log(`[Ingest] Parsing Excel with ${workbook.SheetNames.length} sheets:`, workbook.SheetNames);

        for (const sheetName of workbook.SheetNames) {
            // Skip hidden or system sheets if necessary, for now parse all
            const sheet = workbook.Sheets[sheetName];
            // Convert to array of arrays to scan by row/col
            const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

            let vendorName = "Unknown Vendor";
            const items: any[] = [];
            let totalAmount = 0;

            // 1. Scan for Header Info (Vendor)
            for (const row of rows) {
                for (let i = 0; i < row.length; i++) {
                    const cell = String(row[i]).trim();
                    // Heuristic: Look for "Vendor Name"
                    if (/Vendor Name/i.test(cell)) {
                        // Look ahead for the value (skip empty cells)
                        for (let j = i + 1; j < row.length; j++) {
                            if (row[j]) {
                                vendorName = row[j];
                                break;
                            }
                        }
                    }
                }
            }

            // 2. Scan for Items (very heuristic without strict table headers)
            // Assumption: Rows with numbers in later columns might be items
            // This is where generic "Smart" logic encounters "Kinks". 
            // For now, we'll try to find rows that look like line items (Description + Amount)
            // Or we can rely on a specific start row if known.

            // Let's look for a row containing "Description" or "Item" and then read subsequent rows
            let headerRowIndex = -1;
            for (let r = 0; r < rows.length; r++) {
                const rowStr = rows[r].join(' ').toLowerCase();
                if (rowStr.includes('description') || rowStr.includes('particulars')) {
                    headerRowIndex = r;
                    break;
                }
            }

            if (headerRowIndex > -1) {
                for (let r = headerRowIndex + 1; r < rows.length; r++) {
                    const row = rows[r];
                    if (!row || row.length === 0) continue;

                    // Get cell values safely
                    const slNo = row[0];
                    const desc = String(row[1] || '').trim();
                    const qtyVal = row[6];
                    const rateVal = row[8];
                    const amountVal = row[10];

                    const qty = typeof qtyVal === 'number' ? qtyVal : 1;
                    let unitPrice = typeof rateVal === 'number' ? rateVal : 0;
                    let lineTotal = typeof amountVal === 'number' ? amountVal : 0;

                    // User says "Amount column is the price" -> They likely mean the value in the Amount column (Col 10) 
                    // is the most reliable "Cost" indicator.
                    // If Line Total exists but Price missing, derive Price.
                    if (lineTotal > 0 && unitPrice === 0) {
                        unitPrice = lineTotal / qty;
                    }
                    // If Price exists but Line Total missing, derive Total.
                    if (unitPrice > 0 && lineTotal === 0) {
                        lineTotal = unitPrice * qty;
                    }

                    // STOP conditions
                    const lowerDesc = desc.toLowerCase();
                    // User said: "next cell to the total is the total amount"
                    // If we hit a TOTAL row, we could extract the Grand Total from here instead of summing items?
                    // For now, let's stick to summing valid items to avoid double counting tax.
                    if (lowerDesc.startsWith('total') || lowerDesc.startsWith('amount in words')) break;

                    // SKIP conditions (Tax, empty, etc)
                    if (!desc || lowerDesc.includes('gst') || lowerDesc.includes('tax') || lowerDesc.includes('output')) continue;

                    if (lineTotal > 0 || unitPrice > 0) {
                        items.push({
                            name: desc,
                            quantity: qty,
                            unitPrice: unitPrice,
                            total: lineTotal
                        });
                        totalAmount += lineTotal;
                    }
                }
            }

            // If we found a vendor or items, add to list
            if (vendorName !== "Unknown Vendor" || items.length > 0) {
                extractedPOs.push({
                    vendorName,
                    items,
                    totalAmount
                });
            }
        }

        return extractedPOs;
    }

    /**
     * Parses a Word document to extract structured IOM details.
     */
    static async parseWordIOM(buffer: Buffer): Promise<IngestedIOM> {
        const { value: rawText } = await mammoth.extractRawText({ buffer });

        // Helper: Extract value by regex
        const extract = (regex: RegExp) => {
            const match = rawText.match(regex);
            return match ? match[1].trim() : "N/A";
        };

        // 1. Meta Data
        // Fix Date: Stop at "IOM" or newline
        const date = extract(/Date\s*:\s*([\d\-./]+)/i);
        const iomNumber = extract(/IOM\s*:\s*([^\n\r]+)/i);

        // 2. Structural Extraction (From -> To -> Subject)
        // This enforces order so we don't pick up stray "To"s from earlier
        let from = "N/A";
        let to = "N/A";
        let subject = "N/A";

        // Regex Explanation:
        // From <capture> To <capture> SUB(JECT) <capture>
        const structureMatch = rawText.match(/From\s*([\s\S]*?)\s+To\s*([\s\S]*?)\s+SUB(?:JECT)?\s*:\s*([^\n\r]+)/i);

        if (structureMatch) {
            from = structureMatch[1].replace(/\n+/g, ', ').replace(/_+/g, '').trim();
            to = structureMatch[2].replace(/\n+/g, ', ').replace(/_+/g, '').trim();
            subject = structureMatch[3].trim();
        } else {
            // Fallback to loose extraction if strict structure fails
            const fromMatch = rawText.match(/From\s*([\s\S]*?)To/i);
            from = fromMatch ? fromMatch[1].replace(/\n+/g, ', ').trim() : "N/A";

            const toMatch = rawText.match(/To\s*([\s\S]*?)SUB/i);
            to = toMatch ? toMatch[1].replace(/\n+/g, ', ').trim() : "N/A";

            subject = extract(/SUB(?:JECT)?\s*:\s*([^\n\r]+)/i);
        }

        // 3. Amount
        const amountMatch = rawText.match(/(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:Rs|INR|-)/i) || rawText.match(/(?:Rs|INR)\.?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i);
        const totalAmount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : 0;

        // 4. Justification / Body
        let justification = "";
        const bodyStart = rawText.search(/Dear\s+(Sir|Madam)|Respected\s+(Sir|Madam)/i);
        if (bodyStart > -1) {
            justification = rawText.substring(bodyStart).trim();
        } else {
            const subIndex = rawText.indexOf(subject);
            if (subIndex > -1) justification = rawText.substring(subIndex + subject.length).trim();
            else justification = rawText.substring(0, 500);
        }

        return {
            iomNumber,
            date,
            from,
            to,
            subject: subject !== "N/A" ? subject : "General IOM",
            justification,
            totalAmount
        };
    }
}
