import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { prisma } from '@/lib/prisma';
import { Session } from 'next-auth';
import { Setting } from '@prisma/client';
import { authorize } from '@/lib/auth-utils';

// Mock dependencies
vi.mock('@/lib/prisma');
vi.mock('@/lib/auth-config', () => ({
  auth: vi.fn(),
}));
vi.mock('@/lib/auth-utils');


describe('GET /api/settings', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('should return 401 Unauthorized if user is not authenticated', async () => {
        const { auth } = await import('@/lib/auth-config');
        vi.mocked(auth).mockResolvedValue(null);

        const response = await GET();
        const body = await response.json();

        expect(response.status).toBe(401);
        expect(body.error).toBe('Unauthorized');
    });

    it('should return 403 Forbidden if user lacks MANAGE_SETTINGS permission', async () => {
        const { auth } = await import('@/lib/auth-config');
        const mockSession: Session = {
            user: { id: 'user-id', name: 'Test User', email: 'test@example.com', permissions: [] },
            expires: '2099-01-01T00:00:00.000Z',
        };
        vi.mocked(auth).mockResolvedValue(mockSession);
        vi.mocked(authorize).mockImplementation(() => { throw new Error('Not authorized'); });

        const response = await GET();
        const body = await response.json();

        expect(response.status).toBe(403);
        expect(body.error).toBe('Forbidden');
    });

    it('should return a list of settings if user is authenticated and authorized', async () => {
        const { auth } = await import('@/lib/auth-config');
        const mockSession: Session = {
            user: { id: 'admin-id', name: 'Admin', email: 'admin@test.com', permissions: ['MANAGE_SETTINGS'] },
            expires: '2099-01-01T00:00:00.000Z',
        };
        vi.mocked(auth).mockResolvedValue(mockSession);
        vi.mocked(authorize).mockReturnValue(true);

        const mockSettings: Setting[] = [
            { id: '1', key: 'setting_a', value: 'value_a', createdAt: new Date(), updatedAt: new Date() },
            { id: '2', key: 'setting_b', value: 'value_b', createdAt: new Date(), updatedAt: new Date() },
        ];
        vi.mocked(prisma.setting.findMany).mockResolvedValue(mockSettings);

        const response = await GET();
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body).toEqual(mockSettings); // Corrected assertion
        expect(prisma.setting.findMany).toHaveBeenCalledWith({
            orderBy: { key: 'asc' },
        });
    });

    it('should return 500 Internal Server Error if there is a database error', async () => {
        const { auth } = await import('@/lib/auth-config');
        const mockSession: Session = {
            user: { id: 'admin-id', name: 'Admin', email: 'admin@test.com', permissions: ['MANAGE_SETTINGS'] },
            expires: '2099-01-01T00:00:00.000Z',
        };
        vi.mocked(auth).mockResolvedValue(mockSession);
        vi.mocked(authorize).mockReturnValue(true);
        vi.mocked(prisma.setting.findMany).mockRejectedValue(new Error('Database connection failed'));

        const response = await GET();
        const body = await response.json();

        expect(response.status).toBe(500);
        expect(body.error).toBe('Internal Server Error');
    });
});