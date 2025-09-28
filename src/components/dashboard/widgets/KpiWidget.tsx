"use client";
import { KpiCard } from "../KpiCard";
import { Kpi } from "@/types/dashboard";

interface KpiWidgetProps {
  kpis: Kpi;
}

export const KpiWidget = ({ kpis }: KpiWidgetProps) => {
  const formatDays = (days: number | undefined) => {
    if (days === undefined || days === 0) return "N/A";
    return `${days.toFixed(1)} days`;
  };

  const formatPercentage = (rate: number | undefined) => {
    if (rate === undefined) return "N/A";
    return `${rate.toFixed(1)}%`;
  };

  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined) return "N/A";
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Key Performance Indicators</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <KpiCard
          title="Avg. IOM Approval Time"
          value={formatDays(kpis?.avgIomApprovalTime)}
          description="Average time from creation to approval for IOMs."
        />
        <KpiCard
          title="Avg. PO Approval Time"
          value={formatDays(kpis?.avgPoApprovalTime)}
          description="Average time from creation to approval for POs."
        />
        <KpiCard
          title="Avg. PR Approval Time"
          value={formatDays(kpis?.avgPrApprovalTime)}
          description="Average time from creation to approval for PRs."
        />
        <KpiCard
          title="Avg. Procurement Cycle Time"
          value={formatDays(kpis?.avgProcurementCycleTime)}
          description="Average time from IOM creation to PO fulfillment."
        />
        <KpiCard
          title="Emergency Purchase Rate"
          value={formatPercentage(kpis?.emergencyPurchaseRate)}
          description="The percentage of all IOMs marked as urgent."
        />
        <KpiCard
          title="Total Spend (This Month)"
          value={formatCurrency(kpis?.totalSpendThisMonth)}
          description="Total value of all fulfilled POs this month."
        />
      </div>
    </div>
  );
};