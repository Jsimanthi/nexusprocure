import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PUT } from './route';
import { prisma } from '@/lib/prisma';
import { Session } from 'next-auth';
import { Role, Permission } from '@prisma/client';
import { DeepMockProxy } from 'vitest-mock-extended';

vi.mock('@/lib/prisma');
vi.mock('@/lib/auth-server', () => ({
  auth: vi.fn(),
}));
vi.mock('@/lib/auth-utils', () => ({
  authorize: vi.fn(),
}));

const mockSession: Session = {
  user: { id: '1', name: 'Test User', email: 'test@example.com' },
  expires: '2025-01-01T00:00:00.000Z',
};

const mockRole: Role & { permissions: { permission: Permission }[] } = {
    id: '1',
    name: 'ADMIN',
    permissions: [],
    createdAt: new Date(),
    updatedAt: new Date(),
};

describe('GET /api/roles/[id]', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should return a role successfully', async () => {
    const { auth } = await import('@/lib/auth-server');
    const { authorize } = await import('@/lib/auth-utils');
    vi.mocked(auth).mockResolvedValue(mockSession);
    vi.mocked(authorize).mockReturnValue(true);
    vi.mocked(prisma.role.findUnique).mockResolvedValue(mockRole);

    const response = await GET({} as Request, { params: { id: '1' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.name).toBe('ADMIN');
  });

  it('should return 404 if role not found', async () => {
    const { auth } = await import('@/lib/auth-server');
    const { authorize } = await import('@/lib/auth-utils');
    vi.mocked(auth).mockResolvedValue(mockSession);
    vi.mocked(authorize).mockReturnValue(true);
    vi.mocked(prisma.role.findUnique).mockResolvedValue(null);

    const response = await GET({} as Request, { params: { id: '1' } });
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

      vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
        return callback(mockTx);
      });
    });

    it('should update a role successfully', async () => {
      const { auth } = await import('@/lib/auth-server');
      const { authorize } = await import('@/lib/auth-utils');
      vi.mocked(auth).mockResolvedValue(mockSession);
      vi.mocked(authorize).mockReturnValue(true);

      const req = new Request('http://localhost', {
        method: 'PUT',
        body: JSON.stringify({ name: 'NEW_NAME', permissionIds: ['1', '2'] }),
      });

      const response = await PUT(req, { params: { id: '1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name).toBe('ADMIN'); // The mock returns the original name
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });
