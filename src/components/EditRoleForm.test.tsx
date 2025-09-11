import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import EditRoleForm from './EditRoleForm';
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

const mockRouter: Partial<AppRouterInstance> = {
  push: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  replace: vi.fn(),
  prefetch: vi.fn(),
};

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}));

const mockFetch = (ok: boolean, data: Record<string, unknown>) => {
  global.fetch = vi.fn(() =>
    Promise.resolve({
      ok,
      json: () => Promise.resolve(data),
    } as Response)
  );
};

interface MockRole {
    id: string;
    name: string;
    permissions: { permission: { id: string } }[];
}

describe('EditRoleForm', () => {
    const mockRole: MockRole = {
        id: '1',
        name: 'ADMIN',
        permissions: [{ permission: { id: 'p1' } }],
    };

    const allPermissions = [
    { id: 'p1', name: 'MANAGE_USERS' },
    { id: 'p2', name: 'MANAGE_ROLES' },
    ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the form with default values', () => {
    render(<EditRoleForm role={mockRole} allPermissions={allPermissions} />);
    expect(screen.getByLabelText(/role name/i)).toHaveValue('ADMIN');
    expect(screen.getByLabelText('MANAGE_USERS')).toBeChecked();
    expect(screen.getByLabelText('MANAGE_ROLES')).not.toBeChecked();
  });

  it('should submit the form with updated data', async () => {
    mockFetch(true, {});
    render(<EditRoleForm role={mockRole} allPermissions={allPermissions} />);

    await fireEvent.change(screen.getByLabelText(/role name/i), { target: { value: 'NEW_ADMIN' } });
    await fireEvent.click(screen.getByLabelText('MANAGE_ROLES')); // Check the second permission
    await fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/roles/1',
        expect.objectContaining({
          body: JSON.stringify({
            name: 'NEW_ADMIN',
            permissionIds: ['p1', 'p2'],
          }),
        })
      );
      expect(mockRouter.refresh).toHaveBeenCalled();
    });
  });

  it('should display an error message on failed submission', async () => {
    mockFetch(false, { error: 'Failed to update' });
    render(<EditRoleForm role={mockRole} allPermissions={allPermissions} />);

    await fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
        expect(screen.getByText(/failed to update/i)).toBeInTheDocument();
    });
  });
});
