"use client";

import { useQuery } from '@tanstack/react-query';
import PageLayout from '@/components/PageLayout';
import { useHasPermission } from '@/hooks/useHasPermission';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorDisplay from '@/components/ErrorDisplay';
import BackButton from '@/components/BackButton';
import EditRoleForm from '@/components/EditRoleForm';

interface Permission {
  id: string;
  name: string;
}

interface Role {
  id: string;
  name: string;
  permissions: { permission: { id: string } }[];
}

const fetchRoleAndPermissions = async (id: string): Promise<{ role: Role; allPermissions: Permission[] }> => {
  const [roleRes, permissionsRes] = await Promise.all([
    fetch(`/api/roles/${id}`),
    fetch('/api/permissions'),
  ]);

  if (!roleRes.ok) {
    throw new Error('Failed to fetch role');
  }
  if (!permissionsRes.ok) {
    throw new Error('Failed to fetch permissions');
  }

  const role = await roleRes.json();
  const allPermissions = await permissionsRes.json();

  return { role, allPermissions };
};

interface RoleDetailsPageProps {
  params: {
    id: string;
  };
}

export default function RoleDetailsPage({ params }: RoleDetailsPageProps) {
  const canManageRoles = useHasPermission('MANAGE_ROLES');
  const { id } = params;

  const { data, isLoading, isError, error } = useQuery<{ role: Role; allPermissions: Permission[] }>({
    queryKey: ['role', id, 'permissions'],
    queryFn: () => fetchRoleAndPermissions(id),
    enabled: canManageRoles,
  });

  if (!canManageRoles) {
    return (
      <PageLayout title="Role Details">
        <ErrorDisplay title="Unauthorized" message="You do not have permission to view this page." />
      </PageLayout>
    );
  }

  if (isLoading) {
    return (
      <PageLayout title="Role Details">
        <LoadingSpinner />
      </PageLayout>
    );
  }

  if (isError) {
    return (
      <PageLayout title="Role Details">
        <ErrorDisplay title="Error" message={error.message} />
      </PageLayout>
    );
  }

  if (!data) {
    return (
      <PageLayout title="Role Details">
        <ErrorDisplay title="Not Found" message="Role not found." />
      </PageLayout>
    );
  }

  return (
    <PageLayout title={`Edit Role: ${data.role.name}`}>
        <div className="mb-4">
            <BackButton />
        </div>
      <div className="bg-white shadow overflow-hidden sm:rounded-md p-6">
        <EditRoleForm role={data.role} allPermissions={data.allPermissions} />
      </div>
    </PageLayout>
  );
}
