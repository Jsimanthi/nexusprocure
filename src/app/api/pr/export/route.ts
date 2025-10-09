import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getAllPRsForExport } from '@/lib/pr';
import Papa from 'papaparse';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const prs = await getAllPRsForExport(session);

    // Flatten the data for CSV export
    const flattenedData = prs.map(pr => ({
      'PR Number': pr.prNumber,
      'Title': pr.title,
      'Status': pr.status,
      'Payment To': pr.paymentTo,
      'Purpose': pr.purpose,
      'Payment Method': pr.paymentMethod,
      'Total Amount': pr.totalAmount,
      'Tax Amount': pr.taxAmount,
      'Grand Total': pr.grandTotal,
      'Currency': pr.currency,
      'PO Number': pr.po?.poNumber || 'N/A',
      'Prepared By': pr.preparedBy.name,
      'Requested By': pr.requestedBy.name,
      'Reviewed By': pr.reviewedBy?.name || 'N/A',
      'Approved By': pr.approvedBy?.name || 'N/A',
      'Created At': pr.createdAt.toISOString(),
      'Updated At': pr.updatedAt.toISOString(),
      'Payment Date': pr.paymentDate.toISOString(),
    }));

    const csv = Papa.unparse(flattenedData);

    const headers = new Headers();
    headers.set('Content-Type', 'text/csv');
    headers.set('Content-Disposition', `attachment; filename="payment-requests-export-${new Date().toISOString()}.csv"`);

    return new NextResponse(csv, { status: 200, headers });

  } catch (error) {
    console.error('Error exporting PRs:', error);
    if (error instanceof Error && error.message.includes('Not authorized')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}