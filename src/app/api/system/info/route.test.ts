import { GET } from './route';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth-config';
import fs from 'fs';

// Mock dependencies
vi.mock('@/lib/auth-config', () => ({
  auth: vi.fn(),
}));
vi.mock('@/lib/prisma');

describe('GET /api/system/info', () => {
  let readFileSpy: vi.SpyInstance;

  beforeEach(() => {
    vi.clearAllMocks();
    // Spy on fs.promises.readFile for each test
    readFileSpy = vi.spyOn(fs.promises, 'readFile');
  });

  afterEach(() => {
    // Restore the original implementation after each test
    readFileSpy.mockRestore();
  });

  it('should return 401 if user is not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it('should return 403 if user does not have MANAGE_SETTINGS permission', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'user-1', permissions: ['SOME_OTHER_PERMISSION'] },
    } as any);
    const response = await GET();
    expect(response.status).toBe(403);
  });

  it('should return system information for an authorized user', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'admin-id', permissions: ['MANAGE_SETTINGS'] },
    } as any);

    readFileSpy.mockResolvedValue(JSON.stringify({ version: '1.2.3' }));
    vi.mocked(prisma.$queryRaw).mockResolvedValue(1 as any);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.appVersion).toBe('1.2.3');
    expect(data.dbStatus).toBe('ok');
    expect(data.nodeVersion).toBe(process.version);
  });

  it('should return dbStatus as "error" if the database query fails', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'admin-id', permissions: ['MANAGE_SETTINGS'] },
    } as any);

    readFileSpy.mockResolvedValue(JSON.stringify({ version: '1.2.3' }));
    vi.mocked(prisma.$queryRaw).mockRejectedValue(new Error('DB connection failed'));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.dbStatus).toBe('error');
  });
});