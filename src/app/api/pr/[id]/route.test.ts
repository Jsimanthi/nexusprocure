import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PATCH } from './route';
import { auth } from '@/lib/auth-config';
import { updatePRStatus } from '@/lib/pr';
import { NextRequest } from 'next/server';
import { PRStatus } from '@/types/pr';
import { Session } from 'next-auth';

// Mock dependencies
vi.mock('@/lib/auth-config', () => ({
  auth: vi.fn(),
}));
vi.mock('@/lib/pr');

const mockUserSession = (roleName = 'USER'): Session => ({
  user: {
    id: 'user-id',
    name: 'Test User',
    email: 'test@example.com',
    role: { id: 'role-id', name: roleName },
  },
  expires: '2099-01-01T00:00:00.000Z',
});

const mockRequest = (body: unknown): NextRequest => {
  return {
    json: () => Promise.resolve(body),
  } as NextRequest;
};

const mockContext = (id: string) => ({
  params: Promise.resolve({ id }),
});

describe('PATCH /api/pr/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 if user is not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const request = mockRequest({});
    const context = mockContext('pr-123');

    const response = await PATCH(request, context);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('Unauthorized');
  });

  it('should return 400 for invalid status', async () => {
    const session = mockUserSession();
    vi.mocked(auth).mockResolvedValue(session);
    const request = mockRequest({ status: 'INVALID_STATUS' });
    const context = mockContext('pr-123');

    const response = await PATCH(request, context);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('Invalid status');
  });

  it('should return 400 if status and approverId are missing', async () => {
    const session = mockUserSession();
    vi.mocked(auth).mockResolvedValue(session);
    const request = mockRequest({});
    const context = mockContext('pr-123');

    const response = await PATCH(request, context);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('At least one of status or approverId is required');
  });

  it('should return 403 if user is not authorized', async () => {
    const session = mockUserSession();
    vi.mocked(auth).mockResolvedValue(session);
    const authError = new Error('Not authorized. Missing required permission: APPROVE_PR');
    vi.mocked(updatePRStatus).mockRejectedValue(authError);

    const request = mockRequest({ status: PRStatus.APPROVED });
    const context = mockContext('pr-123');

    const response = await PATCH(request, context);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toContain('Not authorized');
    expect(updatePRStatus).toHaveBeenCalledWith('pr-123', PRStatus.APPROVED, session, undefined);
  });

  it('should successfully update the PR status', async () => {
    const session = mockUserSession('MANAGER');
    vi.mocked(auth).mockResolvedValue(session);
    const updatedPr = { id: 'pr-123', status: PRStatus.APPROVED, title: 'Updated PR' };
    // @ts-expect-error - We're providing a partial mock object
    vi.mocked(updatePRStatus).mockResolvedValue(updatedPr);

    const request = mockRequest({ status: PRStatus.APPROVED });
    const context = mockContext('pr-123');

    const response = await PATCH(request, context);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(updatedPr);
    expect(updatePRStatus).toHaveBeenCalledWith('pr-123', PRStatus.APPROVED, session, undefined);
  });
});
