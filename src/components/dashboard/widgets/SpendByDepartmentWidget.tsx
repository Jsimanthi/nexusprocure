"use client";

import { useQuery } from "@tanstack/react-query";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorDisplay from "@/components/ErrorDisplay";
import { formatCurrency } from "@/lib/utils";

interface SpendData {
  name: string;
  total: number;
}

const fetchSpendByDepartment = async (): Promise<SpendData[]> => {
  const response = await fetch("/api/analytics/spend-by-department");
  if (!response.ok) {
    throw new Error("Failed to fetch spend by department data");
  }
  return response.json();
};

const COLORS = ['#8884d8', '#82ca9d', '#FFBB28', '#FF8042', '#0088FE', '#00C49F'];

export default function SpendByDepartmentWidget() {
  const {
    data: spendData,
    isLoading,
    isError,
    error,
  } = useQuery<SpendData[]>({
    queryKey: ["spendByDepartment"],
    queryFn: fetchSpendByDepartment,
  });

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow h-[464px] flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Spend by Department</h2>
        <ErrorDisplay
          title="Error Loading Data"
          message={error?.message || "An unknown error occurred."}
        />
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">Spend by Department</h2>
      {spendData && spendData.length > 0 ? (
        <ResponsiveContainer width="100%" height={400}>
          <PieChart>
            <Pie
              data={spendData}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={150}
              fill="#8884d8"
              dataKey="total"
              nameKey="name"
            >
              {spendData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => formatCurrency(value as number, "INR")} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <div className="text-center py-16 h-[400px] flex items-center justify-center">
          <p className="text-gray-500">No departmental spending data available.</p>
        </div>
      )}
    </div>
  );
}