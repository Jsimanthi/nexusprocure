// src/app/dashboard/analytics/page.tsx
"use client";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import DashboardHeader from "@/components/DashboardHeader";

const fetchAnalyticsData = async () => {
  const response = await fetch("/api/analytics");
  if (!response.ok) {
    throw new Error("Failed to fetch analytics data");
  }
  return response.json();
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

// Define types for the analytics data
interface AnalyticsData {
  documentCounts: {
    purchaseOrders: number;
    ioms: number;
    checkRequests: number;
  };
  poStatusCounts: Array<{
    status: string;
    count: number;
  }>;
  spendingByMonth: Array<{
    month: string;
    total: number;
  }>;
}

export default function AnalyticsPage() {
  const { data, isLoading, isError, error } = useQuery<AnalyticsData>({
    queryKey: ["analytics"],
    queryFn: fetchAnalyticsData,
    retry: 2,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <DashboardHeader />
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-gray-100">
        <DashboardHeader />
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <svg className="mx-auto h-12 w-12 text-red-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h3 className="text-lg font-medium text-red-800 mb-2">Error Loading Analytics</h3>
              <p className="text-red-700">{error.message}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Use default values if data is undefined
  const documentCounts = data?.documentCounts || {
    purchaseOrders: 0,
    ioms: 0,
    checkRequests: 0
  };

  const poStatusCounts = data?.poStatusCounts || [];
  const spendingByMonth = data?.spendingByMonth || [];

  return (
    <div className="min-h-screen bg-gray-100">
      <DashboardHeader />
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Analytics & Reports</h1>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow transition-shadow hover:shadow-md">
              <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wide">Total Purchase Orders</h3>
              <p className="text-3xl font-bold text-gray-900 mt-2">{documentCounts.purchaseOrders}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow transition-shadow hover:shadow-md">
              <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wide">Total IOMs</h3>
              <p className="text-3xl font-bold text-gray-900 mt-2">{documentCounts.ioms}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow transition-shadow hover:shadow-md">
              <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wide">Total Check Requests</h3>
              <p className="text-3xl font-bold text-gray-900 mt-2">{documentCounts.checkRequests}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* PO Status Distribution */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="font-semibold text-lg mb-4 text-gray-900">Purchase Order Status Distribution</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie 
                      data={poStatusCounts} 
                      dataKey="count" 
                      nameKey="status" 
                      cx="50%" 
                      cy="50%" 
                      outerRadius={80} 
                      fill="#8884d8" 
                      label={({ name, percent }) => `${name}: ${(percent! * 100).toFixed(0)}%`}
                    >
                      {poStatusCounts.map((entry: { status: string; count: number }, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number, name: string) => [
                        value, 
                        name.replace('_', ' ')
                      ]}
                    />
                    <Legend 
                      formatter={(value: string) => value.replace('_', ' ')}
                      layout="vertical"
                      verticalAlign="middle"
                      align="right"
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Monthly Spending */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="font-semibold text-lg mb-4 text-gray-900">Approved PO Spending (Last 12 Months)</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={spendingByMonth}
                    margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="month" 
                      angle={-45}
                      textAnchor="end"
                      height={60}
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                      }}
                    />
                    <YAxis 
                      tickFormatter={(value) => `₹${value.toLocaleString()}`}
                    />
                    <Tooltip 
                      formatter={(value: number) => [
                        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value),
                        'Total Spending'
                      ]}
                      labelFormatter={(value) => {
                        const date = new Date(value);
                        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                      }}
                    />
                    <Legend />
                    <Bar 
                      dataKey="total" 
                      fill="#82ca9d" 
                      name="Total Spending" 
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}