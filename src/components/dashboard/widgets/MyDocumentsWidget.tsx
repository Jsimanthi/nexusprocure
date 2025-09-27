"use client";
import Link from "next/link";
import { DashboardStats } from "@/types/dashboard";

interface MyDocumentsWidgetProps {
  stats: Pick<DashboardStats, "iomCount" | "poCount" | "prCount">;
}

export const MyDocumentsWidget = ({ stats }: MyDocumentsWidgetProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Link
        href="/iom"
        className="block bg-white p-6 rounded-lg shadow transition-shadow hover:shadow-md"
      >
        <h2 className="text-xl font-semibold mb-2">Your IOMs</h2>
        <p className="text-3xl font-bold text-blue-600">{stats.iomCount}</p>
        <p className="text-gray-600">Internal Memos you prepared</p>
      </Link>
      <Link
        href="/po"
        className="block bg-white p-6 rounded-lg shadow transition-shadow hover:shadow-md"
      >
        <h2 className="text-xl font-semibold mb-2">Your POs</h2>
        <p className="text-3xl font-bold text-green-600">{stats.poCount}</p>
        <p className="text-gray-600">Purchase Orders you prepared</p>
      </Link>
      <Link
        href="/pr"
        className="block bg-white p-6 rounded-lg shadow transition-shadow hover:shadow-md"
      >
        <h2 className="text-xl font-semibold mb-2">Your PRs</h2>
        <p className="text-3xl font-bold text-purple-600">{stats.prCount}</p>
        <p className="text-gray-600">Payment Requests you prepared</p>
      </Link>
    </div>
  );
};