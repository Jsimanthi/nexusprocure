import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getAllIOMsForExport } from '@/lib/iom';
import Papa from 'papaparse';

type IOMExport = {
  iomNumber: string;
  title: string;
  from: string;
  to: string;
  subject: string;
  status: string;
  totalAmount: number;
  isUrgent: boolean;
  preparedBy: { name: string | null };
  requestedBy: { name: string | null };
  reviewedBy: { name: string | null } | null;
  approvedBy: { name: string | null } | null;
  createdAt: Date;
  updatedAt: Date;
  items: { itemName: string; quantity: number; unitPrice: number }[];
};

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ioms = await getAllIOMsForExport(session);

    // Flatten the data for CSV export
    const flattenedData = ioms.map((iom: IOMExport) => ({
      'IOM Number': iom.iomNumber,
      'Title': iom.title,
      'From': iom.from,
      'To': iom.to,
      'Subject': iom.subject,
      'Status': iom.status,
      'Total Amount': iom.totalAmount,
      'Is Urgent': iom.isUrgent,
      'Prepared By': iom.preparedBy.name,
      'Requested By': iom.requestedBy.name,
      'Reviewed By': iom.reviewedBy?.name || 'N/A',
      'Approved By': iom.approvedBy?.name || 'N/A',
      'Created At': iom.createdAt.toISOString(),
      'Updated At': iom.updatedAt.toISOString(),
      'Items': iom.items.map((item: { itemName: string; quantity: number; unitPrice: number }) => `${item.itemName} (Qty: ${item.quantity}, Price: ${item.unitPrice})`).join('; '),
    }));

    const csv = Papa.unparse(flattenedData);

    const headers = new Headers();
    headers.set('Content-Type', 'text/csv');
    headers.set('Content-Disposition', `attachment; filename="ioms-export-${new Date().toISOString()}.csv"`);

    return new NextResponse(csv, { status: 200, headers });

  } catch (error) {
    console.error('Error exporting IOMs:', error);
    if (error instanceof Error && error.message.includes('Not authorized')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}