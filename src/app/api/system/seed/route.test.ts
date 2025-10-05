import { POST } from './route';
import { auth } from '@/lib/auth-config';
import { main as seedDatabase } from '../../../../../prisma/seed';

// Mock dependencies
vi.mock('@/lib/auth-config', () => ({
  auth: vi.fn(),
}));
vi.mock('../../../../../prisma/seed');

describe('POST /api/system/seed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 if user is not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const response = await POST();
    expect(response.status).toBe(401);
  });

  it('should return 403 if user does not have MANAGE_SETTINGS permission', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'user-1', permissions: ['SOME_OTHER_PERMISSION'] },
    } as any);
    const response = await POST();
    expect(response.status).toBe(403);
  });

  it('should return a success message and initiate seeding for an authorized user', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'admin-id', email: 'admin@example.com', permissions: ['MANAGE_SETTINGS'] },
    } as any);

    vi.mocked(seedDatabase).mockResolvedValue(undefined);

    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe('Database seeding process has been initiated.');

    expect(seedDatabase).toHaveBeenCalled();
  });

  it('should handle errors during the seeding process gracefully', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'admin-id', email: 'admin@example.com', permissions: ['MANAGE_SETTINGS'] },
    } as any);

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