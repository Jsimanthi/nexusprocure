"use client";

import PageLayout from "@/components/PageLayout";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorDisplay from "@/components/ErrorDisplay";
import { formatCurrency } from "@/lib/utils";

interface SpendData {
  name: string;
  Total?: number;
  value?: number;
}

interface AnalyticsData {
  spendOverTime: SpendData[];
  spendByCategory: SpendData[];
  spendByDepartment: SpendData[];
  topVendors: SpendData[];
  topDepartments: SpendData[];
  topCategories: SpendData[];
}

const fetchAnalyticsData = async (): Promise<AnalyticsData> => {
  const response = await fetch("/api/analytics");
  if (!response.ok) {
    throw new Error("Failed to fetch analytics data");
  }
  return response.json();
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function AnalyticsPage() {
  const router = useRouter();
  const {
    data: analyticsData,
    isLoading,
    isError,
    error,
  } = useQuery<AnalyticsData>({
    queryKey: ["analyticsData"],
    queryFn: fetchAnalyticsData,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleBarClick = (data: any) => {
    if (data && data.activePayload && data.activePayload.length > 0) {
      const month = data.activePayload[0].payload.name;
      router.push(`/po?month=${month}`);
    }
  };

  const handlePieClick = (data: SpendData) => {
    if (data && data.name) {
      router.push(`/po?category=${encodeURIComponent(data.name)}`);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleDeptBarClick = (data: any) => {
    if (data && data.activePayload && data.activePayload.length > 0) {
      const department = data.activePayload[0].payload.name;
      router.push(`/po?department=${encodeURIComponent(department)}`);
    }
  };

  const handleTopSpenderClick = (
    type: "vendorName" | "department" | "category",
    name: string
  ) => {
    if (name) {
      router.push(`/po?${type}=${encodeURIComponent(name)}`);
    }
  };

  if (isLoading) {
    return (
      <PageLayout title="Analytics & Reporting">
        <LoadingSpinner />
      </PageLayout>
    );
  }

  if (isError) {
    return (
      <PageLayout title="Analytics & Reporting">
        <ErrorDisplay
          title="Error Loading Analytics"
          message={error?.message || "An unknown error occurred."}
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Analytics & Reporting">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Spend Over Time</h2>
          {analyticsData?.spendOverTime && analyticsData.spendOverTime.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={analyticsData.spendOverTime} onClick={handleBarClick}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(value) => formatCurrency(value as number, "INR").split(".")[0]} />
                <Tooltip formatter={(value) => formatCurrency(value as number, "INR")} />
                <Legend />
                <Bar dataKey="Total" fill="#8884d8" cursor="pointer" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-16 h-[400px] flex items-center justify-center">
              <p className="text-gray-500">No spending data available to display.</p>
            </div>
          )}
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Spend by Category</h2>
            {analyticsData?.spendByCategory && analyticsData.spendByCategory.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                    <PieChart>
                        <Pie
                            data={analyticsData.spendByCategory}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={150}
                            fill="#8884d8"
                            dataKey="value"
                            nameKey="name"
                            onClick={(data) => handlePieClick(data)}
                            cursor="pointer"
                        >
                            {analyticsData.spendByCategory.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatCurrency(value as number, "INR")} />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            ) : (
                <div className="text-center py-16 h-[400px] flex items-center justify-center">
                    <p className="text-gray-500">No category spending data available.</p>
                </div>
            )}
        </div>
      </div>

      <div className="mt-8 bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Spend by Department</h2>
        {analyticsData?.spendByDepartment && analyticsData.spendByDepartment.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={analyticsData.spendByDepartment} onClick={handleDeptBarClick} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={(value) => formatCurrency(value as number, "INR").split(".")[0]} />
              <YAxis type="category" dataKey="name" width={150} />
              <Tooltip formatter={(value) => formatCurrency(value as number, "INR")} />
              <Legend />
              <Bar dataKey="Total" fill="#FF8042" cursor="pointer" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-16 h-[400px] flex items-center justify-center">
            <p className="text-gray-500">No departmental spending data available.</p>
          </div>
        )}
      </div>

      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Top 5 Spenders</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <TopSpenderList
            title="By Vendor"
            data={analyticsData?.topVendors}
            onClick={(name) => handleTopSpenderClick("vendorName", name)}
          />
          <TopSpenderList
            title="By Department"
            data={analyticsData?.topDepartments}
            onClick={(name) => handleTopSpenderClick("department", name)}
          />
          <TopSpenderList
            title="By Category"
            data={analyticsData?.topCategories}
            onClick={(name) => handleTopSpenderClick("category", name)}
          />
        </div>
      </div>
    </PageLayout>
  );
}

const TopSpenderList: React.FC<{
  title: string;
  data: SpendData[] | undefined;
  onClick: (name: string) => void;
}> = ({ title, data, onClick }) => (
  <div className="bg-white p-6 rounded-lg shadow">
    <h3 className="text-xl font-semibold mb-4">{title}</h3>
    {data && data.length > 0 ? (
      <ul className="space-y-4">
        {data.map((item, index) => (
          <li
            key={index}
            onClick={() => onClick(item.name)}
            className="flex justify-between items-center p-2 rounded-md hover:bg-gray-100 cursor-pointer"
          >
            <span className="font-medium text-gray-700">{item.name}</span>
            <span className="font-semibold text-gray-900">
              {formatCurrency(item.Total || 0, "INR")}
            </span>
          </li>
        ))}
      </ul>
    ) : (
      <p className="text-gray-500">No data available.</p>
    )}
  </div>
);