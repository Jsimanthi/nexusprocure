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
  let fetchSpy;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
    fetchSpy = vi.spyOn(global, 'fetch');
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
    fetchSpy.mockImplementation(() => new Promise(() => {})); // Mocks a pending promise
    renderWithProviders(<SettingsPage />);
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('should display an error message if fetching settings fails', async () => {
    vi.mocked(useHasPermission).mockReturnValue(true);
    const errorMessage = "Server Error: Could not retrieve settings.";
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: errorMessage }),
    } as Response);
    renderWithProviders(<SettingsPage />);
    // The component's fetcher throws an error with the message from the API
    expect(await screen.findByText(errorMessage)).toBeInTheDocument();
  });

  it('should display settings and allow updating a value', async () => {
    vi.mocked(useHasPermission).mockReturnValue(true);
    let mockSettings = [{ id: '1', key: 'company_name', value: 'Nexus Inc.' }];

    fetchSpy.mockImplementation((url, options) => {
      if (options?.method === 'PUT') {
        const updatedSetting = { id: '1', key: 'company_name', value: 'Nexus Corp.' };
        // This update is crucial for the refetch to get the new value
        mockSettings = [updatedSetting];
        return Promise.resolve({
          ok: true, status: 200,
          json: () => Promise.resolve(updatedSetting),
        } as Response);
      }
      // For GET requests
      return Promise.resolve({
        ok: true, status: 200,
        json: () => Promise.resolve(mockSettings),
      } as Response);
    });

    renderWithProviders(<SettingsPage />);

    const input = await screen.findByDisplayValue('Nexus Inc.');
    fireEvent.change(input, { target: { value: 'Nexus Corp.' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    // Wait for the success toast, which appears after the mutation is successful
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Setting "company_name" updated successfully!');
    });

    // After a successful mutation, react-query will refetch and the UI will update.
    // The findBy query will wait for the new value to be displayed.
    expect(await screen.findByDisplayValue('Nexus Corp.')).toBeInTheDocument();
  });

  it('should show an error toast if updating a setting fails', async () => {
    vi.mocked(useHasPermission).mockReturnValue(true);
    const mockSettings = [{ id: '1', key: 'company_name', value: 'Nexus Inc.' }];

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