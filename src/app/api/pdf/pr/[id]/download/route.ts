import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth-config';
import { authorize } from '@/lib/auth-utils';
import puppeteer from 'puppeteer';

export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    authorize(session, 'READ_PR');

    const { id: prId } = await context.params;

    const pr = await prisma.paymentRequest.findUnique({
      where: { id: prId },
    });

    if (!pr) {
      return new NextResponse('Payment Request not found', { status: 404 });
    }

    const url = `${process.env.NEXT_PUBLIC_APP_URL}/print/pr/${pr.id}`;

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    const cookie = request.cookies.get(process.env.AUTH_COOKIE_NAME ?? '');
    if (cookie) {
      await page.setCookie({
        name: cookie.name,
        value: cookie.value,
        domain: new URL(url).hostname,
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
      });
    }

    await page.goto(url, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
    });

    await browser.close();

    const pdfBlob = new Blob([new Uint8Array(pdfBuffer)], { type: 'application/pdf' });

    return new NextResponse(pdfBlob, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="PR-${pr.prNumber}.pdf"`,
      },
    });

  } catch (error) {
    console.error('Failed to generate PR PDF:', error);
    if (error instanceof Error && error.message.includes('Not authorized')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return new NextResponse('Failed to generate PR PDF', { status: 500 });
  }
}