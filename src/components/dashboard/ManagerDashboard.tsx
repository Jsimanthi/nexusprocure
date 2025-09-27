"use client";
import { DashboardStats } from "@/types/dashboard";
import { ActionItemsWidget } from "./widgets/ActionItemsWidget";
import { RecentActivityWidget } from "./widgets/RecentActivityWidget";

interface ManagerDashboardProps {
  stats: DashboardStats;
}

export const ManagerDashboard = ({ stats }: ManagerDashboardProps) => {
  return (
    <div className="space-y-8">
      <ActionItemsWidget stats={stats} />
      <RecentActivityWidget items={stats.recentActivity} />
    </div>
  );
};