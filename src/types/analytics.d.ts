export interface SpendData {
  name: string;
  Total?: number;
  value?: number;
}

export interface AnalyticsData {
  spendOverTime: SpendData[];
  spendByCategory: SpendData[];
  spendByDepartment: SpendData[];
}