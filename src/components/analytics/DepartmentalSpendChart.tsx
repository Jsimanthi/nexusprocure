"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import { formatCurrency } from "@/lib/utils";

interface SpendData {
  name: string;
  Total: number;
}

interface DepartmentalSpendChartProps {
  data: SpendData[];
}

export const DepartmentalSpendChart = ({ data }: DepartmentalSpendChartProps) => {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-16 h-[400px] flex items-center justify-center">
        <p className="text-gray-500">No departmental spending data available.</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{
          top: 5,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" tickFormatter={(value) => formatCurrency(value as number, "INR").split(".")[0]} />
        <YAxis dataKey="name" type="category" width={150} />
        <Tooltip formatter={(value) => formatCurrency(value as number, "INR")} />
        <Legend />
        <Bar dataKey="Total" fill="#00C49F" />
      </BarChart>
    </ResponsiveContainer>
  );
};