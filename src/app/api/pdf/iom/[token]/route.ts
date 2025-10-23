import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import pdfService from '@/lib/pdfService';

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
    const url = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/print/iom/${iom.id}`;

    // Generate the PDF using the service
    const pdfBuffer = await pdfService.generatePDF(url);

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