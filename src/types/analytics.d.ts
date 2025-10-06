export interface SpendData {
  name: string;
  Total?: number;
  value?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface AnalyticsData {
  spendOverTime: SpendData[];
  spendByCategory: SpendData[];
  spendByDepartment: SpendData[];
}