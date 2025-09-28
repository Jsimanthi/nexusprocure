"use client";

import PageLayout from "@/components/PageLayout";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorDisplay from "@/components/ErrorDisplay";
import { formatCurrency } from "@/lib/utils";

interface AnalyticsData {
  spendOverTime: { name: string; Total: number }[];
}

interface BarClickData {
  activePayload?: {
    payload: {
      name: string;
    };
  }[];
}

const fetchAnalyticsData = async (): Promise<AnalyticsData> => {
  const response = await fetch("/api/analytics");
  if (!response.ok) {
    throw new Error("Failed to fetch analytics data");
  }
  return response.json();
};

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
      <div className="grid grid-cols-1 gap-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Spend Over Time</h2>
          {analyticsData?.spendOverTime && analyticsData.spendOverTime.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={analyticsData.spendOverTime}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
                onClick={handleBarClick}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis
                  tickFormatter={(value) =>
                    formatCurrency(value as number, "INR").split(".")[0]
                  }
                />
                <Tooltip
                  formatter={(value) => formatCurrency(value as number, "INR")}
                />
                <Legend />
                <Bar dataKey="Total" fill="#8884d8" cursor="pointer" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-16">
              <p className="text-gray-500">No spending data available to display.</p>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}