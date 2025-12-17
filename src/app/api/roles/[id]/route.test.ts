import { authorize } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { Role as AuthRole } from '@/types/auth';
import { Permission as PrismaPermission, Role as PrismaRole } from '@prisma/client';
import { Session } from 'next-auth';
import { getServerSession } from 'next-auth/next';
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DeepMockProxy } from 'vitest-mock-extended';
import { GET, PUT } from './route';

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
  user: { id: '1', name: 'Test User', email: 'test@example.com', permissions: [], role: { id: '1', name: AuthRole.ADMINISTRATOR } },
  expires: '2025-01-01T00:00:00.000Z',
};

const mockRole: PrismaRole & { permissions: { permission: PrismaPermission }[] } = {
  id: '1',
  name: 'ADMIN',
  permissions: [],
  createdAt: new Date(),
  updatedAt: new Date(),
} as PrismaRole & { permissions: { permission: PrismaPermission }[] };

describe('GET /api/roles/[id]', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should return a role successfully', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    vi.mocked(authorize).mockReturnValue(true);
    vi.mocked(prisma.role.findUnique).mockResolvedValue(mockRole);

    const response = await GET({} as NextRequest, { params: Promise.resolve({ id: '1' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.name).toBe('ADMIN');
  });

  it('should return 404 if role not found', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    vi.mocked(authorize).mockReturnValue(true);
    vi.mocked(prisma.role.findUnique).mockResolvedValue(null);

    const response = await GET({} as NextRequest, { params: Promise.resolve({ id: '1' }) });
    expect(response.status).toBe(404);
  });
});

describe('PUT /api/roles/[id]', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    const mockTx = {
      role: { update: vi.fn().mockResolvedValue(mockRole) },
      permissionsOnRoles: {
        deleteMany: vi.fn(),
        createMany: vi.fn(),
      },
    } as unknown as DeepMockProxy<typeof prisma>;

    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
      return callback(mockTx);
    });
  });

  it('should update a role successfully', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    vi.mocked(authorize).mockReturnValue(true);

    const req = new NextRequest('http://localhost', {
      method: 'PUT',
      body: JSON.stringify({ name: 'NEW_NAME', permissionIds: ['1', '2'] }),
    });

    const response = await PUT(req, { params: Promise.resolve({ id: '1' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.name).toBe('ADMIN'); // The mock returns the original name
    expect(prisma.$transaction).toHaveBeenCalled();
  });
});
