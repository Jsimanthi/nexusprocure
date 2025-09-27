"use client";
import { DashboardStats } from "@/types/dashboard";
import { ApprovedPRsWidget } from "./widgets/ApprovedPRsWidget";
import { RecentActivityWidget } from "./widgets/RecentActivityWidget";

interface FinanceOfficerDashboardProps {
  stats: DashboardStats;
}

export const FinanceOfficerDashboard = ({
  stats,
}: FinanceOfficerDashboardProps) => {
  return (
    <div className="space-y-8">
      <ApprovedPRsWidget stats={stats} />
      <RecentActivityWidget items={stats.recentActivity} />
    </div>
  );
};