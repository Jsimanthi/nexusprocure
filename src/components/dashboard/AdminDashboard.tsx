"use client";
import { DashboardStats } from "@/types/dashboard";
import { KpiWidget } from "./widgets/KpiWidget";
import { RecentActivityWidget } from "./widgets/RecentActivityWidget";
import { StatsCardWidget } from "./widgets/StatsCardWidget";

interface AdminDashboardProps {
  stats: DashboardStats;
}

export const AdminDashboard = ({ stats }: AdminDashboardProps) => {
  return (
    <div className="space-y-8">
      <StatsCardWidget stats={stats} />
      {stats.kpis && <KpiWidget kpis={stats.kpis} />}
      <RecentActivityWidget items={stats.recentActivity} />
    </div>
  );
};