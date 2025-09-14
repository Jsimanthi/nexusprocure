"use client";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Pusher from "pusher-js";
import { redirect } from "next/navigation";
import Link from "next/link";
import PageLayout from "@/components/PageLayout";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorDisplay from "@/components/ErrorDisplay";

interface RecentActivityItem {
  id: string;
  type: 'IOM' | 'PO' | 'PR';
  date: string;
  status: string;
  title: string;
}

interface DashboardStats {
  iomCount: number;
  poCount: number;
  prCount: number;
  pendingApprovals: number;
  recentActivity: RecentActivityItem[];
}

const fetchDashboardData = async (): Promise<DashboardStats> => {
  const response = await fetch("/api/dashboard");
  if (!response.ok) {
    throw new Error("Failed to fetch dashboard data");
  }
  return response.json();
};

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const {
    data: stats,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery<DashboardStats>({
    queryKey: ["dashboardData"],
    queryFn: fetchDashboardData,
    enabled: status === "authenticated",
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_PUSHER_KEY && process.env.NEXT_PUBLIC_PUSHER_KEY !== 'placeholder') {
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

  return (
    <PageLayout title="Dashboard Overview">
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
        {stats && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-lg shadow transition-shadow hover:shadow-md">
                  <h2 className="text-xl font-semibold mb-2">IOMs</h2>
                  <p className="text-3xl font-bold text-blue-600">{stats.iomCount}</p>
                  <p className="text-gray-600">Internal Office Memos</p>
                  <Link href="/iom" className="text-blue-600 hover:text-blue-800 text-sm mt-2 inline-block transition-colors">
                    View all →
                  </Link>
                </div>
                <div className="bg-white p-6 rounded-lg shadow transition-shadow hover:shadow-md">
                  <h2 className="text-xl font-semibold mb-2">Purchase Orders</h2>
                  <p className="text-3xl font-bold text-green-600">{stats.poCount}</p>
                  <p className="text-gray-600">Vendor Orders</p>
                  <Link href="/po" className="text-blue-600 hover:text-blue-800 text-sm mt-2 inline-block transition-colors">
                    View all →
                  </Link>
                </div>
                <div className="bg-white p-6 rounded-lg shadow transition-shadow hover:shadow-md">
                  <h2 className="text-xl font-semibold mb-2">Payment Requests</h2>
                  <p className="text-3xl font-bold text-purple-600">{stats.prCount}</p>
                  <p className="text-gray-600">Payment Requests</p>
                  <Link href="/pr" className="text-blue-600 hover:text-blue-800 text-sm mt-2 inline-block transition-colors">
                    View all →
                  </Link>
                </div>
                <div className="bg-white p-6 rounded-lg shadow transition-shadow hover:shadow-md">
                  <h2 className="text-xl font-semibold mb-2">Pending Approval</h2>
                  <p className="text-3xl font-bold text-yellow-600">{stats.pendingApprovals}</p>
                  <p className="text-gray-600">Items needing review</p>
                  <Link href="/iom" className="text-blue-600 hover:text-blue-800 text-sm mt-2 inline-block transition-colors">
                    Review now →
                  </Link>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <h2 className="text-xl font-semibold">Recent Activity</h2>
                </div>
                <div className="divide-y divide-gray-200">
                  {stats.recentActivity.length === 0 ? (
                    <div className="px-6 py-8 text-center text-gray-500">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="mt-2">No recent activity</p>
                    </div>
                  ) : (
                    stats.recentActivity.map((item: RecentActivityItem) => (
                      <div key={item.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-gray-900 truncate">
                              {item.type}: {item.title}
                            </h3>
                            <p className="text-sm text-gray-500 mt-1">
                              Status: {item.status.replace('_', ' ')}
                            </p>
                          </div>
                          <div className="ml-4 flex-shrink-0 text-right">
                            <p className="text-sm text-gray-500 whitespace-nowrap">
                              {new Date(item.date).toLocaleDateString()}
                            </p>
                            <Link
                              href={`/${item.type.toLowerCase()}/${item.id}`}
                              className="text-sm text-blue-600 hover:text-blue-800 transition-colors whitespace-nowrap"
                            >
                              View Details →
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
      </>
    </PageLayout>
  );
}