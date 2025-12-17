import { authOptions } from '@/lib/auth';
import { authorize } from "@/lib/auth-utils";
import logger from "@/lib/logger";
import { getAllPRsForExport } from '@/lib/pr';
import { Permission } from "@/types/auth";
import { getServerSession } from 'next-auth/next';
import { NextResponse } from 'next/server';
import Papa from 'papaparse';

type PRExport = {
  prNumber: string;
  title: string;
  status: string;
  paymentTo: string;
  purpose: string;
  paymentMethod: string;
  totalAmount: number;
  taxAmount: number;
  grandTotal: number;
  currency: string;
  po: { poNumber: string } | null;
  preparedBy: { name: string | null };
  requestedBy: { name: string | null };
  reviewedBy: { name: string | null } | null;
  approvedBy: { name: string | null } | null;
  createdAt: Date;
  updatedAt: Date;
  paymentDate: Date;
};

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission - assuming authorize helper is not used here or needs to be added
    // If not using authorize helper, we need to manually check or import it.
    // The previous code didn't show authorize usage in this file, but getAllPRsForExport likely checks it?
    // Wait, getAllPRsForExport in src/lib/pr.ts CHECKS IT internally.
    // let's check src/lib/pr.ts content again.
    // Yes, getAllPRsForExport calls authorize(session, Permission.READ_ALL_PRS).
    // So distinct authorization here might be redundant but good for explicit API security.
    authorize(session, Permission.READ_ALL_PRS);

    const prs = await getAllPRsForExport(session);

    // Flatten the data for CSV export
    const flattenedData = prs.map((pr: PRExport) => ({
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
    logger.error({ error }, 'Error exporting PRs');
    if (error instanceof Error && error.message.includes('Not authorized')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}