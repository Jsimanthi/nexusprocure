"use client";
import Link from "next/link";
import { DashboardStats } from "@/types/dashboard";

interface ApprovedPRsWidgetProps {
  stats: Pick<DashboardStats, "prCount">;
}

export const ApprovedPRsWidget = ({ stats }: ApprovedPRsWidgetProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Link
        href="/pr?status=APPROVED"
        className="block bg-green-50 border border-green-200 p-6 rounded-lg shadow-sm transition-shadow hover:shadow-md"
      >
        <h2 className="text-xl font-semibold mb-2">Approved PRs</h2>
        <p className="text-3xl font-bold text-green-600">{stats.prCount}</p>
        <p className="text-gray-600">Payment Requests ready for processing</p>
      </Link>
    </div>
  );
};