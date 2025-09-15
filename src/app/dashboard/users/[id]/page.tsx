"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import PageLayout from '@/components/PageLayout';
import { useHasPermission } from '@/hooks/useHasPermission';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorDisplay from '@/components/ErrorDisplay';
import { useState, useEffect } from 'react';

// Types
interface User {
  id: string;
  name: string | null;
  email: string;
  role: {
    id: string;
    name: string;
  } | null;
}
interface Role {
  id: string;
  name: string;
}

// API Fetching Functions
const fetchUser = async (id: string): Promise<User> => {
  const response = await fetch(`/api/users/${id}`);
  if (!response.ok) throw new Error('Failed to fetch user data.');
  return response.json();
};

const fetchRoles = async (): Promise<Role[]> => {
  const response = await fetch('/api/roles');
  if (!response.ok) throw new Error('Failed to fetch roles.');
  return response.json();
};

const updateUserRole = async ({ userId, roleId }: { userId: string; roleId: string }) => {
  const response = await fetch(`/api/users/${userId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roleId }),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to update user role.');
  }
  return response.json();
};


export default function UserEditPage() {
  const params = useParams();
  const userId = params.id as string;
  const queryClient = useQueryClient();

  const canManageUsers = useHasPermission('MANAGE_USERS');
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Fetch user data
  const { data: user, isLoading: isLoadingUser, isError: isErrorUser, error: errorUser } = useQuery<User>({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
    enabled: canManageUsers && !!userId,
  });

  // Fetch roles data
  const { data: roles, isLoading: isLoadingRoles, isError: isErrorRoles, error: errorRoles } = useQuery<Role[]>({
    queryKey: ['roles'],
    queryFn: fetchRoles,
    enabled: canManageUsers,
  });

  // Set initial selected role once user data is loaded
  useEffect(() => {
    if (user?.role?.id) {
      setSelectedRoleId(user.role.id);
    }
  }, [user]);

  // Mutation for updating the role
  const mutation = useMutation({
    mutationFn: updateUserRole,
    onSuccess: () => {
      // Invalidate and refetch users query to update the list page
      queryClient.invalidateQueries({ queryKey: ['users'] });
      // Invalidate and refetch the current user's data
      queryClient.invalidateQueries({ queryKey: ['user', userId] });
      setSuccessMessage('User role updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000); // Clear message after 3 seconds
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRoleId) {
      mutation.mutate({ userId, roleId: selectedRoleId });
    }
  };

  if (!canManageUsers) {
    return (
      <PageLayout title="Edit User">
        <ErrorDisplay title="Unauthorized" message="You do not have permission to perform this action." />
      </PageLayout>
    );
  }

  const isLoading = isLoadingUser || isLoadingRoles;
  const isError = isErrorUser || isErrorRoles;
  const error = errorUser || errorRoles;

  if (isLoading) {
    return (
      <PageLayout title="Edit User">
        <LoadingSpinner />
      </PageLayout>
    );
  }

  if (isError) {
    return (
      <PageLayout title="Edit User">
        <ErrorDisplay title="Error" message={error?.message || 'An unknown error occurred'} />
      </PageLayout>
    );
  }

  return (
    <PageLayout title={`Edit User: ${user?.name || ''}`}>
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">{user?.email}</h3>
          <form className="mt-5 sm:flex sm:items-center" onSubmit={handleSubmit}>
            <div className="w-full sm:max-w-xs">
              <label htmlFor="role" className="sr-only">
                Role
              </label>
              <select
                id="role"
                name="role"
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                value={selectedRoleId}
                onChange={(e) => setSelectedRoleId(e.target.value)}
              >
                {roles?.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={mutation.isPending || !selectedRoleId || selectedRoleId === user?.role?.id}
              className="mt-3 w-full inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:bg-gray-400"
            >
              {mutation.isPending ? 'Saving...' : 'Save Role'}
            </button>
          </form>
          {mutation.isError && (
            <p className="mt-2 text-sm text-red-600">Error: {mutation.error.message}</p>
          )}
          {successMessage && (
            <p className="mt-2 text-sm text-green-600">{successMessage}</p>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
