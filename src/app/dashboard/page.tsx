"use client";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Pusher from "pusher-js";
import { redirect } from "next/navigation";
import PageLayout from "@/components/PageLayout";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorDisplay from "@/components/ErrorDisplay";
import { DashboardStats } from "@/types/dashboard";
import { AdminDashboard } from "@/components/dashboard/AdminDashboard";
import { ManagerDashboard } from "@/components/dashboard/ManagerDashboard";
import { ProcurementOfficerDashboard } from "@/components/dashboard/ProcurementOfficerDashboard";
import { FinanceOfficerDashboard } from "@/components/dashboard/FinanceOfficerDashboard";
import { Role } from "@prisma/client";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const fetchDashboardData = async (): Promise<DashboardStats> => {
  const response = await fetch("/api/dashboard");
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to fetch dashboard data");
  }
  return response.json();
};

const dashboardComponents: { [key: string]: React.FC<{ stats: DashboardStats }> } = {
  Administrator: AdminDashboard,
  Manager: ManagerDashboard,
  Approver: ManagerDashboard, // Using ManagerDashboard for Approvers as well
  "Procurement Officer": ProcurementOfficerDashboard,
  "Finance Officer": FinanceOfficerDashboard,
};

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const {
    data: stats,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<DashboardStats>({
    queryKey: ["dashboardData"],
    queryFn: fetchDashboardData,
    enabled: status === "authenticated",
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    if (
      process.env.NEXT_PUBLIC_PUSHER_KEY &&
      process.env.NEXT_PUBLIC_PUSHER_KEY !== "placeholder"
    ) {
      const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY, {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      });

      const channel = pusher.subscribe("dashboard-channel");

      channel.bind("dashboard-update", () => {
        queryClient.invalidateQueries({ queryKey: ["dashboardData"] });
      });

      return () => {
        pusher.unsubscribe("dashboard-channel");
      };
    }
  }, [queryClient]);

  if (status === "loading" || isLoading) {
    return (
      <PageLayout title="Dashboard Overview">
        <LoadingSpinner />
      </PageLayout>
    );
  }

  if (!session) {
    redirect("/login");
  }

  const userRole = (session?.user?.role as Role)?.name;
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