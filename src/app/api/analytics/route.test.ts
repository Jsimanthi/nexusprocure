import { GET } from './route';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { Session } from 'next-auth';

// Mock dependencies
vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
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
    vi.mocked(getServerSession).mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it('should return 403 if user does not have VIEW_ANALYTICS permission', async () => {
    const mockSession: MockSession = {
      user: { id: 'user-1', permissions: [] },
    };
    vi.mocked(getServerSession).mockResolvedValue(mockSession as Session);
    const response = await GET();
    expect(response.status).toBe(403);
  });

  it('should return analytics data for an authorized user', async () => {
    const mockSession: MockSession = {
      user: { id: 'admin-id', permissions: ['VIEW_ANALYTICS'] },
    };
    vi.mocked(getServerSession).mockResolvedValue(mockSession as Session);

    // Mock the data returned from the database queries
    const mockSpendOverTime = [{ month: '2023-01', total: 1000 }];
    const mockSpendByCategory = [{ category: 'IT', _sum: { totalPrice: 500 } }, { category: 'Office Supplies', _sum: { totalPrice: 250 } }];
    const mockSpendByDepartment = [{ department: 'Engineering', total: 750 }];
    const mockTopVendors = [{ vendorName: 'Dell Inc.', _sum: { grandTotal: 5000 } }];

    // @ts-expect-error - We are mocking a raw query result
    vi.mocked(prisma.$queryRaw)
      .mockResolvedValueOnce(mockSpendOverTime)
      .mockResolvedValueOnce(mockSpendByDepartment);

    // @ts-expect-error - We are mocking a groupBy result
    vi.mocked(prisma.pOItem.groupBy).mockResolvedValue(mockSpendByCategory);
    // @ts-expect-error - We are mocking a groupBy result
    vi.mocked(prisma.purchaseOrder.groupBy).mockResolvedValue(mockTopVendors);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.spendOverTime).toEqual([{ name: '2023-01', Total: 1000 }]);
    expect(data.spendByCategory).toEqual([{ name: 'IT', value: 500 }, { name: 'Office Supplies', value: 250 }]);
    expect(data.spendByDepartment).toEqual([{ name: 'Engineering', Total: 750 }]);
    expect(data.topVendors).toEqual([{ name: 'Dell Inc.', Total: 5000 }]);
    expect(data.topCategories).toEqual([{ name: 'IT', Total: 500 }, { name: 'Office Supplies', Total: 250 }]);
  });

  it('should handle database errors gracefully', async () => {
    const mockSession: MockSession = {
      user: { id: 'admin-id', permissions: ['VIEW_ANALYTICS'] },
    };
    vi.mocked(getServerSession).mockResolvedValue(mockSession as Session);

    vi.mocked(prisma.$queryRaw).mockRejectedValue(new Error('DB Error'));
    vi.mocked(prisma.pOItem.groupBy).mockRejectedValue(new Error('DB Error'));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});