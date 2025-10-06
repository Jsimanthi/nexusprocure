import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { prisma } from '@/lib/prisma';
import { Session } from 'next-auth';
import { Permission } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authorize } from '@/lib/auth-utils';

vi.mock('@/lib/prisma');
vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));
vi.mock('@/lib/auth', () => ({
  authOptions: {},
}));
vi.mock('@/lib/auth-utils', () => ({
  authorize: vi.fn(),
}));


const mockSession: Session = {
  user: { id: '1', name: 'Test User', email: 'test@example.com' },
  expires: '2025-01-01T00:00:00.000Z',
};

describe('GET /api/permissions', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should return a list of permissions successfully', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    vi.mocked(authorize).mockReturnValue(true);
    const mockPermissions: Permission[] = [{ id: '1', name: 'TEST_PERMISSION', description: 'A test permission' }];
    vi.mocked(prisma.permission.findMany).mockResolvedValue(mockPermissions);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockPermissions);
    expect(vi.mocked(authorize)).toHaveBeenCalledWith(mockSession, 'MANAGE_ROLES');
  });

  it('should return 401 for unauthenticated users', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const response = await GET();
    expect(response.status).toBe(401);
  });

  it('should return 403 for unauthorized users', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    vi.mocked(authorize).mockImplementation(() => {
      throw new Error('Not authorized');
    });

    const response = await GET();
    expect(response.status).toBe(403);
  });
});