"use client";

interface KpiCardProps {
  title: string;
  value: string;
  description: string;
}

export const KpiCard = ({ title, value, description }: KpiCardProps) => {
  return (
    <div className="bg-white p-4 rounded-lg shadow transition-shadow hover:shadow-md">
      <h3 className="text-lg font-semibold text-gray-700">{title}</h3>
      <p className="text-2xl font-bold text-indigo-600 my-2">{value}</p>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
  );
};