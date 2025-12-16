"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface KpiCardProps {
  title: string;
  value: string;
  description: string;
}

export const KpiCard = ({ title, value, description }: KpiCardProps) => {
  return (
    <Card className="shadow hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-primary">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
};