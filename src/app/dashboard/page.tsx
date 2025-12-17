"use client";
import { AdminDashboard } from "@/components/dashboard/AdminDashboard";
import { FinanceOfficerDashboard } from "@/components/dashboard/FinanceOfficerDashboard";
import { ManagerDashboard } from "@/components/dashboard/ManagerDashboard";
import { ProcurementOfficerDashboard } from "@/components/dashboard/ProcurementOfficerDashboard";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import ErrorDisplay from "@/components/ErrorDisplay";
import LoadingSpinner from "@/components/LoadingSpinner";
import PageLayout from "@/components/PageLayout";
import { useDashboardData } from "@/hooks/useDashboard";
import { useUser } from "@/hooks/useUser";
import { Role } from "@/types/auth";
import { DashboardStats } from "@/types/dashboard";
import { redirect } from "next/navigation";
import React from "react"; // Explicit import for React.FC

const dashboardComponents: { [key: string]: React.FC<{ stats: DashboardStats }> } = {
  [Role.ADMINISTRATOR]: AdminDashboard,
  [Role.MANAGER]: ManagerDashboard,
  [Role.APPROVER]: ManagerDashboard, // Using ManagerDashboard for Approvers as well
  [Role.PROCUREMENT_OFFICER]: ProcurementOfficerDashboard,
  [Role.FINANCE_OFFICER]: FinanceOfficerDashboard,
};

export default function DashboardPage() {
  const { user, isLoading: isUserLoading, isAuthenticated } = useUser();
  const {
    data: stats,
    isLoading: isStatsLoading,
    isError,
    error,
    refetch,
  } = useDashboardData();

  if (isUserLoading || isStatsLoading) {
    return (
      <PageLayout title="Dashboard Overview">
        <LoadingSpinner />
      </PageLayout>
    );
  }

  if (!isAuthenticated || !user) {
    redirect("/login");
  }

  const userRole = user.role?.name;
  const DashboardComponent = userRole ? dashboardComponents[userRole] : null;

  return (
    <PageLayout>
      <ErrorBoundary>
        <>
          {isError && (
            <div className="mb-6">
              <ErrorDisplay
                title="Error Loading Dashboard"
                message={error?.message || "An unknown error occurred."}
                onRetry={() => refetch()}
              />
            </div>
          )}
          {stats && DashboardComponent && <DashboardComponent stats={stats} />}
          {stats && !DashboardComponent && (
            <div className="text-center text-gray-500">
              <p>No dashboard view available for your role.</p>
            </div>
          )}
        </>
      </ErrorBoundary>
    </PageLayout>
  );
}