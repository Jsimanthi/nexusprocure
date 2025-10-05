"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorDisplay from '@/components/ErrorDisplay';

interface SystemInfo {
  appVersion: string;
  dbStatus: 'ok' | 'error';
  nodeVersion: string;
}

const fetchSystemInfo = async (): Promise<SystemInfo> => {
  const response = await fetch('/api/system/info');
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to fetch system info');
  }
  return response.json();
};

const seedDatabase = async () => {
  const response = await fetch('/api/system/seed', { method: 'POST' });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to seed database');
  }
  return response.json();
};

const SystemPage = () => {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error } = useQuery<SystemInfo, Error>({
    queryKey: ['systemInfo'],
    queryFn: fetchSystemInfo,
  });

  const seedMutation = useMutation({
    mutationFn: seedDatabase,
    onSuccess: () => {
      toast.success('Database seeding initiated successfully.');
      queryClient.invalidateQueries({ queryKey: ['systemInfo'] });
    },
    onError: (error: Error) => {
      toast.error(`Error seeding database: ${error.message}`);
    },
  });

  const handleSeedDatabase = () => {
    if (confirm('Are you sure you want to re-seed the database? This may overwrite existing data.')) {
      seedMutation.mutate();
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (isError) {
    return <ErrorDisplay title="Error Loading System Info" message={error.message} />;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900">System Information</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Current status and versioning of the application components.
          </p>
        </div>
        <div className="border-t border-gray-200">
          <dl className="divide-y divide-gray-200">
            <div className="px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Application Version</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">{data?.appVersion}</dd>
            </div>
            <div className="px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Node.js Version</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">{data?.nodeVersion}</dd>
            </div>
            <div className="px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Database Status</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  data?.dbStatus === 'ok' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {data?.dbStatus === 'ok' ? 'OK' : 'Error'}
                </span>
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900">Database Actions</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Perform administrative actions on the database. Use with caution.
          </p>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
          <button
            onClick={handleSeedDatabase}
            disabled={seedMutation.isPending}
            className="rounded-md bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 disabled:opacity-50"
          >
            {seedMutation.isPending ? 'Seeding...' : 'Re-seed Database'}
          </button>
          <p className="mt-2 text-xs text-gray-500">
            This will repopulate the database with the initial data from the seed script.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SystemPage;