"use client";
import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import Link from "next/link";
import PageLayout from "@/components/PageLayout";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorDisplay from "@/components/ErrorDisplay";

interface Iom {
  id: string;
  status: string;
  title: string;
  createdAt: string;
}

interface PurchaseOrder {
  id: string;
  status: string;
  title: string;
  createdAt: string;
}

interface CheckRequest {
  id: string;
  status: string;
  title: string;
  createdAt: string;
}

interface RecentActivityItem {
  id: string;
  type: 'IOM' | 'PO' | 'CR';
  date: string;
  status: string;
  title: string;
}

interface DashboardStats {
  iomCount: number;
  poCount: number;
  crCount: number;
  pendingApprovals: number;
  recentActivity: RecentActivityItem[];
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setError(null);
      const [iomsRes, posRes, crsRes] = await Promise.all([
        fetch("/api/iom"),
        fetch("/api/po"),
        fetch("/api/cr")
      ]);

      if (!iomsRes.ok || !posRes.ok || !crsRes.ok) {
        throw new Error("Failed to fetch dashboard data");
      }

      const iomsData = await iomsRes.json();
      const posData = await posRes.json();
      const crsData = await crsRes.json();

      const ioms: Iom[] = iomsData.data || [];
      const pos: PurchaseOrder[] = posData.data || [];
      const crs: CheckRequest[] = crsData.data || [];

      const pendingApprovals = ioms.filter((iom: Iom) =>
        iom.status === "SUBMITTED" || iom.status === "UNDER_REVIEW"
      ).length;

      const recentIoms = ioms.slice(0, 5).map((iom: Iom) => ({
        ...iom,
        type: 'IOM' as const, // Use 'as const' to infer literal type
        date: iom.createdAt
      }));

      const recentPos = pos.slice(0, 5).map((po: PurchaseOrder) => ({
        ...po,
        type: 'PO' as const,
        date: po.createdAt
      }));

      const recentCrs = crs.slice(0, 5).map((cr: CheckRequest) => ({
        ...cr,
        type: 'CR' as const,
        date: cr.createdAt
      }));

      const recentActivity = [...recentIoms, ...recentPos, ...recentCrs]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10);

      setStats({
        iomCount: ioms.length,
        poCount: pos.length,
        crCount: crs.length,
        pendingApprovals,
        recentActivity
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setError("Failed to load dashboard data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []); // Empty dependency array because this function doesn't rely on outside variables

  useEffect(() => {
    if (status === "authenticated") {
      fetchDashboardData();
    }
  }, [status, fetchDashboardData]); // Add fetchDashboardData to the dependency array

  if (status === "loading" || loading) {
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
        {error && (
          <div className="mb-6">
            <ErrorDisplay
              title="Error Loading Dashboard"
              message={error}
              onRetry={fetchDashboardData}
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
                  <h2 className="text-xl font-semibold mb-2">Check Requests</h2>
                  <p className="text-3xl font-bold text-purple-600">{stats.crCount}</p>
                  <p className="text-gray-600">Payment Requests</p>
                  <Link href="/cr" className="text-blue-600 hover:text-blue-800 text-sm mt-2 inline-block transition-colors">
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