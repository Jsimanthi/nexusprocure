import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getAllPOsForExport } from '@/lib/po';
import Papa from 'papaparse';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pos = await getAllPOsForExport(session);

    // Flatten the data for CSV export
    const flattenedData = pos.map((po: any) => ({
      'PO Number': po.poNumber,
      'Title': po.title,
      'Status': po.status,
      'Vendor Name': po.vendor?.name || po.vendorName,
      'Total Amount': po.totalAmount,
      'Tax Amount': po.taxAmount,
      'Grand Total': po.grandTotal,
      'Currency': po.currency,
      'Prepared By': po.preparedBy.name,
      'Requested By': po.requestedBy.name,
      'Reviewed By': po.reviewedBy?.name || 'N/A',
      'Approved By': po.approvedBy?.name || 'N/A',
      'IOM Number': po.iom?.iomNumber || 'N/A',
      'Created At': po.createdAt.toISOString(),
      'Updated At': po.updatedAt.toISOString(),
      'Expected Delivery': po.expectedDeliveryDate?.toISOString() || 'N/A',
      'Fulfilled At': po.fulfilledAt?.toISOString() || 'N/A',
      'Quality Score': po.qualityScore || 'N/A',
      'Items': po.items.map((item: any) => `${item.itemName} (Qty: ${item.quantity}, Price: ${item.unitPrice})`).join('; '),
    }));

    const csv = Papa.unparse(flattenedData);

    const headers = new Headers();
    headers.set('Content-Type', 'text/csv');
    headers.set('Content-Disposition', `attachment; filename="purchase-orders-export-${new Date().toISOString()}.csv"`);

    return new NextResponse(csv, { status: 200, headers });

  } catch (error) {
    console.error('Error exporting POs:', error);
    if (error instanceof Error && error.message.includes('Not authorized')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}