import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { getServerSession } from 'next-auth/next';
import { getAllPRsForExport } from '@/lib/pr';
import { Session } from 'next-auth';
import { PaymentRequest, PaymentMethod } from '@prisma/client';
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
vi.mock('@/lib/pr');
vi.mock('@/lib/auth-utils');

const mockAdminSession: Session = {
  user: { id: 'admin-id', name: 'Admin', email: 'admin@test.com', permissions: ['READ_ALL_PRS'], role: { id: 'admin-role', name: 'Admin' } },
  expires: '2099-01-01T00:00:00.000Z',
};

type MockUser = { name: string | null };
type MockPO = { poNumber: string | null };

type MockPR = Omit<PaymentRequest, 'preparedById' | 'requestedById' | 'reviewedById' | 'approvedById' | 'poId'> & {
    preparedBy: MockUser;
    requestedBy: MockUser;
    reviewedBy: MockUser | null;
    approvedBy: MockUser | null;
    po: MockPO | null;
};

describe('GET /api/pr/export', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should return 401 if user is not authenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it('should return a CSV file with PR data for an authorized user', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockAdminSession);
    vi.mocked(authorize).mockReturnValue(true);
    const mockPRs: MockPR[] = [
      {
        id: '1', prNumber: 'PR-001', title: 'Test PR 1', status: 'APPROVED', grandTotal: 110, currency: 'USD',
        paymentTo: 'Test Vendor', purpose: 'Test Purpose', paymentMethod: PaymentMethod.BANK_TRANSFER, paymentDate: new Date('2023-01-01'),
        createdAt: new Date('2023-01-01'), updatedAt: new Date('2023-01-01'), pdfToken: '', reviewerStatus: 'APPROVED', approverStatus: 'APPROVED', bankAccount: null, referenceNumber: null,
        preparedBy: { name: 'Admin' },
        requestedBy: { name: 'Admin' },
        reviewedBy: { name: 'Reviewer' },
        approvedBy: { name: 'Approver' },
        po: { poNumber: 'PO-001' },
        totalAmount: 100, taxAmount: 10, exchangeRate: 1,
      },
    ];
    vi.mocked(getAllPRsForExport).mockResolvedValue(mockPRs as unknown as Awaited<ReturnType<typeof getAllPRsForExport>>);

    const response = await GET() as unknown as InstanceType<typeof NextResponse>;
    const text = await response.text();
    const parsed = Papa.parse(text, { header: true });
    const firstRow = parsed.data[0] as Record<string, string>;

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/csv');
    expect(response.headers.get('Content-Disposition')).toContain('attachment; filename="payment-requests-export-');

    expect(parsed.data).toHaveLength(1);
    expect(firstRow['PR Number']).toBe('PR-001');
    expect(firstRow['Title']).toBe('Test PR 1');
    expect(firstRow['Status']).toBe('APPROVED');
    expect(firstRow['Payment To']).toBe('Test Vendor');
    expect(firstRow['Grand Total']).toBe('110');
    expect(firstRow['PO Number']).toBe('PO-001');
  });
});
