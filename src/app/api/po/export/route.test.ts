import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { getServerSession } from 'next-auth/next';
import { getAllPOsForExport } from '@/lib/po';
import { Session } from 'next-auth';
import { PurchaseOrder, POItem } from '@prisma/client';
import { NextResponse } from 'next/server';
import { authorize } from '@/lib/auth-utils';
import Papa from 'papaparse';

// Mock dependencies
vi.mock('next/server', () => import('@/lib/__mocks__/next-response'));
vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));
vi.mock('@/lib/auth', () => ({
  authOptions: {},
}));
vi.mock('@/lib/po');
vi.mock('@/lib/auth-utils');


const mockAdminSession: Session = {
  user: { id: 'admin-id', name: 'Admin', email: 'admin@test.com', permissions: ['READ_ALL_POS'] },
  expires: '2099-01-01T00:00:00.000Z',
};

type MockUser = { name: string | null };
type MockVendor = { name: string | null };
type MockIOM = { iomNumber: string | null };

type MockPO = Omit<PurchaseOrder, 'preparedById' | 'requestedById' | 'reviewedById' | 'approvedById' | 'vendorId' | 'iomId'> & {
    items: POItem[];
    preparedBy: MockUser;
    requestedBy: MockUser;
    reviewedBy: MockUser | null;
    approvedBy: MockUser | null;
    vendor: MockVendor | null;
    iom: MockIOM | null;
};

describe('GET /api/po/export', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should return 401 if user is not authenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it('should return a CSV file with PO data for an authorized user', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockAdminSession);
    vi.mocked(authorize).mockReturnValue(true);
    const mockPOs: MockPO[] = [
      {
        id: '1', poNumber: 'PO-001', title: 'Test PO 1', status: 'APPROVED', totalAmount: 100, taxAmount: 10, grandTotal: 110, currency: 'USD',
        vendorName: 'Test Vendor', vendorAddress: '', vendorContact: '', companyName: '', companyAddress: '', companyContact: '', taxRate: 10,
        expectedDeliveryDate: new Date('2023-01-10'), fulfilledAt: null, qualityScore: null, deliveryNotes: null,
        createdAt: new Date('2023-01-01'), updatedAt: new Date('2023-01-01'), pdfToken: '', reviewerStatus: 'APPROVED', approverStatus: 'APPROVED',
        items: [{ id: 'i1', itemName: 'Item 1', quantity: 1, unitPrice: 100, totalPrice: 110, poId: '1', description: null, category: 'Test', taxRate: 10, taxAmount: 10, createdAt: new Date(), updatedAt: new Date() }],
        preparedBy: { name: 'Admin' },
        requestedBy: { name: 'Admin' },
        reviewedBy: { name: 'Reviewer' },
        approvedBy: { name: 'Approver' },
        vendor: { name: 'Test Vendor' },
        iom: { iomNumber: 'IOM-001' },
      },
    ];
    vi.mocked(getAllPOsForExport).mockResolvedValue(mockPOs as unknown as Awaited<ReturnType<typeof getAllPOsForExport>>);

    const response = await GET() as unknown as InstanceType<typeof NextResponse>;
    const text = await response.text();
    const parsed = Papa.parse(text, { header: true });

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/csv');
    expect(response.headers.get('Content-Disposition')).toContain('attachment; filename="purchase-orders-export-');

    expect(parsed.data).toHaveLength(1);
    expect(parsed.data[0]['PO Number']).toBe('PO-001');
    expect(parsed.data[0]['Title']).toBe('Test PO 1');
    expect(parsed.data[0]['Status']).toBe('APPROVED');
    expect(parsed.data[0]['Vendor Name']).toBe('Test Vendor');
    expect(parsed.data[0]['Grand Total']).toBe('110');
    expect(parsed.data[0]['Items']).toBe('Item 1 (Qty: 1, Price: 100)');
  });
});