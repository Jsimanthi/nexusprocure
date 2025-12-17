"use client";

import ErrorDisplay from '@/components/ErrorDisplay';
import LoadingSpinner from '@/components/LoadingSpinner';
import PageLayout from '@/components/PageLayout';
import Tabs from '@/components/Tabs';
import ApplicationSettings from '@/components/settings/ApplicationSettings';
import SystemPage from '@/components/settings/SystemPage';
import { Card, CardContent } from "@/components/ui/card";
import { useHasPermission } from '@/hooks/useHasPermission';
import { Permission } from '@/types/auth';
import { Server, Settings, Sliders } from 'lucide-react';

export default function SettingsPage() {
  const canManageSettings = useHasPermission(Permission.MANAGE_SETTINGS);

  if (canManageSettings === null) {
    return (
      <PageLayout title="System Settings">
        <LoadingSpinner />
      </PageLayout>
    );
  }

  if (!canManageSettings) {
    return (
      <PageLayout title="System Settings">
        <ErrorDisplay title="Access Denied" message="You do not have permission to view this page." />
      </PageLayout>
    );
  }

  // Enhanced visual tabs configuration
  const tabs = [
    {
      id: 'application',
      label: 'Application',
      icon: <Sliders className="w-4 h-4" />,
      content: (
        <div className="mt-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <ApplicationSettings />
        </div>
      ),
    },
    {
      id: 'system',
      label: 'System',
      icon: <Server className="w-4 h-4" />,
      content: (
        <div className="mt-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <SystemPage />
        </div>
      ),
    },
  ];

  return (
    <PageLayout title="System Settings">
      <div className="space-y-6">
        <div className="flex items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="p-3 bg-slate-100 rounded-lg">
            <Settings className="w-8 h-8 text-slate-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Configuration Center</h2>
            <p className="text-slate-500 text-sm">Manage global application preferences and system parameters.</p>
          </div>
        </div>

        <Card className="border-0 shadow-md bg-white rounded-xl overflow-hidden min-h-[500px]">
          <CardContent className="p-6">
            <Tabs tabs={tabs} />
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}