"use client";

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import LoadingSpinner from './LoadingSpinner';

const fetchSubscriptionStatus = async (): Promise<{ isSubscribed: boolean }> => {
  const response = await fetch('/api/reports/subscribe');
  if (!response.ok) {
    throw new Error('Could not fetch subscription status');
  }
  return response.json();
};

const updateSubscription = async (isSubscribed: boolean) => {
  const method = isSubscribed ? 'POST' : 'DELETE';
  const response = await fetch('/api/reports/subscribe', { method });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `Failed to ${isSubscribed ? 'subscribe' : 'unsubscribe'}`);
  }
  return response.json();
};


export default function ReportSubscriptionToggle() {
    const queryClient = useQueryClient();
    const [isChecked, setIsChecked] = useState(false);

    const { data, isLoading, isError } = useQuery({
        queryKey: ['reportSubscription'],
        queryFn: fetchSubscriptionStatus,
    });

    const mutation = useMutation({
        mutationFn: updateSubscription,
        onSuccess: (data, isSubscribed) => {
            toast.success(isSubscribed ? 'Successfully subscribed to weekly reports!' : 'Successfully unsubscribed.');
            queryClient.invalidateQueries({ queryKey: ['reportSubscription'] });
        },
        onError: (error: Error) => {
            toast.error(error.message);
            // Revert the optimistic update on error
            setIsChecked(prev => !prev);
        }
    });

    useEffect(() => {
        if (data) {
            setIsChecked(data.isSubscribed);
        }
    }, [data]);

    const handleToggle = () => {
        const newCheckedState = !isChecked;
        setIsChecked(newCheckedState); // Optimistic update
        mutation.mutate(newCheckedState);
    };

    if (isLoading) {
        return <div className="mt-4 h-6"><LoadingSpinner /></div>;
    }

    if (isError) {
        return <p className="text-red-500 text-sm mt-2">Could not load subscription status.</p>
    }

    return (
        <div className="mt-4 flex items-center">
            <button
                type="button"
                className={`${
                isChecked ? 'bg-blue-600' : 'bg-gray-200'
                } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
                role="switch"
                aria-checked={isChecked}
                onClick={handleToggle}
                disabled={mutation.isPending}
            >
                <span
                aria-hidden="true"
                className={`${
                    isChecked ? 'translate-x-5' : 'translate-x-0'
                } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                />
            </button>
            <span className="ml-3 text-sm font-medium text-gray-900">
                {mutation.isPending ? 'Updating...' : (isChecked ? 'Subscribed' : 'Unsubscribed')}
            </span>
        </div>
    );
}