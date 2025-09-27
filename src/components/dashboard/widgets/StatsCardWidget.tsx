"use client";
import Link from "next/link";
import { DashboardStats } from "@/types/dashboard";

interface StatsCardWidgetProps {
  stats: Pick<DashboardStats, "iomCount" | "poCount" | "prCount" | "pendingApprovals">;
}

export const StatsCardWidget = ({ stats }: StatsCardWidgetProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Link
        href="/iom"
        className="block bg-white p-6 rounded-lg shadow transition-shadow hover:shadow-md"
      >
        <h2 className="text-xl font-semibold mb-2">Total IOMs</h2>
        <p className="text-3xl font-bold text-blue-600">{stats?.iomCount ?? 0}</p>
        <p className="text-gray-600">All Internal Office Memos</p>
      </Link>
      <Link
        href="/po"
        className="block bg-white p-6 rounded-lg shadow transition-shadow hover:shadow-md"
      >
        <h2 className="text-xl font-semibold mb-2">Total POs</h2>
        <p className="text-3xl font-bold text-green-600">{stats?.poCount ?? 0}</p>
        <p className="text-gray-600">All Purchase Orders</p>
      </Link>
      <Link
        href="/pr"
        className="block bg-white p-6 rounded-lg shadow transition-shadow hover:shadow-md"
      >
        <h2 className="text-xl font-semibold mb-2">Total PRs</h2>
        <p className="text-3xl font-bold text-purple-600">{stats?.prCount ?? 0}</p>
        <p className="text-gray-600">All Payment Requests</p>
      </Link>
      <Link
        href="/iom?status=PENDING_APPROVAL,SUBMITTED,UNDER_REVIEW"
        className="block bg-white p-6 rounded-lg shadow transition-shadow hover:shadow-md"
      >
        <h2 className="text-xl font-semibold mb-2">Pending Approvals</h2>
        <p className="text-3xl font-bold text-yellow-600">
          {stats?.pendingApprovals ?? 0}
        </p>
        <p className="text-gray-600">Across all documents</p>
      </Link>
    </div>
  );
};