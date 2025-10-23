import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';
import { Session } from 'next-auth';

// Mock dependencies
vi.mock('next-auth/next', () => ({ getServerSession: vi.fn() }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma');

const mockUserSession = (): Session => ({
  user: {
    id: 'user-id',
    name: 'Test User',
    email: 'test@example.com',
    role: { id: 'role-1', name: 'User' },
    permissions: ['SOME_PERMISSION'],
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
    vi.mocked(getServerSession).mockResolvedValue(null);
    const request = {} as NextRequest;
    const context = mockContext('Manager');

    const response = await GET(request, context);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('Unauthorized');
  });

  it('should return 200 and a list of users for any authenticated user', async () => {
    const session = mockUserSession();
    vi.mocked(getServerSession).mockResolvedValue(session);
    const mockUsers = [{ id: 'user-1', name: 'Manager One', email: 'manager@example.com', emailVerified: null, image: null, roleId: 'role-1', password: null, createdAt: new Date(), updatedAt: new Date() }];
    vi.mocked(prisma.user.findMany).mockResolvedValue(mockUsers);

    const request = {} as NextRequest;
    const context = mockContext('Manager');

    const response = await GET(request, context);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(mockUsers);
    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: { role: { name: 'Manager' } },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  });
});