import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PUT } from './route';
import { prisma } from '@/lib/prisma';
import { Session } from 'next-auth';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/lib/prisma');
vi.mock('@/lib/auth-config', () => ({
  auth: vi.fn(),
}));

const mockAdminSession: Session = {
  user: { id: 'admin-id', name: 'Admin', email: 'admin@test.com', role: 'Administrator' },
  expires: '2099-01-01T00:00:00.000Z',
};

const mockUserSession: Session = {
    user: { id: 'user-id', name: 'User', email: 'user@test.com', role: 'User' },
    expires: '2099-01-01T00:00:00.000Z',
};

describe('GET /api/settings/[key]', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should return a setting if found', async () => {
    const { auth } = await import('@/lib/auth-config');
    vi.mocked(auth).mockResolvedValue(mockAdminSession);

    const mockSetting = { id: '1', key: 'site_name', value: 'NexusProcure' };
    vi.mocked(prisma.setting.findUnique).mockResolvedValue(mockSetting as any);

    const response = await GET(new Request('http://a/b') as NextRequest, { params: Promise.resolve({ key: 'site_name' }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(mockSetting);
  });

  it('should return 404 if setting is not found', async () => {
    const { auth } = await import('@/lib/auth-config');
    vi.mocked(auth).mockResolvedValue(mockAdminSession);
    vi.mocked(prisma.setting.findUnique).mockResolvedValue(null);

    const response = await GET(new Request('http://a/b') as NextRequest, { params: Promise.resolve({ key: 'not_found' }) });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe('Setting not found');
  });
});

describe('PUT /api/settings/[key]', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('should update a setting successfully for an admin', async () => {
        const { auth } = await import('@/lib/auth-config');
        vi.mocked(auth).mockResolvedValue(mockAdminSession);

        const updatedSetting = { id: '1', key: 'site_name', value: 'New Name' };
        vi.mocked(prisma.setting.upsert).mockResolvedValue(updatedSetting as any);

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

    it('should return 403 Forbidden if user is not an admin', async () => {
        const { auth } = await import('@/lib/auth-config');
        vi.mocked(auth).mockResolvedValue(mockUserSession);

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
        const { auth } = await import('@/lib/auth-config');
        vi.mocked(auth).mockResolvedValue(mockAdminSession);

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