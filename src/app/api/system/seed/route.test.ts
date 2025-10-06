import { POST } from './route';
import { getServerSession } from 'next-auth/next';
import { main as seedDatabase } from '../../../../../prisma/seed';
import { Session } from 'next-auth';

// Mock dependencies
vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));
vi.mock('@/lib/auth', () => ({
  authOptions: {},
}));
vi.mock('../../../../../prisma/seed');

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
    email?: string;
    permissions?: string[];
  };
};

describe('POST /api/system/seed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 if user is not authenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const response = await POST();
    expect(response.status).toBe(401);
  });

  it('should return 403 if user does not have MANAGE_SETTINGS permission', async () => {
    const mockSession: MockSession = {
      user: { id: 'user-1', permissions: ['SOME_OTHER_PERMISSION'] },
    };
    vi.mocked(getServerSession).mockResolvedValue(mockSession as Session);
    const response = await POST();
    expect(response.status).toBe(403);
  });

  it('should return a success message and initiate seeding for an authorized user', async () => {
    const mockSession: MockSession = {
      user: { id: 'admin-id', email: 'admin@example.com', permissions: ['MANAGE_SETTINGS'] },
    };
    vi.mocked(getServerSession).mockResolvedValue(mockSession as Session);

    vi.mocked(seedDatabase).mockResolvedValue(undefined);

    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe('Database seeding process has been initiated.');

    expect(seedDatabase).toHaveBeenCalled();
  });

  it('should handle errors during the seeding process gracefully', async () => {
    const mockSession: MockSession = {
      user: { id: 'admin-id', email: 'admin@example.com', permissions: ['MANAGE_SETTINGS'] },
    };
    vi.mocked(getServerSession).mockResolvedValue(mockSession as Session);

    const seedError = new Error('Seeding failed!');
    vi.mocked(seedDatabase).mockRejectedValue(seedError);

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const response = await POST();

    expect(response.status).toBe(200);

    await new Promise(process.nextTick);

    expect(seedDatabase).toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith('Database seeding failed:', seedError);

    consoleErrorSpy.mockRestore();
  });
});