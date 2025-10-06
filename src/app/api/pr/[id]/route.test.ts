import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PATCH } from './route';
import { getServerSession } from 'next-auth/next';
import { updatePRStatus } from '@/lib/pr';
import { PRStatus, PaymentRequest as PaymentRequestType } from '@/types/pr';
import { Session } from 'next-auth';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('next/server', async (importOriginal) => {
    const mod = await importOriginal<typeof import('next/server')>();
    return {
        ...mod,
        NextResponse: {
            json: vi.fn((data, options) => {
                return {
                    json: () => Promise.resolve(data),
                    status: options?.status || 200,
                }
            }),
        },
    };
});
vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));
vi.mock('@/lib/auth', () => ({
  authOptions: {},
}));
vi.mock('@/lib/pr');


const mockUserSession = (permissions = ['APPROVE_PR']): Session => ({
  user: {
    id: 'user-id',
    name: 'Test User',
    email: 'test@example.com',
    permissions,
  },
  expires: '2099-01-01T00:00:00.000Z',
});

describe('PATCH /api/pr/[id]', () => {
  const mockSession = mockUserSession();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
  });

  it('should return 401 if user is not authenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const request = new NextRequest('http://localhost', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'APPROVE' }),
    });
    const response = await PATCH(request, { params: Promise.resolve({ id: 'pr-123' }) });
    expect(response.status).toBe(401);
  });

  it('should return 400 if action is missing', async () => {
    const request = new NextRequest('http://localhost', {
      method: 'PATCH',
      body: JSON.stringify({}), // No action
    });
    const response = await PATCH(request, { params: Promise.resolve({ id: 'pr-123' }) });
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error).toBe('Invalid action provided.');
  });

  it('should return 403 if user is not authorized by the service function', async () => {
    const authError = new Error('Not authorized');
    vi.mocked(updatePRStatus).mockRejectedValue(authError);

    const request = new NextRequest('http://localhost', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'APPROVE' }),
    });
    const response = await PATCH(request, { params: Promise.resolve({ id: 'pr-123' }) });
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toContain('Not authorized');
  });

  it('should return a generic 400 for other errors from the service function', async () => {
    const genericError = new Error('Something else went wrong');
    vi.mocked(updatePRStatus).mockRejectedValue(genericError);

    const request = new NextRequest('http://localhost', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'APPROVE' }),
    });
    const response = await PATCH(request, { params: Promise.resolve({ id: 'pr-123' }) });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe(genericError.message);
  });

  it('should successfully update the PR status and return 200', async () => {
    const updatedPr = { id: 'pr-123', status: PRStatus.APPROVED };
    vi.mocked(updatePRStatus).mockResolvedValue(updatedPr as unknown as PaymentRequestType);

    const request = new NextRequest('http://localhost', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'APPROVE' }),
    });
    const response = await PATCH(request, { params: Promise.resolve({ id: 'pr-123' }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(updatedPr);
    expect(updatePRStatus).toHaveBeenCalledWith('pr-123', 'APPROVE', mockSession);
  });
});