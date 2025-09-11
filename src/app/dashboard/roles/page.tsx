"use client";

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import PageLayout from '@/components/PageLayout';
import { useHasPermission } from '@/hooks/useHasPermission';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorDisplay from '@/components/ErrorDisplay';

interface Role {
  id: string;
  name: string;
}

const fetchRoles = async (): Promise<Role[]> => {
  const response = await fetch('/api/roles');
  if (!response.ok) {
    throw new Error('Failed to fetch roles');
  }
  return response.json();
};

export default function RolesPage() {
  const canManageRoles = useHasPermission('MANAGE_ROLES');

  const { data: roles, isLoading, isError, error } = useQuery<Role[]>({
    queryKey: ['roles'],
    queryFn: fetchRoles,
    enabled: canManageRoles,
  });

  if (!canManageRoles) {
    return (
      <PageLayout title="Roles">
        <ErrorDisplay title="Unauthorized" message="You do not have permission to view this page." />
      </PageLayout>
    );
  }

  if (isLoading) {
    return (
      <PageLayout title="Roles">
        <LoadingSpinner />
      </PageLayout>
    );
  }

  if (isError) {
    return (
      <PageLayout title="Roles">
        <ErrorDisplay title="Error" message={error.message} />
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Roles">
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul role="list" className="divide-y divide-gray-200">
          {roles?.map((role) => (
            <li key={role.id}>
              <Link href={`/dashboard/roles/${role.id}`} className="block hover:bg-gray-50">
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-indigo-600 truncate">{role.name}</p>
                    <div className="ml-2 flex-shrink-0 flex">
                        <p className="text-sm text-gray-500">View Details</p>
                    </div>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </PageLayout>
  );
}
