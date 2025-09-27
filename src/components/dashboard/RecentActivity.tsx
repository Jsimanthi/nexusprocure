"use client";
import Link from "next/link";
import { RecentActivityItem } from "@/types/dashboard";

interface RecentActivityProps {
  items: RecentActivityItem[];
}

export const RecentActivity = ({ items }: RecentActivityProps) => {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <h2 className="text-xl font-semibold">Recent Activity</h2>
      </div>
      <div className="divide-y divide-gray-200">
        {items.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="mt-2">No recent activity</p>
          </div>
        ) : (
          items.map((item: RecentActivityItem) => (
            <div
              key={item.id}
              className="px-6 py-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 truncate">
                    {item.type}: {item.title}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Status: {item.status.replace("_", " ")}
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
  );
};