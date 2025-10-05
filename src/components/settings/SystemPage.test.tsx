import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import SystemPage from './SystemPage';
import toast from 'react-hot-toast';

// Mock dependencies
vi.mock('react-hot-toast');

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false, // Disable retries for tests
    },
  },
});

const renderWithProviders = (ui) => {
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
};

describe('SystemPage', () => {
  let fetchSpy;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
    fetchSpy = vi.spyOn(global, 'fetch');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should display loading spinner while fetching system info', () => {
    fetchSpy.mockImplementation(() => new Promise(() => {})); // Mocks a pending promise
    renderWithProviders(<SystemPage />);
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('should display an error message if fetching system info fails', async () => {
    const errorMessage = "Failed to fetch system info";
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: errorMessage }),
    } as Response);
    renderWithProviders(<SystemPage />);
    expect(await screen.findByText(errorMessage)).toBeInTheDocument();
  });

  it('should display system information correctly after a successful fetch', async () => {
    const mockSystemInfo = {
      appVersion: '1.0.0',
      nodeVersion: 'v18.18.0',
      dbStatus: 'ok',
    };
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockSystemInfo),
    } as Response);

    renderWithProviders(<SystemPage />);

    expect(await screen.findByText('1.0.0')).toBeInTheDocument();
    expect(screen.getByText('v18.18.0')).toBeInTheDocument();
    expect(screen.getByText('OK')).toBeInTheDocument();
  });

  it('should call the seed API and show a success toast when the "Re-seed Database" button is clicked', async () => {
    const mockSystemInfo = { appVersion: '1.0.0', nodeVersion: 'v18.0.0', dbStatus: 'ok' };
    fetchSpy.mockImplementation((url) => {
      if (url.toString().includes('/api/system/seed')) {
        return Promise.resolve({
          ok: true, status: 200,
          json: () => Promise.resolve({ message: 'Seeding initiated' }),
        } as Response);
      }
      return Promise.resolve({
        ok: true, status: 200,
        json: () => Promise.resolve(mockSystemInfo),
      } as Response);
    });

    // Mock window.confirm to always return true
    window.confirm = vi.fn(() => true);

    renderWithProviders(<SystemPage />);

    const seedButton = await screen.findByRole('button', { name: /re-seed database/i });
    fireEvent.click(seedButton);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith('/api/system/seed', { method: 'POST' });
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Database seeding initiated successfully.');
    });
  });

  it('should show an error toast if the seed API call fails', async () => {
    const mockSystemInfo = { appVersion: '1.0.0', nodeVersion: 'v18.0.0', dbStatus: 'ok' };
    fetchSpy.mockImplementation((url) => {
      if (url.toString().includes('/api/system/seed')) {
        return Promise.resolve({
          ok: false, status: 500,
          json: () => Promise.resolve({ error: 'Seeding Failed' }),
        } as Response);
      }
      return Promise.resolve({
        ok: true, status: 200,
        json: () => Promise.resolve(mockSystemInfo),
      } as Response);
    });

    window.confirm = vi.fn(() => true);

    renderWithProviders(<SystemPage />);

    const seedButton = await screen.findByRole('button', { name: /re-seed database/i });
    fireEvent.click(seedButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Error seeding database: Seeding Failed');
    });
  });
});