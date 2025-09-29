import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-config';
import { authorize } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import Papa from 'papaparse';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Assuming a general export permission is required
    authorize(session, 'EXPORT_DATA');

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    if (!type) {
      return NextResponse.json({ error: 'Export type is required' }, { status: 400 });
    }

    switch (type) {
      case 'purchase-orders':
        const pos = await prisma.purchaseOrder.findMany({
          include: {
            preparedBy: true,
            vendor: true,
            items: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

        const dataToExport = pos.flatMap(po =>
          po.items.map(item => ({
            'PO Number': po.poNumber,
            'PO Title': po.title,
            'PO Status': po.status,
            'Department': po.department,
            'Vendor Name': po.vendor?.name,
            'Prepared By': po.preparedBy.name,
            'Created At': po.createdAt.toISOString().split('T')[0],
            'Expected Delivery': po.expectedDeliveryDate?.toISOString().split('T')[0],
            'Fulfilled At': po.fulfilledAt?.toISOString().split('T')[0],
            'Item Name': item.itemName,
            'Item Category': item.category,
            'Item Quantity': item.quantity,
            'Item Unit Price': item.unitPrice,
            'Item Total Price': item.totalPrice,
            'Grand Total': po.grandTotal,
          }))
        );

        const csv = Papa.unparse(dataToExport);

        return new NextResponse(csv, {
          status: 200,
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="purchase-orders-${new Date().toISOString()}.csv"`,
          },
        });
      default:
        return NextResponse.json({ error: 'Invalid export type' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error exporting data:', error);
    if (error instanceof Error && error.message.includes('Not authorized')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}