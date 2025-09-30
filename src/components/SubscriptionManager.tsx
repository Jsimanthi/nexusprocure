// src/components/SubscriptionManager.tsx
"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import LoadingSpinner from './LoadingSpinner';

const fetchSubscriptionStatus = async (): Promise<{ isSubscribed: boolean }> => {
  const response = await fetch('/api/reports/subscribe');
  if (!response.ok) {
    throw new Error('Failed to fetch subscription status');
  }
  return response.json();
};

const updateSubscription = async (isSubscribed: boolean) => {
  const method = isSubscribed ? 'POST' : 'DELETE';
  const response = await fetch('/api/reports/subscribe', { method });
  if (!response.ok && response.status !== 204) {
    throw new Error(`Failed to ${isSubscribed ? 'subscribe' : 'unsubscribe'}`);
  }
  return response.status === 204 ? {} : response.json();
};

export default function SubscriptionManager() {
  const queryClient = useQueryClient();
  const [isChecked, setIsChecked] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['subscriptionStatus'],
    queryFn: fetchSubscriptionStatus,
  });

  useEffect(() => {
    if (data) {
      setIsChecked(data.isSubscribed);
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: updateSubscription,
    onSuccess: (_, isSubscribed) => {
      toast.success(`Successfully ${isSubscribed ? 'subscribed' : 'unsubscribed'}!`);
      queryClient.invalidateQueries({ queryKey: ['subscriptionStatus'] });
    },
    onError: (error, isSubscribed) => {
      toast.error(error.message || `Failed to ${isSubscribed ? 'subscribe' : 'unsubscribe'}.`);
      // Revert the checkbox state on error
      setIsChecked(!isSubscribed);
    },
  });

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newCheckedState = e.target.checked;
    setIsChecked(newCheckedState);
    mutation.mutate(newCheckedState);
  };

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2">
        <LoadingSpinner />
        <span>Loading subscription status...</span>
      </div>
    );
  }

  if (isError) {
    return <p className="text-red-500">Could not load subscription settings.</p>;
  }

  return (
    <div className="relative flex items-start">
      <div className="flex h-6 items-center">
        <input
          id="weekly-summary"
          name="weekly-summary"
          type="checkbox"
          checked={isChecked}
          onChange={handleCheckboxChange}
          disabled={mutation.isPending}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600 disabled:opacity-50"
        />
      </div>
      <div className="ml-3 text-sm leading-6">
        <label htmlFor="weekly-summary" className="font-medium text-gray-900">
          Weekly Spend Summary
        </label>
        <p className="text-gray-500">Receive a summary of the week&apos;s spending every Monday morning.</p>
      </div>
      {mutation.isPending && (
        <div className="ml-4">
          <LoadingSpinner />
        </div>
      )}
    </div>
  );
}