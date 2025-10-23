import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { getServerSession } from 'next-auth/next';
import { getAllVendorsForExport } from '@/lib/vendor';
import { Session } from 'next-auth';
import { Vendor } from '@prisma/client';
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
vi.mock('@/lib/vendor');
vi.mock('@/lib/auth-utils');

const mockAdminSession: Session = {
  user: { id: 'admin-id', name: 'Admin', email: 'admin@test.com', permissions: ['MANAGE_VENDORS'], role: { id: 'role-1', name: 'Admin' } },
  expires: '2099-01-01T00:00:00.000Z',
};

describe('GET /api/vendors/export', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should return 401 if user is not authenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it('should return a CSV file with vendor data for an authorized user', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockAdminSession);
    vi.mocked(authorize).mockReturnValue(true);
    const mockVendors: Vendor[] = [
      {
        id: '1', name: 'Test Vendor', email: 'vendor@test.com', phone: '12345', address: '123 Test St',
        contactInfo: 'Test Contact', taxId: 'GST123', website: 'https://test.com', currency: 'USD',
        onTimeDeliveryRate: 95.5, averageQualityScore: 4.8,
        createdAt: new Date('2023-01-01'), updatedAt: new Date('2023-01-01'),
      },
    ];
    vi.mocked(getAllVendorsForExport).mockResolvedValue(mockVendors);

    const response = await GET() as unknown as InstanceType<typeof NextResponse>;
    const text = await response.text();
    const parsed = Papa.parse(text, { header: true });


    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/csv');
    expect(response.headers.get('Content-Disposition')).toContain('attachment; filename="vendors-export-');

    expect(parsed.data).toHaveLength(1);
    const data = parsed.data[0] as Record<string, string>;
    expect(data['Name']).toBe('Test Vendor');
    expect(data['Email']).toBe('vendor@test.com');
    expect(data['On-Time Delivery Rate (%)']).toBe('95.50');
    expect(data['Average Quality Score']).toBe('4.80');
  });
});