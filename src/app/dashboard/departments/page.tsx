"use client";

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import PageLayout from '@/components/PageLayout';
import { useHasPermission } from '@/hooks/useHasPermission';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorDisplay from '@/components/ErrorDisplay';

interface Department {
  id: string;
  name: string;
}

const fetchDepartments = async (): Promise<Department[]> => {
  const response = await fetch('/api/departments');
  if (!response.ok) {
    throw new Error('Failed to fetch departments');
  }
  return response.json();
};

export default function DepartmentManagementPage() {
  const canManageDepartments = useHasPermission('MANAGE_DEPARTMENTS');

  const { data: departments, isLoading, isError, error } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: fetchDepartments,
    enabled: canManageDepartments,
  });

  if (!canManageDepartments) {
    return (
      <PageLayout title="Department Management">
        <ErrorDisplay title="Unauthorized" message="You do not have permission to view this page." />
      </PageLayout>
    );
  }

  if (isLoading) {
    return (
      <PageLayout title="Department Management">
        <LoadingSpinner />
      </PageLayout>
    );
  }

  if (isError) {
    return (
      <PageLayout title="Department Management">
        <ErrorDisplay title="Error" message={error.message} />
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Department Management">
      <div className="flex justify-end mb-4">
        {canManageDepartments && (
          <Link href="/dashboard/departments/create">
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
              Create Department
            </button>
          </Link>
        )}
      </div>
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul role="list" className="divide-y divide-gray-200">
          {departments?.map((department) => (
            <li key={department.id}>
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-indigo-600 truncate">{department.name}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </PageLayout>
  );
}