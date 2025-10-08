"use client";

import { SpendData } from "@/types/analytics";
import { formatCurrency } from "@/lib/utils";
import { List, ListItem } from "@/components/List"; // Assuming a reusable List component exists

interface TopSpendersListProps {
  title: string;
  data: SpendData[];
  isLoading: boolean;
}

export const TopSpendersList = ({ title, data, isLoading }: TopSpendersListProps) => {
  if (isLoading) {
    return (
      <div>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <div className="animate-pulse">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex justify-between py-2 border-b border-gray-100">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-gray-500 text-sm">No data available.</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <List>
        {data.map((item, index) => (
          <ListItem key={index} className="flex justify-between items-center">
            <span>{item.name}</span>
            <span className="font-medium text-gray-800">
              {formatCurrency(item.Total || 0, "INR")}
            </span>
          </ListItem>
        ))}
      </List>
    </div>
  );
};