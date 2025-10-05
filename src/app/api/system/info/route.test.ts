import { GET } from './route';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth-config';
import fs from 'fs';
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

describe('GET /api/system/info', () => {
  let readFileSpy: vi.SpyInstance;

  beforeEach(() => {
    vi.clearAllMocks();
    readFileSpy = vi.spyOn(fs.promises, 'readFile');
  });

  afterEach(() => {
    readFileSpy.mockRestore();
  });

  it('should return 401 if user is not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it('should return 403 if user does not have MANAGE_SETTINGS permission', async () => {
    const mockSession: MockSession = {
      user: { id: 'user-1', permissions: ['SOME_OTHER_PERMISSION'] },
    };
    vi.mocked(auth).mockResolvedValue(mockSession as Session);
    const response = await GET();
    expect(response.status).toBe(403);
  });

  it('should return system information for an authorized user', async () => {
    const mockSession: MockSession = {
      user: { id: 'admin-id', permissions: ['MANAGE_SETTINGS'] },
    };
    vi.mocked(auth).mockResolvedValue(mockSession as Session);

    readFileSpy.mockResolvedValue(JSON.stringify({ version: '1.2.3' }));
    vi.mocked(prisma.$queryRaw).mockResolvedValue([1]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.appVersion).toBe('1.2.3');
    expect(data.dbStatus).toBe('ok');
    expect(data.nodeVersion).toBe(process.version);
  });

  it('should return dbStatus as "error" if the database query fails', async () => {
    const mockSession: MockSession = {
      user: { id: 'admin-id', permissions: ['MANAGE_SETTINGS'] },
    };
    vi.mocked(auth).mockResolvedValue(mockSession as Session);

    readFileSpy.mockResolvedValue(JSON.stringify({ version: '1.2.3' }));
    vi.mocked(prisma.$queryRaw).mockRejectedValue(new Error('DB connection failed'));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.dbStatus).toBe('error');
  });
});