import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { prisma } from '@/lib/prisma';
import { Session } from 'next-auth';
import { User } from '@prisma/client';

vi.mock('@/lib/prisma');
vi.mock('@/lib/auth-config', () => ({
  auth: vi.fn(),
}));
vi.mock('@/lib/auth-utils', () => ({
  authorize: vi.fn(),
}));

const mockSession: Session = {
  user: { id: '1', name: 'Test User', email: 'test@example.com' },
  expires: '2025-01-01T00:00:00.000Z',
};

describe('POST /api/users', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  const mockUser: User = {
    id: '1',
    name: 'Test User',
    email: 'test@example.com',
    password: 'hashedpassword',
    roleId: 'clxmil0n500003b6le21w24g0',
    departmentId: 'clxmil0n500003b6le21w24d0',
    emailVerified: null,
    image: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const createUserData = {
    name: 'Test User',
    email: 'test@example.com',
    password: 'password123',
    roleId: 'clxmil0n500003b6le21w24g0',
    departmentId: 'clxmil0n500003b6le21w24d0',
  }

  it('should create a new user successfully', async () => {
    const { auth } = await import('@/lib/auth-config');
    const { authorize } = await import('@/lib/auth-utils');

    vi.mocked(auth).mockResolvedValue(mockSession);
    vi.mocked(authorize).mockReturnValue(true);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue(mockUser);

    const req = new Request('http://localhost/api/users', {
      method: 'POST',
      body: JSON.stringify(createUserData),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.name).toBe(mockUser.name);
    expect(vi.mocked(authorize)).toHaveBeenCalledWith(expect.any(Object), 'MANAGE_USERS');
    expect(vi.mocked(prisma.user.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: createUserData.name }),
      })
    );
  });

  it('should return 409 if user already exists', async () => {
    const { auth } = await import('@/lib/auth-config');
    const { authorize } = await import('@/lib/auth-utils');
    vi.mocked(auth).mockResolvedValue(mockSession);
    vi.mocked(authorize).mockReturnValue(true);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);

    const req = new Request('http://localhost/api/users', {
      method: 'POST',
      body: JSON.stringify(createUserData),
    });

    const response = await POST(req);
    expect(response.status).toBe(409);
  });

  it('should return 400 for invalid data', async () => {
    const { auth } = await import('@/lib/auth-config');
    const { authorize } = await import('@/lib/auth-utils');
    vi.mocked(auth).mockResolvedValue(mockSession);
    vi.mocked(authorize).mockReturnValue(true);

    const req = new Request('http://localhost/api/users', {
      method: 'POST',
      body: JSON.stringify({ ...createUserData, email: 'not-an-email' }),
    });

    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it('should return 403 for unauthorized users', async () => {
    const { auth } = await import('@/lib/auth-config');
    const { authorize } = await import('@/lib/auth-utils');
    vi.mocked(auth).mockResolvedValue(mockSession);
    vi.mocked(authorize).mockImplementation(() => {
      throw new Error('Not authorized');
    });

    const req = new Request('http://localhost/api/users', {
      method: 'POST',
      body: JSON.stringify(createUserData),
    });

    const response = await POST(req);
    expect(response.status).toBe(403);
  });
});