import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import puppeteer from 'puppeteer';

export async function GET(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ token: string }> }
) {
  try {
    const params = await paramsPromise;
    const token = params.token;

    if (!token) {
      return new NextResponse('Missing token', { status: 400 });
    }

    const po = await prisma.purchaseOrder.findUnique({
      where: { pdfToken: token },
    });

    if (!po) {
      return new NextResponse('Purchase Order not found', { status: 404 });
    }

    const url = `${process.env.NEXT_PUBLIC_APP_URL}/print/po/${po.id}`;

    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();

    await page.goto(url, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      }
    });

    await browser.close();

    // Create a new Blob from the pdfBuffer
    const pdfBlob = new Blob([new Uint8Array(pdfBuffer)], { type: 'application/pdf' });

    return new NextResponse(pdfBlob, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="PO-${po.poNumber}.pdf"`,
      },
    });

  } catch (error) {
    console.error('Failed to generate PDF:', error);
    return new NextResponse('Failed to generate PDF', { status: 500 });
  }
}