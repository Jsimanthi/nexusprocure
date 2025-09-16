import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { auth } from '@/lib/auth-config';
import { authorize } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';
import { Session } from 'next-auth';

// Mock dependencies
vi.mock('@/lib/auth-config', () => ({ auth: vi.fn() }));
vi.mock('@/lib/auth-utils', () => ({ authorize: vi.fn() }));
vi.mock('@/lib/prisma');

const mockUserSession = (hasPermission: boolean): Session => ({
  user: {
    id: 'user-id',
    name: 'Test User',
    email: 'test@example.com',
    permissions: hasPermission ? ['MANAGE_USERS'] : ['SOME_OTHER_PERMISSION'],
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

  it('should return 403 if user lacks MANAGE_USERS permission', async () => {
    const session = mockUserSession(false);
    vi.mocked(auth).mockResolvedValue(session);
    const authError = new Error('Not authorized. Missing required permission: MANAGE_USERS');
    vi.mocked(authorize).mockImplementation(() => {
      throw authError;
    });

    const request = {} as NextRequest;
    const context = mockContext('MANAGER');

    const response = await GET(request, context);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toContain('Not authorized');
    expect(authorize).toHaveBeenCalledWith(session, 'MANAGE_USERS');
  });

  it('should return 200 and a list of users if user has permission', async () => {
    const session = mockUserSession(true);
    vi.mocked(auth).mockResolvedValue(session);
    vi.mocked(authorize).mockReturnValue(true);
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
