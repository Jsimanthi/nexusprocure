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

  useEffect(() => {
    if (status === "authenticated") {
      fetchDashboardData();
    }
  }, [status]);

  const fetchDashboardData = async () => {
    try {
      // Fetch all data in parallel
      const [iomsRes, posRes, crsRes] = await Promise.all([
        fetch("/api/iom"),
        fetch("/api/po"),
        fetch("/api/cr")
      ]);

      const ioms = await iomsRes.json();
      const pos = await posRes.json();
      const crs = await crsRes.json();

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

        {stats && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-2">IOMs</h2>
                <p className="text-3xl font-bold text-blue-600">{stats.iomCount}</p>
                <p className="text-gray-600">Internal Office Memos</p>
                <Link href="/iom" className="text-blue-600 hover:text-blue-800 text-sm mt-2 inline-block">
                  View all →
                </Link>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-2">Purchase Orders</h2>
                <p className="text-3xl font-bold text-green-600">{stats.poCount}</p>
                <p className="text-gray-600">Vendor Orders</p>
                <Link href="/po" className="text-blue-600 hover:text-blue-800 text-sm mt-2 inline-block">
                  View all →
                </Link>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-2">Check Requests</h2>
                <p className="text-3xl font-bold text-purple-600">{stats.crCount}</p>
                <p className="text-gray-600">Payment Requests</p>
                <Link href="/cr" className="text-blue-600 hover:text-blue-800 text-sm mt-2 inline-block">
                  View all →
                </Link>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-2">Pending Approval</h2>
                <p className="text-3xl font-bold text-yellow-600">{stats.pendingApprovals}</p>
                <p className="text-gray-600">Items needing review</p>
                <Link href="/iom" className="text-blue-600 hover:text-blue-800 text-sm mt-2 inline-block">
                  Review now →
                </Link>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold">Recent Activity</h2>
              </div>
              <div className="divide-y divide-gray-200">
                {stats.recentActivity.length === 0 ? (
                  <div className="px-6 py-4 text-center text-gray-500">
                    No recent activity
                  </div>
                ) : (
                  stats.recentActivity.map((item: any) => (
                    <div key={item.id} className="px-6 py-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-medium text-gray-900">
                            {item.type}: {item.title}
                          </h3>
                          <p className="text-sm text-gray-500">
                            Status: {item.status.replace('_', ' ')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">
                            {new Date(item.date).toLocaleDateString()}
                          </p>
                          <Link 
                            href={`/${item.type.toLowerCase()}/${item.id}`}
                            className="text-sm text-blue-600 hover:text-blue-800"
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