"use client";

import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import PageLayout from '@/components/PageLayout';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorDisplay from '@/components/ErrorDisplay';
import { useHasPermission } from '@/hooks/useHasPermission';
import { formatCurrency } from '@/lib/utils';
import ReportSubscriptionToggle from '@/components/ReportSubscriptionToggle';

interface SpendSummaryData {
  chartData: { month: string; [key: string]: number | string }[];
  categories: string[];
}

const fetchSpendSummary = async (): Promise<SpendSummaryData> => {
  const response = await fetch('/api/reports/spend-summary');
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to fetch spend summary');
  }
  return response.json();
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function ReportsPage() {
  const canViewAnalytics = useHasPermission('VIEW_ANALYTICS');

  const { data, isLoading, isError, error } = useQuery<SpendSummaryData>({
    queryKey: ['spendSummary'],
    queryFn: fetchSpendSummary,
    enabled: canViewAnalytics,
  });

  if (!canViewAnalytics) {
    return (
      <PageLayout title="Reports">
        <ErrorDisplay title="Access Denied" message="You do not have permission to view reports." />
      </PageLayout>
    );
  }

  if (isLoading) {
    return (
      <PageLayout title="Reports">
        <LoadingSpinner />
      </PageLayout>
    );
  }

  if (isError) {
    return (
      <PageLayout title="Reports">
        <ErrorDisplay title="Could Not Load Report" message={error.message} />
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Spend Analysis Report">
        <div className="mb-8 bg-white p-4 rounded-lg shadow-sm">
            <h3 className="text-lg font-medium text-gray-900">Weekly Email Summary</h3>
            <p className="text-sm text-gray-500 mt-1">Subscribe to receive a weekly summary of procurement activities.</p>
            <ReportSubscriptionToggle />
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Monthly Spend by Category</h3>
            <p className="text-sm text-gray-600 mb-6">This chart shows the total spend across different procurement categories over the last 12 months.</p>

            {data && data.chartData.length > 0 ? (
                <div style={{ width: '100%', height: 400 }}>
                    <ResponsiveContainer>
                        <BarChart
                        data={data.chartData}
                        margin={{
                            top: 20,
                            right: 30,
                            left: 20,
                            bottom: 5,
                        }}
                        >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis tickFormatter={(value) => formatCurrency(Number(value), 'INR').replace('.00', '')} />
                        <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                        <Legend />
                        {data.categories.map((category, index) => (
                            <Bar key={category} dataKey={category} stackId="a" fill={COLORS[index % COLORS.length]} />
                        ))}
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <div className="text-center py-12">
                    <p className="text-gray-500">No spending data available for the last 12 months.</p>
                </div>
            )}
        </div>
    </PageLayout>
  );
}