"use client";

import PageLayout from '@/components/PageLayout';
import BackButton from '@/components/BackButton';
import CreateUserForm from '@/components/CreateUserForm';
import { useQuery } from '@tanstack/react-query';
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

export default function CreateUserPage() {
  const { data: roles, isLoading, isError, error } = useQuery<Role[]>({
    queryKey: ['roles'],
    queryFn: fetchRoles,
  });

  return (
    <PageLayout title="Create User">
      <div className="mb-4">
        <BackButton />
      </div>
      {isLoading && <LoadingSpinner />}
      {isError && <ErrorDisplay title="Error" message={error.message} />}
      {roles && <CreateUserForm roles={roles} />}
    </PageLayout>
  );
}
