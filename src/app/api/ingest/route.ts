
import { IngestService } from '@/lib/ingest-service';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const type = formData.get('type') as string;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());

        let data;
        if (type === 'excel') {
            data = await IngestService.parseExcelPO(buffer);
        } else if (type === 'word') {
            data = await IngestService.parseWordIOM(buffer);
        } else {
            return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
        }

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('Ingest Error:', error);
        return NextResponse.json({ error: 'Failed to process file' }, { status: 500 });
    }
}
