import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider } from 'next-auth/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import SettingsPage from './page';
import { useHasPermission } from '@/hooks/useHasPermission';
import toast from 'react-hot-toast';

// Mock dependencies
vi.mock('@/hooks/useHasPermission');
vi.mock('react-hot-toast');

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false, // Disable retries for tests
    },
  },
});

// Wrapper component to provide necessary contexts
const renderWithProviders = (ui) => {
  const mockSession = {
    user: { id: 'test-user', name: 'Test User' },
    expires: '2099-01-01T00:00:00.000Z',
  };
  return render(
    <SessionProvider session={mockSession}>
      <QueryClientProvider client={queryClient}>
        {ui}
      </QueryClientProvider>
    </SessionProvider>
  );
};

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should display access denied message if user lacks permission', () => {
    vi.mocked(useHasPermission).mockReturnValue(false);
    renderWithProviders(<SettingsPage />);
    expect(screen.getByText('Access Denied')).toBeInTheDocument();
  });

  it('should display loading spinner while fetching settings', async () => {
    vi.mocked(useHasPermission).mockReturnValue(true);
    vi.spyOn(global, 'fetch').mockImplementation(() => new Promise(() => {}));
    renderWithProviders(<SettingsPage />);
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('should display an error message if fetching settings fails', async () => {
    vi.mocked(useHasPermission).mockReturnValue(true);
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'Server Error' }),
    } as Response);
    renderWithProviders(<SettingsPage />);
    expect(await screen.findByText('Failed to fetch settings')).toBeInTheDocument();
  });

  it('should display settings and allow updating a value', async () => {
    vi.mocked(useHasPermission).mockReturnValue(true);
    const mockSettings = [{ id: '1', key: 'company_name', value: 'Nexus Inc.' }];

    const fetchSpy = vi.spyOn(global, 'fetch');
    fetchSpy.mockImplementation((url, options) => {
      if (url.toString().includes('/api/settings/company_name')) {
        return Promise.resolve({
          ok: true, status: 200,
          json: () => Promise.resolve({ id: '1', key: 'company_name', value: 'Nexus Corp.' }),
        } as Response);
      }
      return Promise.resolve({
        ok: true, status: 200,
        json: () => Promise.resolve(mockSettings),
      } as Response);
    });

    renderWithProviders(<SettingsPage />);

    const input = await screen.findByDisplayValue('Nexus Inc.');
    fireEvent.change(input, { target: { value: 'Nexus Corp.' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith('/api/settings/company_name', expect.objectContaining({ method: 'PUT' }));
      expect(toast.success).toHaveBeenCalledWith('Setting "company_name" updated successfully!');
    });
  });

  it('should show an error toast if updating a setting fails', async () => {
    vi.mocked(useHasPermission).mockReturnValue(true);
    const mockSettings = [{ id: '1', key: 'company_name', value: 'Nexus Inc.' }];

    const fetchSpy = vi.spyOn(global, 'fetch');
    fetchSpy.mockImplementation((url, options) => {
        if (options?.method === 'PUT') {
            return Promise.resolve({
                ok: false, status: 500,
                json: () => Promise.resolve({ error: 'Update Failed' }),
            } as Response);
        }
        return Promise.resolve({
            ok: true, status: 200,
            json: () => Promise.resolve(mockSettings),
        } as Response);
    });

    renderWithProviders(<SettingsPage />);
    const input = await screen.findByDisplayValue('Nexus Inc.');
    fireEvent.change(input, { target: { value: 'New Value' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Update Failed');
    });
  });
});