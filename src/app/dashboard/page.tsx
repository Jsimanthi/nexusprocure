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
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "authenticated") {
      fetchDashboardStats();
    }
  }, [status]);

  const fetchDashboardStats = async () => {
    try {
      // In a real app, you'd have an API endpoint for dashboard stats
      // For now, we'll fetch counts from each endpoint
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

      setStats({
        iomCount: ioms.length,
        poCount: pos.length,
        crCount: crs.length,
        pendingApprovals
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
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
        <div className="border-4 border-dashed border-gray-200 rounded-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Welcome to NexusProcure, {session.user?.name}!
          </h1>
          <p className="text-lg text-gray-600 mb-4">
            You are logged in as: {session.user?.email}
          </p>
          <p className="text-lg text-gray-600">
            Your role: <span className="font-semibold">{session.user?.role}</span>
          </p>
          
          {stats && (
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
          )}
        </div>
      </div>
    </div>
  );
}