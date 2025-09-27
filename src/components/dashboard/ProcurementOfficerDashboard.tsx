"use client";
import { DashboardStats } from "@/types/dashboard";
import { MyDocumentsWidget } from "./widgets/MyDocumentsWidget";
import { RecentActivityWidget } from "./widgets/RecentActivityWidget";

interface ProcurementOfficerDashboardProps {
  stats: DashboardStats;
}

export const ProcurementOfficerDashboard = ({
  stats,
}: ProcurementOfficerDashboardProps) => {
  return (
    <div className="space-y-8">
      <MyDocumentsWidget stats={stats} />
      <RecentActivityWidget items={stats.recentActivity} />
    </div>
  );
};