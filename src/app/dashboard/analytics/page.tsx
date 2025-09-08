"use client";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const fetchAnalyticsData = async () => {
  const response = await fetch("/api/analytics");
  if (!response.ok) {
    throw new Error("Failed to fetch analytics data");
  }
  return response.json();
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function AnalyticsPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["analytics"],
    queryFn: fetchAnalyticsData,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-600">
        Error: {error.message}
      </div>
    );
  }

  const { documentCounts, poStatusCounts, spendingByMonth } = data;

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Analytics & Reports</h1>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-gray-500 text-sm font-medium">Total Purchase Orders</h3>
                <p className="text-3xl font-bold mt-2">{documentCounts.purchaseOrders}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-gray-500 text-sm font-medium">Total IOMs</h3>
                <p className="text-3xl font-bold mt-2">{documentCounts.ioms}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-gray-500 text-sm font-medium">Total Check Requests</h3>
                <p className="text-3xl font-bold mt-2">{documentCounts.checkRequests}</p>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* PO Status Distribution */}
            <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="font-semibold mb-4">Purchase Order Status</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie data={poStatusCounts} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={100} fill="#8884d8" label>
                            {poStatusCounts.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </div>

            {/* Monthly Spending */}
            <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="font-semibold mb-4">Approved PO Spending (Last 12 Months)</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={spendingByMonth}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip formatter={(value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value)} />
                        <Legend />
                        <Bar dataKey="total" fill="#82ca9d" name="Total Spending" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
      </div>
    </div>
  );
}