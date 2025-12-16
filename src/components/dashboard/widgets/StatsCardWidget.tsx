"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardStats } from "@/types/dashboard";
import { Clock, CreditCard, FileText, ShoppingCart } from "lucide-react";
import Link from "next/link";

interface StatsCardWidgetProps {
  stats: Pick<DashboardStats, "iomCount" | "poCount" | "prCount" | "pendingApprovals">;
}

export const StatsCardWidget = ({ stats }: StatsCardWidgetProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Link href="/iom" className="group">
        <Card className="hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-500/10 transition-all cursor-pointer h-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total IOMs</CardTitle>
            <FileText className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-indigo-400">{stats?.iomCount ?? 0}</div>
            <p className="text-xs text-muted-foreground">All Internal Office Memos</p>
          </CardContent>
        </Card>
      </Link>

      <Link href="/po" className="group">
        <Card className="hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/10 transition-all cursor-pointer h-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total POs</CardTitle>
            <ShoppingCart className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-emerald-400">{stats?.poCount ?? 0}</div>
            <p className="text-xs text-muted-foreground">All Purchase Orders</p>
          </CardContent>
        </Card>
      </Link>

      <Link href="/pr" className="group">
        <Card className="hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10 transition-all cursor-pointer h-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total PRs</CardTitle>
            <CreditCard className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-purple-400">{stats?.prCount ?? 0}</div>
            <p className="text-xs text-muted-foreground">All Payment Requests</p>
          </CardContent>
        </Card>
      </Link>

      <Link href="/iom?status=PENDING_APPROVAL,SUBMITTED,UNDER_REVIEW" className="group">
        <Card className="hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/10 transition-all cursor-pointer h-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-600 to-amber-400">{stats?.pendingApprovals ?? 0}</div>
            <p className="text-xs text-muted-foreground">Action required</p>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
};