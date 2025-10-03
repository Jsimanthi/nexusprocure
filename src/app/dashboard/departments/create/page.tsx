"use client";

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import PageLayout from '@/components/PageLayout';
import { useHasPermission } from '@/hooks/useHasPermission';
import ErrorDisplay from '@/components/ErrorDisplay';
import { createDepartmentSchema } from '@/lib/schemas';

type FormData = z.infer<typeof createDepartmentSchema>;

const createDepartment = async (data: FormData) => {
  const response = await fetch('/api/departments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to create department');
  }

  return response.json();
};

export default function CreateDepartmentPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const canManageDepartments = useHasPermission('MANAGE_DEPARTMENTS');

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(createDepartmentSchema),
  });

  const mutation = useMutation({
    mutationFn: createDepartment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      router.push('/dashboard/departments');
    },
  });

  const onSubmit = (data: FormData) => {
    mutation.mutate(data);
  };

  if (!canManageDepartments) {
    return (
      <PageLayout title="Create Department">
        <ErrorDisplay title="Unauthorized" message="You do not have permission to perform this action." />
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Create New Department">
      <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Department Name
            </label>
            <input
              id="name"
              type="text"
              {...register('name')}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
            {errors.name && <p className="mt-2 text-sm text-red-600">{errors.name.message}</p>}
          </div>

          {mutation.isError && (
            <div className="mb-4">
              <ErrorDisplay title="Error creating department" message={mutation.error.message} />
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => router.back()}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md text-sm font-medium transition-colors mr-2"
              disabled={mutation.isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? 'Creating...' : 'Create Department'}
            </button>
          </div>
        </form>
      </div>
    </PageLayout>
  );
}