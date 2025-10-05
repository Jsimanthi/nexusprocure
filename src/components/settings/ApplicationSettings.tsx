"use client";

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorDisplay from '@/components/ErrorDisplay';
import { Setting } from '@prisma/client';

// Fetch all settings
const fetchSettings = async (): Promise<Setting[]> => {
  const response = await fetch('/api/settings');
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to fetch settings');
  }
  return response.json();
};

// Update a single setting
const updateSetting = async (setting: { key: string; value: string }): Promise<Setting> => {
  const response = await fetch(`/api/settings/${setting.key}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ value: setting.value }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to update setting');
  }
  return response.json();
};

const ApplicationSettings = () => {
  const queryClient = useQueryClient();
  const [changedSettings, setChangedSettings] = useState<Record<string, string>>({});

  const { data: settings, isLoading, isError, error } = useQuery<Setting[], Error>({
    queryKey: ['settings'],
    queryFn: fetchSettings,
  });

  const mutation = useMutation<Setting, Error, { key: string; value: string }>({
    mutationFn: updateSetting,
    onSuccess: (data) => {
      toast.success(`Setting "${data.key}" updated successfully!`);
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setChangedSettings(prev => {
        const newChanges = { ...prev };
        delete newChanges[data.key];
        return newChanges;
      });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleInputChange = (key: string, value: string) => {
    setChangedSettings(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = (key: string) => {
    const value = changedSettings[key];
    if (value !== undefined) {
      mutation.mutate({ key, value });
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (isError) {
    return <ErrorDisplay title="Error" message={error.message} />;
  }

  return (
    <div className="bg-white shadow sm:rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg font-medium leading-6 text-gray-900">System Configuration</h3>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">
          Manage application-wide settings. Changes will take effect immediately.
        </p>
      </div>
      <div className="border-t border-gray-200">
        <dl className="divide-y divide-gray-200">
          {settings?.map((setting) => (
            <div key={setting.id} className="px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 items-center">
              <dt className="text-sm font-medium text-gray-500 capitalize">{setting.key.replace(/_/g, ' ')}</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0 flex items-center gap-x-4">
                <input
                  type="text"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  value={changedSettings[setting.key] ?? setting.value}
                  onChange={(e) => handleInputChange(setting.key, e.target.value)}
                />
                <button
                  onClick={() => handleSave(setting.key)}
                  disabled={mutation.isPending && mutation.variables?.key === setting.key || changedSettings[setting.key] === undefined}
                  className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50"
                >
                  {mutation.isPending && mutation.variables?.key === setting.key ? 'Saving...' : 'Save'}
                </button>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
};

export default ApplicationSettings;