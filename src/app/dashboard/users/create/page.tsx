"use client";

import PageLayout from '@/components/PageLayout';
import BackButton from '@/components/BackButton';
import CreateUserForm from '@/components/CreateUserForm';
import { useQueries } from '@tanstack/react-query';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorDisplay from '@/components/ErrorDisplay';

interface Role {
  id: string;
  name: string;
}

interface Department {
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

const fetchDepartments = async (): Promise<Department[]> => {
  const response = await fetch('/api/departments');
  if (!response.ok) {
    throw new Error('Failed to fetch departments');
  }
  return response.json();
};

export default function CreateUserPage() {
  const results = useQueries({
    queries: [
      { queryKey: ['roles'], queryFn: fetchRoles },
      { queryKey: ['departments'], queryFn: fetchDepartments },
    ],
  });

  const rolesQuery = results[0];
  const departmentsQuery = results[1];

  const isLoading = results.some(q => q.isLoading);
  const isError = results.some(q => q.isError);
  const error = rolesQuery.error || departmentsQuery.error;

  return (
    <PageLayout title="Create User">
      <div className="mb-4">
        <BackButton />
      </div>
      {isLoading && <LoadingSpinner />}
      {isError && <ErrorDisplay title="Error" message={error?.message || 'An unknown error occurred'} />}
      {rolesQuery.data && departmentsQuery.data && (
        <CreateUserForm roles={rolesQuery.data} departments={departmentsQuery.data} />
      )}
    </PageLayout>
  );
}
