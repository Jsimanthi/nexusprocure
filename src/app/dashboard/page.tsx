// src/app/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import Link from "next/link";

interface DashboardStats {
  iomCount: number;
  poCount: number;
  crCount: number;
  pendingApprovals: number;
  recentActivity: any[];
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "authenticated") {
      fetchDashboardData();
    }
  }, [status]);

  const fetchDashboardData = async () => {
    try {
      setError(null);
      // Fetch all data in parallel
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

      // Extract the actual arrays from the response objects
      const ioms = iomsData.data || [];
      const pos = posData.data || [];
      const crs = crsData.data || [];

      const pendingApprovals = ioms.filter((iom: any) =>
        iom.status === "SUBMITTED" || iom.status === "UNDER_REVIEW"
      ).length;

      // Get recent activity (last 5 items from each category)
      const recentIoms = ioms.slice(0, 5).map((iom: any) => ({
        ...iom,
        type: 'IOM',
        date: iom.createdAt
      }));

      const recentPos = pos.slice(0, 5).map((po: any) => ({
        ...po,
        type: 'PO',
        date: po.createdAt
      }));

      const recentCrs = crs.slice(0, 5).map((cr: any) => ({
        ...cr,
        type: 'CR',
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
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Dashboard Overview
        </h1>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
                <button
                  onClick={fetchDashboardData}
                  className="text-sm text-red-800 underline mt-2"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        )}

        {stats && (
          <>
            {/* Stats Grid */}
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

            {/* Recent Activity */}
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
                  stats.recentActivity.map((item: any) => (
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
      </div>
    </div>
  );
}