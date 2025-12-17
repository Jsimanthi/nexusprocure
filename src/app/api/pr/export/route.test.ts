import { prisma } from '@/lib/prisma';
import { Permission, Role } from '@/types/auth'; // Import Enums
import { Session } from 'next-auth';
import { getServerSession } from 'next-auth/next';
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';

vi.mock('@/lib/prisma');
vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

describe('GET /api/pr/export', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should return 401 if user is not authenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const req = new NextRequest('http://localhost:3000/api/pr/export');
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it('should return 403 if user lacks permission', async () => {
    const mockSession: Session = {
      user: { id: 'user-1', permissions: [], role: { id: 'role-1', name: Role.MANAGER } },
      expires: '2025-01-01',
    };
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    const req = new NextRequest('http://localhost:3000/api/pr/export');
    const response = await GET();
    expect(response.status).toBe(403);
  });

  it('should return 200 and CSV data if user has permission', async () => {
    const mockSession: Session = {
      user: { id: 'admin-1', permissions: [Permission.READ_ALL_PRS], role: { id: 'role-1', name: Role.ADMINISTRATOR } },
      expires: '2025-01-01',
    };
    vi.mocked(getServerSession).mockResolvedValue(mockSession);

    const mockPRs = [
      {
        id: '1',
        prNumber: 'PR-001',
        title: 'Test PR',
        status: 'APPROVED',
        totalAmount: 1000,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-02'),
      },
    ];
    vi.mocked(prisma.paymentRequest.findMany).mockResolvedValue(mockPRs as any);

    const req = new NextRequest('http://localhost:3000/api/pr/export');
    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/csv');
  });
});
