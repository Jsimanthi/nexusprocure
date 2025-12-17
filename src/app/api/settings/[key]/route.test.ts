import { authorize } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { Permission, Role } from '@/types/auth'; // Import Enums
import { Setting } from '@prisma/client';
import { Session } from 'next-auth';
import { getServerSession } from 'next-auth/next';
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET, PUT } from './route';

// Mock dependencies
vi.mock('@/lib/prisma');
vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));
vi.mock('@/lib/auth', () => ({
  authOptions: {},
}));
vi.mock('@/lib/auth-utils');

const mockAdminSession: Session = {
  user: { id: 'admin-id', name: 'Admin', email: 'admin@test.com', permissions: [Permission.MANAGE_SETTINGS], role: { id: 'role-1', name: Role.ADMINISTRATOR } },
  expires: '2099-01-01T00:00:00.000Z',
};

const mockUserSession: Session = {
  user: { id: 'user-id', name: 'User', email: 'user@test.com', permissions: [], role: { id: 'role-2', name: Role.MANAGER } },
  expires: '2099-01-01T00:00:00.000Z',
};

describe('GET /api/settings/[key]', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should return a setting if found', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockAdminSession);
    vi.mocked(authorize).mockReturnValue(true);

    const mockSetting: Setting = {
      id: '1',
      key: 'site_name',
      value: 'NexusProcure',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    vi.mocked(prisma.setting.findUnique).mockResolvedValue(mockSetting);

    const response = await GET(new Request('http://a/b') as NextRequest, { params: Promise.resolve({ key: 'site_name' }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(mockSetting);
  });

  it('should return 404 if setting is not found', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockAdminSession);
    vi.mocked(authorize).mockReturnValue(true);
    vi.mocked(prisma.setting.findUnique).mockResolvedValue(null);

    const response = await GET(new Request('http://a/b') as NextRequest, { params: Promise.resolve({ key: 'not_found' }) });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe('Setting not found');
  });

  it('should return 403 if user is not authorized', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockUserSession);
    vi.mocked(authorize).mockImplementation(() => { throw new Error('Not authorized'); });

    const response = await GET(new Request('http://a/b') as NextRequest, { params: Promise.resolve({ key: 'any_key' }) });
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe('Forbidden');
  });
});

describe('PUT /api/settings/[key]', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should update a setting successfully for an admin', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockAdminSession);
    vi.mocked(authorize).mockReturnValue(true);

    const updatedSetting: Setting = {
      id: '1',
      key: 'site_name',
      value: 'New Name',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    vi.mocked(prisma.setting.upsert).mockResolvedValue(updatedSetting);

    const req = new Request('http://a/b', {
      method: 'PUT',
      body: JSON.stringify({ value: 'New Name' })
    }) as NextRequest;

    const response = await PUT(req, { params: Promise.resolve({ key: 'site_name' }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(updatedSetting);
    expect(prisma.setting.upsert).toHaveBeenCalledWith({
      where: { key: 'site_name' },
      update: { value: 'New Name' },
      create: { key: 'site_name', value: 'New Name' },
    });
  });

  it('should return 403 Forbidden if user is not authorized', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockUserSession);
    vi.mocked(authorize).mockImplementation(() => { throw new Error('Not authorized'); });


    const req = new Request('http://a/b', {
      method: 'PUT',
      body: JSON.stringify({ value: 'Forbidden Update' })
    }) as NextRequest;

    const response = await PUT(req, { params: Promise.resolve({ key: 'site_name' }) });
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe('Forbidden');
  });

  it('should return 400 if value is not a string', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockAdminSession);
    vi.mocked(authorize).mockReturnValue(true);

    const req = new Request('http://a/b', {
      method: 'PUT',
      body: JSON.stringify({ value: 12345 }) // Invalid value type
    }) as NextRequest;

    const response = await PUT(req, { params: Promise.resolve({ key: 'site_name' }) });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('Value must be a string');
  });
});