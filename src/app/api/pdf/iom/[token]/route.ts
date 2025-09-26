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

    const iom = await prisma.iOM.findUnique({
      where: { pdfToken: token },
    });

    if (!iom) {
      return new NextResponse('IOM not found', { status: 404 });
    }

    // Construct the URL to the printable page
    const url = `${process.env.NEXT_PUBLIC_APP_URL}/print/iom/${iom.id}`;

    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();

    // Go to the URL and wait for the page to be fully loaded
    await page.goto(url, { waitUntil: 'networkidle0' });

    // Generate the PDF
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

    // Return the PDF as a response
    return new NextResponse(pdfBlob, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="IOM-${iom.iomNumber}.pdf"`,
      },
    });

  } catch (error) {
    console.error('Failed to generate PDF:', error);
    return new NextResponse('Failed to generate PDF', { status: 500 });
  }
}