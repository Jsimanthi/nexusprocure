// src/app/dashboard/layout.tsx
import DashboardHeader from "@/components/DashboardHeader";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-100">
      <DashboardHeader />
      <main>{children}</main>
    </div>
  );
}