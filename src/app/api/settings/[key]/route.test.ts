import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PUT } from './route';
import { prisma } from '@/lib/prisma';
import { Session } from 'next-auth';
import { NextRequest } from 'next/server';
import { Setting } from '@prisma/client';
import { authorize } from '@/lib/auth-utils';

// Mock dependencies
vi.mock('@/lib/prisma');
vi.mock('@/lib/auth-config', () => ({
  auth: vi.fn(),
}));
vi.mock('@/lib/auth-utils');

const mockAdminSession: Session = {
  user: { id: 'admin-id', name: 'Admin', email: 'admin@test.com', permissions: ['MANAGE_SETTINGS'] },
  expires: '2099-01-01T00:00:00.000Z',
};

const mockUserSession: Session = {
    user: { id: 'user-id', name: 'User', email: 'user@test.com', permissions: [] },
    expires: '2099-01-01T00:00:00.000Z',
};

describe('GET /api/settings/[key]', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should return a setting if found', async () => {
    const { auth } = await import('@/lib/auth-config');
    vi.mocked(auth).mockResolvedValue(mockAdminSession);
    vi.mocked(authorize).mockReturnValue(true);

    const mockSetting: Setting = {
        id: '1',
        key: 'site_name',
        value: 'NexusProcure',
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    vi.mocked(prisma.setting.findUnique).mockResolvedValue(mockSetting);

    const response = await GET(new Request('http://a/b') as NextRequest, { params: { key: 'site_name' } });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(JSON.parse(JSON.stringify(mockSetting)));
  });

  it('should return 404 if setting is not found', async () => {
    const { auth } = await import('@/lib/auth-config');
    vi.mocked(auth).mockResolvedValue(mockAdminSession);
    vi.mocked(authorize).mockReturnValue(true);
    vi.mocked(prisma.setting.findUnique).mockResolvedValue(null);

    const response = await GET(new Request('http://a/b') as NextRequest, { params: { key: 'not_found' } });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe('Setting not found');
  });

  it('should return 403 if user is not authorized', async () => {
    const { auth } = await import('@/lib/auth-config');
    vi.mocked(auth).mockResolvedValue(mockUserSession);
    vi.mocked(authorize).mockImplementation(() => { throw new Error('Not authorized'); });

    const response = await GET(new Request('http://a/b') as NextRequest, { params: { key: 'any_key' } });
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
        const { auth } = await import('@/lib/auth-config');
        vi.mocked(auth).mockResolvedValue(mockAdminSession);
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

        const response = await PUT(req, { params: { key: 'site_name' } });
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body).toEqual(JSON.parse(JSON.stringify(updatedSetting)));
        expect(prisma.setting.upsert).toHaveBeenCalledWith({
            where: { key: 'site_name' },
            update: { value: 'New Name' },
            create: { key: 'site_name', value: 'New Name' },
        });
    });

    it('should return 403 Forbidden if user is not authorized', async () => {
        const { auth } = await import('@/lib/auth-config');
        vi.mocked(auth).mockResolvedValue(mockUserSession);
        vi.mocked(authorize).mockImplementation(() => { throw new Error('Not authorized'); });


        const req = new Request('http://a/b', {
            method: 'PUT',
            body: JSON.stringify({ value: 'Forbidden Update' })
        }) as NextRequest;

        const response = await PUT(req, { params: { key: 'site_name' } });
        const body = await response.json();

        expect(response.status).toBe(403);
        expect(body.error).toBe('Forbidden');
    });

    it('should return 400 if value is not a string', async () => {
        const { auth } = await import('@/lib/auth-config');
        vi.mocked(auth).mockResolvedValue(mockAdminSession);
        vi.mocked(authorize).mockReturnValue(true);

        const req = new Request('http://a/b', {
            method: 'PUT',
            body: JSON.stringify({ value: 12345 }) // Invalid value type
        }) as NextRequest;

        const response = await PUT(req, { params: { key: 'site_name' } });
        const body = await response.json();

        expect(response.status).toBe(400);
        expect(body.error).toBe('Value must be a string');
    });
});