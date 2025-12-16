"use client";
import { DashboardStats } from "@/types/dashboard";
import { KpiWidget } from "./widgets/KpiWidget";
import { RecentActivityWidget } from "./widgets/RecentActivityWidget";
import { SmartSummary } from "./widgets/SmartSummary";
import { SpendAnalysisChart } from "./widgets/SpendAnalysisChart";
import { StatsCardWidget } from "./widgets/StatsCardWidget";

interface AdminDashboardProps {
  stats: DashboardStats;
}

export const AdminDashboard = ({ stats }: AdminDashboardProps) => {
  return (
    <div className="space-y-6">
      <StatsCardWidget stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <SpendAnalysisChart />
          <RecentActivityWidget items={stats.recentActivity} />
        </div>
        <div className="space-y-6">
          <SmartSummary />
          {stats.kpis && <KpiWidget kpis={stats.kpis} />}
        </div>
      </div>
    </div>
  );
};