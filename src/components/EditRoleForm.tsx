"use client";

import { useForm, Controller } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const editRoleSchema = z.object({
  name: z.string().min(1, 'Role name is required.'),
  permissionIds: z.array(z.string()),
});

type EditRoleFormInputs = z.infer<typeof editRoleSchema>;

interface Permission {
  id: string;
  name: string;
}

interface Role {
  id: string;
  name: string;
  permissions: { permission: { id: string } }[];
}

interface EditRoleFormProps {
  role: Role;
  allPermissions: Permission[];
}

export default function EditRoleForm({ role, allPermissions }: EditRoleFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<EditRoleFormInputs>({
    resolver: zodResolver(editRoleSchema),
    defaultValues: {
      name: role.name,
      permissionIds: role.permissions.map(({ permission }) => permission.id),
    },
  });

  const onSubmit = async (data: EditRoleFormInputs) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/roles/${role.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update role');
      }

      router.refresh();
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('An unknown error occurred');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Role Name
        </label>
        <input
          id="name"
          type="text"
          {...register('name')}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
        {errors.name && <p className="mt-2 text-sm text-red-600">{errors.name.message}</p>}
      </div>
      <div>
        <h3 className="text-lg font-medium text-gray-900">Permissions</h3>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {allPermissions.map((permission) => (
            <div key={permission.id} className="flex items-start">
              <Controller
                name="permissionIds"
                control={control}
                render={({ field }) => (
                  <div className="flex items-center h-5">
                    <input
                      id={`permission-${permission.id}`}
                      type="checkbox"
                      className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                      checked={field.value.includes(permission.id)}
                      onChange={(e) => {
                        const newPermissionIds = e.target.checked
                          ? [...field.value, permission.id]
                          : field.value.filter((id) => id !== permission.id);
                        field.onChange(newPermissionIds);
                      }}
                    />
                  </div>
                )}
              />
              <div className="ml-3 text-sm">
                <label htmlFor={`permission-${permission.id}`} className="font-medium text-gray-700">
                  {permission.name}
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}
