export interface RecentActivityItem {
  id: string;
  type: "IOM" | "PO" | "PR";
  date: string;
  status: string;
  title: string;
}

export interface Kpi {
  avgIomApprovalTime?: number;
  avgPoApprovalTime?: number;
  avgPrApprovalTime?: number;
  avgProcurementCycleTime?: number;
  emergencyPurchaseRate?: number;
  totalSpendThisMonth?: number;
}

export interface DashboardStats {
  iomCount: number;
  poCount: number;
  prCount: number;
  pendingApprovals: number;
  recentActivity: RecentActivityItem[];
  kpis: Kpi;
}