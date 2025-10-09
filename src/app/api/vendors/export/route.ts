import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getAllVendorsForExport } from '@/lib/vendor';
import Papa from 'papaparse';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const vendors = await getAllVendorsForExport(session);

    // Flatten the data for CSV export
    const flattenedData = vendors.map(vendor => ({
      'Name': vendor.name,
      'Email': vendor.email,
      'Phone': vendor.phone,
      'Contact Info': vendor.contactInfo,
      'Address': vendor.address,
      'Tax ID': vendor.taxId || 'N/A',
      'Website': vendor.website || 'N/A',
      'Currency': vendor.currency,
      'On-Time Delivery Rate (%)': vendor.onTimeDeliveryRate.toFixed(2),
      'Average Quality Score': vendor.averageQualityScore.toFixed(2),
      'Created At': vendor.createdAt.toISOString(),
    }));

    const csv = Papa.unparse(flattenedData);

    const headers = new Headers();
    headers.set('Content-Type', 'text/csv');
    headers.set('Content-Disposition', `attachment; filename="vendors-export-${new Date().toISOString()}.csv"`);

    return new NextResponse(csv, { status: 200, headers });

  } catch (error) {
    console.error('Error exporting vendors:', error);
    if (error instanceof Error && error.message.includes('Not authorized')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}