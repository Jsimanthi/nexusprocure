"use client";
import Link from "next/link";
import { DashboardStats } from "@/types/dashboard";

interface ActionItemsWidgetProps {
  stats: Pick<DashboardStats, "pendingApprovals" | "iomCount" | "poCount">;
}

export const ActionItemsWidget = ({ stats }: ActionItemsWidgetProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Link
        href="/iom?status=PENDING_APPROVAL,SUBMITTED,UNDER_REVIEW"
        className="block bg-yellow-50 border border-yellow-200 p-6 rounded-lg shadow-sm transition-shadow hover:shadow-md"
      >
        <h2 className="text-xl font-semibold mb-2">Action Items</h2>
        <p className="text-3xl font-bold text-yellow-600">
          {stats.pendingApprovals}
        </p>
        <p className="text-gray-600">Documents awaiting your review</p>
      </Link>
      <Link
        href="/iom"
        className="block bg-white p-6 rounded-lg shadow transition-shadow hover:shadow-md"
      >
        <h2 className="text-xl font-semibold mb-2">Your Involved IOMs</h2>
        <p className="text-3xl font-bold text-blue-600">{stats.iomCount}</p>
      </Link>
      <Link
        href="/po"
        className="block bg-white p-6 rounded-lg shadow transition-shadow hover:shadow-md"
      >
        <h2 className="text-xl font-semibold mb-2">Your Involved POs</h2>
        <p className="text-3xl font-bold text-green-600">{stats.poCount}</p>
      </Link>
    </div>
  );
};