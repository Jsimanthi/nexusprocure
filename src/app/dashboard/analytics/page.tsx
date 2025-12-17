"use client";

import { DepartmentalSpendChart } from "@/components/analytics/DepartmentalSpendChart";
import { TopSpendersList } from "@/components/analytics/TopSpendersList";
import ErrorDisplay from "@/components/ErrorDisplay";
import LoadingSpinner from "@/components/LoadingSpinner";
import PageLayout from "@/components/PageLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { AnalyticsData, SpendData } from "@/types/analytics";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, DollarSign, PieChart as PieChartIcon, ShoppingBag, TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Area, AreaChart,
  CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis
} from "recharts";

const fetchAnalyticsData = async (): Promise<AnalyticsData> => {
  const response = await fetch("/api/analytics");
  if (!response.ok) {
    throw new Error("Failed to fetch analytics data");
  }
  return response.json();
};

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

// Custom Tooltip for Charts
const CustomTooltip = ({ active, payload, label, currency = true }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-slate-100 shadow-xl rounded-lg">
        <p className="font-semibold text-slate-700 mb-1">{label}</p>
        <p className="text-indigo-600 font-bold">
          {currency ? formatCurrency(payload[0].value, "INR") : payload[0].value}
        </p>
      </div>
    );
  }
  return null;
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

  // Calculate Summary Metrics
  const totalSpend = analyticsData?.spendOverTime?.reduce((acc, curr) => acc + (curr.Total || 0), 0) || 0;
  const avgMonthlySpend = analyticsData?.spendOverTime?.length
    ? totalSpend / analyticsData.spendOverTime.length
    : 0;
  const topCategory = analyticsData?.spendByCategory?.[0];
  const topVendor = analyticsData?.topVendors?.[0];

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
      <div className="space-y-8">

        {/* Metric Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-0 shadow bg-white rounded-xl overflow-hidden relative group hover:shadow-lg transition-shadow">
            <div className="absolute top-0 right-0 p-4 opacity-60 group-hover:opacity-100 transition-opacity">
              <DollarSign className="w-16 h-16 text-indigo-600" />
            </div>
            <CardHeader className="pb-2">
              <CardDescription className="font-medium text-slate-500">Total Spend YTD</CardDescription>
              <CardTitle className="text-2xl font-bold text-slate-800">{formatCurrency(totalSpend)}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs font-medium text-emerald-600 flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3" />
                To Date
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow bg-white rounded-xl overflow-hidden relative group hover:shadow-lg transition-shadow">
            <div className="absolute top-0 right-0 p-4 opacity-60 group-hover:opacity-100 transition-opacity">
              <TrendingUp className="w-16 h-16 text-emerald-600" />
            </div>
            <CardHeader className="pb-2">
              <CardDescription className="font-medium text-slate-500">Avg. Monthly Spend</CardDescription>
              <CardTitle className="text-2xl font-bold text-slate-800">{formatCurrency(avgMonthlySpend)}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs font-medium text-slate-400">
                Based on {analyticsData?.spendOverTime?.length} months
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow bg-white rounded-xl overflow-hidden relative group hover:shadow-lg transition-shadow">
            <div className="absolute top-0 right-0 p-4 opacity-60 group-hover:opacity-100 transition-opacity">
              <PieChartIcon className="w-16 h-16 text-amber-500" />
            </div>
            <CardHeader className="pb-2">
              <CardDescription className="font-medium text-slate-500">Top Spend Category</CardDescription>
              <CardTitle className="text-2xl font-bold text-slate-800 truncate" title={topCategory?.name}>
                {topCategory?.name || "N/A"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs font-medium text-slate-400">
                {topCategory ? formatCurrency(topCategory.value || 0) : "No Data"}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow bg-white rounded-xl overflow-hidden relative group hover:shadow-lg transition-shadow">
            <div className="absolute top-0 right-0 p-4 opacity-60 group-hover:opacity-100 transition-opacity">
              <ShoppingBag className="w-16 h-16 text-purple-500" />
            </div>
            <CardHeader className="pb-2">
              <CardDescription className="font-medium text-slate-500">Top Vendor</CardDescription>
              <CardTitle className="text-2xl font-bold text-slate-800 truncate" title={topVendor?.name}>
                {topVendor?.name || "N/A"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs font-medium text-slate-400">
                Highest Volume
              </div>
            </CardContent>
          </Card>
        </div>


        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Main Trend Chart (2/3 width) */}
          <Card className="lg:col-span-2 border-0 shadow bg-white rounded-xl">
            <CardHeader>
              <CardTitle>Spend Trend Analysis</CardTitle>
              <CardDescription>Monthly expenditure breakdown over the current fiscal year.</CardDescription>
            </CardHeader>
            <CardContent className="pl-0">
              {analyticsData?.spendOverTime && analyticsData.spendOverTime.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={analyticsData.spendOverTime} onClick={handleBarClick} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 12 }}
                      tickFormatter={(value) => `₹${value / 1000}k`}
                      dx={-10}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#6366f1', strokeWidth: 2 }} />
                    <Area
                      type="monotone"
                      dataKey="Total"
                      stroke="#6366f1"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorTotal)"
                      activeDot={{ r: 6, strokeWidth: 0, fill: '#4f46e5' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[350px] flex items-center justify-center text-slate-400">
                  No data available for trends.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Category Donut Chart (1/3 width) */}
          <Card className="border-0 shadow bg-white rounded-xl">
            <CardHeader>
              <CardTitle>Category Distribution</CardTitle>
              <CardDescription>Spending by category.</CardDescription>
            </CardHeader>
            <CardContent>
              {analyticsData?.spendByCategory && analyticsData.spendByCategory.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={analyticsData.spendByCategory}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      nameKey="name"
                      onClick={(data) => handlePieClick(data)}
                      cursor="pointer"
                    >
                      {analyticsData.spendByCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#64748b' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[350px] flex items-center justify-center text-slate-400">
                  No data available.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Row 3: Bottom Lists */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="border-0 shadow bg-white rounded-xl">
            <CardHeader>
              <CardTitle className="text-lg">Spend by Department</CardTitle>
            </CardHeader>
            <CardContent>
              <DepartmentalSpendChart data={analyticsData?.spendByDepartment || []} />
            </CardContent>
          </Card>

          <Card className="border-0 shadow bg-white rounded-xl">
            <CardHeader>
              <CardTitle className="text-lg">Top Vendors</CardTitle>
            </CardHeader>
            <CardContent>
              <TopSpendersList
                title=""
                data={analyticsData?.topVendors?.slice(0, 5) || []}
                isLoading={isLoading}
              />
            </CardContent>
          </Card>

          <Card className="border-0 shadow bg-white rounded-xl">
            <CardHeader>
              <CardTitle className="text-lg">Top Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <TopSpendersList
                title=""
                data={analyticsData?.topCategories?.slice(0, 5) || []}
                isLoading={isLoading}
              />
            </CardContent>
          </Card>
        </div>

      </div>
    </PageLayout>
  );
}