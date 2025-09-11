import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CreateUserForm from './CreateUserForm';
import { useRouter } from 'next/navigation';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
  })),
}));

describe('CreateUserForm', () => {
  const roles = [
    { id: 'clxmil0n500003b6le21w24g0', name: 'Admin' },
    { id: 'clxmil0n500003b6le21w24g1', name: 'User' },
  ];

  it('should render the form correctly', () => {
    render(<CreateUserForm roles={roles} />);
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/role/i)).toBeInTheDocument();
  });

  it('should submit the form with valid data', async () => {
    const push = vi.fn();
    vi.mocked(useRouter).mockReturnValue({ push } as any);
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      })
    ) as any;

    render(<CreateUserForm roles={roles} />);

    await fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Test User' } });
    await fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    await fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
    await fireEvent.change(screen.getByLabelText(/role/i), { target: { value: roles[0].id } });

    await fireEvent.click(screen.getByRole('button', { name: /create user/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/users', expect.any(Object));
      expect(push).toHaveBeenCalledWith('/dashboard/users');
    });
  });

  it('should display an error message on failed submission', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: 'Failed to create user' }),
      })
    ) as any;

    render(<CreateUserForm roles={roles} />);

    await fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Test User' } });
    await fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    await fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
    await fireEvent.change(screen.getByLabelText(/role/i), { target: { value: roles[0].id } });

    await fireEvent.click(screen.getByRole('button', { name: /create user/i }));

    await waitFor(() => {
      expect(screen.getByText(/failed to create user/i)).toBeInTheDocument();
    });
  });
});
