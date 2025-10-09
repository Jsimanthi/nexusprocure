import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { getServerSession } from 'next-auth/next';
import { getAllIOMsForExport } from '@/lib/iom';
import { Session } from 'next-auth';
import { IOM, IOMItem } from '@prisma/client';
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
vi.mock('@/lib/iom');
vi.mock('@/lib/auth-utils');

const mockAdminSession: Session = {
  user: { id: 'admin-id', name: 'Admin', email: 'admin@test.com', permissions: ['READ_ALL_IOMS'], role: { id: 'admin-role', name: 'Admin' } },
  expires: '2099-01-01T00:00:00.000Z',
};

type MockUser = { name: string | null };
type MockIOM = Omit<IOM, 'preparedById' | 'requestedById' | 'reviewedById' | 'approvedById'> & {
    items: IOMItem[];
    preparedBy: MockUser;
    requestedBy: MockUser;
    reviewedBy: MockUser | null;
    approvedBy: MockUser | null;
};

describe('GET /api/iom/export', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should return 401 if user is not authenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it('should return 403 if user does not have READ_ALL_IOMS permission', async () => {
    const mockUserSession: Session = {
        user: { id: 'user-id', name: 'Test User', email: 'test@example.com', permissions: [], role: { id: 'user-role', name: 'User' } },
        expires: '2099-01-01T00:00:00.000Z',
    };
    vi.mocked(getServerSession).mockResolvedValue(mockUserSession);
    // Mock the service function to throw the specific error the catch block is looking for
    vi.mocked(getAllIOMsForExport).mockImplementation(async () => {
      throw new Error('Not authorized');
    });

    const response = await GET();
    expect(response.status).toBe(403);
  });

  it('should return a CSV file with IOM data for an authorized user', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockAdminSession);
    vi.mocked(authorize).mockReturnValue(true);
    const mockIoms: MockIOM[] = [
      {
        id: '1', iomNumber: 'IOM-001', title: 'Test IOM 1', from: 'Dept A', to: 'Dept B', subject: 'Sub 1', content: '', isUrgent: false, status: 'APPROVED', totalAmount: 100, reviewerStatus: 'APPROVED', approverStatus: 'APPROVED', pdfToken: '', createdAt: new Date('2023-01-01'), updatedAt: new Date('2023-01-01'),
        items: [{ id: 'i1', itemName: 'Item 1', quantity: 1, unitPrice: 100, totalPrice: 100, iomId: '1', description: 'desc', category: 'cat', createdAt: new Date(), updatedAt: new Date() }],
        preparedBy: { name: 'Admin' },
        requestedBy: { name: 'Admin' },
        reviewedBy: { name: 'Reviewer' },
        approvedBy: { name: 'Approver' },
      },
    ];
    vi.mocked(getAllIOMsForExport).mockResolvedValue(mockIoms as unknown as Awaited<ReturnType<typeof getAllIOMsForExport>>);

    const response = await GET() as InstanceType<typeof NextResponse>;
    const text = await response.text();
    const parsed = Papa.parse(text, { header: true });
    const firstRow = parsed.data[0] as any;

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/csv');
    expect(parsed.data).toHaveLength(1);
    expect(firstRow['IOM Number']).toBe('IOM-001');
    expect(firstRow['Title']).toBe('Test IOM 1');
    expect(firstRow['Status']).toBe('APPROVED');
    expect(firstRow['Prepared By']).toBe('Admin');
    expect(firstRow['Items']).toBe('Item 1 (Qty: 1, Price: 100)');
  });
});
