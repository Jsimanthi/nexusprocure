import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { auth } from '@/lib/auth-config';
import { authorize } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';
import { Session } from 'next-auth';

// Mock dependencies
vi.mock('@/lib/auth-config', () => ({ auth: vi.fn() }));
vi.mock('@/lib/prisma');

const mockUserSession = (): Session => ({
  user: {
    id: 'user-id',
    name: 'Test User',
    email: 'test@example.com',
  },
  expires: '2099-01-01T00:00:00.000Z',
});

const mockContext = (roleName: string) => ({
  params: Promise.resolve({ roleName }),
});

describe('GET /api/users/role/:roleName', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 if user is not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const request = {} as NextRequest;
    const context = mockContext('MANAGER');

    const response = await GET(request, context);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('Unauthorized');
  });

  it('should return 200 and a list of users for any authenticated user', async () => {
    const session = mockUserSession();
    vi.mocked(auth).mockResolvedValue(session);
    const mockUsers = [{ id: 'user-1', name: 'Manager One' }];
    vi.mocked(prisma.user.findMany).mockResolvedValue(mockUsers);

    const request = {} as NextRequest;
    const context = mockContext('MANAGER');

    const response = await GET(request, context);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(mockUsers);
    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: { role: { name: 'MANAGER' } },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  });
});
