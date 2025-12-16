"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RecentActivityItem } from "@/types/dashboard";
import { Activity } from "lucide-react";
import { RecentActivity } from "../RecentActivity";

interface RecentActivityWidgetProps {
  items: RecentActivityItem[];
}

export const RecentActivityWidget = ({ items = [] }: RecentActivityWidgetProps) => {
  return (
    <Card className="col-span-1 lg:col-span-2 shadow-md hover:shadow-lg transition-shadow">
      <CardHeader className="flex flex-row items-center space-y-0 pb-2 gap-2">
        <Activity className="h-4 w-4 text-primary" />
        <CardTitle className="text-base font-semibold text-foreground">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <RecentActivity items={items} />
      </CardContent>
    </Card>
  );
};