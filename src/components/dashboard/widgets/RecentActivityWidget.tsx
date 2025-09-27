"use client";
import { RecentActivity } from "../RecentActivity";
import { RecentActivityItem } from "@/types/dashboard";

interface RecentActivityWidgetProps {
  items: RecentActivityItem[];
}

export const RecentActivityWidget = ({ items = [] }: RecentActivityWidgetProps) => {
  return <RecentActivity items={items} />;
};