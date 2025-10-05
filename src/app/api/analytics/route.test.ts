import { GET } from './route';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth-config';
import { Session } from 'next-auth';

// Mock dependencies
vi.mock('@/lib/auth-config', () => ({
  auth: vi.fn(),
}));
vi.mock('@/lib/prisma');

// A utility type to make all properties of a type optional recursively
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends (infer U)[]
    ? DeepPartial<U>[]
    : T[P] extends object
    ? DeepPartial<T[P]>
    : T[P];
};

// Define a type for our mock session to avoid using 'any'
type MockSession = DeepPartial<Session> & {
  user?: {
    id?: string;
    permissions?: string[];
  };
};

describe('GET /api/analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 if user is not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it('should return 403 if user does not have VIEW_ANALYTICS permission', async () => {
    const mockSession: MockSession = {
      user: { id: 'user-1', permissions: [] },
    };
    vi.mocked(auth).mockResolvedValue(mockSession as Session);
    const response = await GET();
    expect(response.status).toBe(403);
  });

  it('should return analytics data for an authorized user', async () => {
    const mockSession: MockSession = {
      user: { id: 'admin-id', permissions: ['VIEW_ANALYTICS'] },
    };
    vi.mocked(auth).mockResolvedValue(mockSession as Session);

    // Mock the data returned from the database queries
    const mockSpendOverTime = [{ month: '2023-01', total: 1000 }];
    const mockSpendByCategory = [{ category: 'IT', _sum: { totalPrice: 500 } }];
    const mockSpendByDepartment = [{ department: 'Engineering', total: 750 }];

    // @ts-expect-error - We are mocking a raw query result
    vi.mocked(prisma.$queryRaw)
      .mockResolvedValueOnce(mockSpendOverTime)
      .mockResolvedValueOnce(mockSpendByDepartment);

    // @ts-expect-error - We are mocking a groupBy result
    vi.mocked(prisma.pOItem.groupBy).mockResolvedValue(mockSpendByCategory);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.spendOverTime).toEqual([{ name: '2023-01', Total: 1000 }]);
    expect(data.spendByCategory).toEqual([{ name: 'IT', value: 500 }]);
    expect(data.spendByDepartment).toEqual([{ name: 'Engineering', Total: 750 }]);
  });

  it('should handle database errors gracefully', async () => {
    const mockSession: MockSession = {
      user: { id: 'admin-id', permissions: ['VIEW_ANALYTICS'] },
    };
    vi.mocked(auth).mockResolvedValue(mockSession as Session);

    vi.mocked(prisma.$queryRaw).mockRejectedValue(new Error('DB Error'));
    vi.mocked(prisma.pOItem.groupBy).mockRejectedValue(new Error('DB Error'));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});