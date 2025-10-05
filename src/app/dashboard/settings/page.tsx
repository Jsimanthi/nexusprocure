"use client";

import PageLayout from '@/components/PageLayout';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorDisplay from '@/components/ErrorDisplay';
import { useHasPermission } from '@/hooks/useHasPermission';
import Tabs from '@/components/Tabs';
import ApplicationSettings from '@/components/settings/ApplicationSettings';
import SystemPage from '@/components/settings/SystemPage';

export default function SettingsPage() {
  const canManageSettings = useHasPermission('MANAGE_SETTINGS');

  if (canManageSettings === null) { // Still loading session
    return (
      <PageLayout title="Settings">
        <LoadingSpinner />
      </PageLayout>
    );
  }

  if (!canManageSettings) {
    return (
      <PageLayout title="Settings">
        <ErrorDisplay title="Access Denied" message="You do not have permission to view this page." />
      </PageLayout>
    );
  }

  const tabs = [
    {
      id: 'application',
      label: 'Application',
      content: <ApplicationSettings />,
    },
    {
      id: 'system',
      label: 'System',
      content: <SystemPage />,
    },
  ];

  return (
    <PageLayout title="Settings">
      <Tabs tabs={tabs} />
    </PageLayout>
  );
}