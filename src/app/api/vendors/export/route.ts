import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getAllVendorsForExport } from '@/lib/vendor';
import Papa from 'papaparse';
import logger from '@/lib/logger';

type VendorExport = {
  name: string;
  email: string;
  phone: string;
  contactInfo: string;
  address: string;
  taxId: string | null;
  website: string | null;
  currency: string;
  onTimeDeliveryRate: number;
  averageQualityScore: number;
  createdAt: Date;
};

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const vendors = await getAllVendorsForExport();

    // Flatten the data for CSV export
    const flattenedData = vendors.map((vendor: VendorExport) => ({
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
    logger.error(`Error exporting vendors: ${String(error)}`);
    if (error instanceof Error && error.message.includes('Not authorized')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}