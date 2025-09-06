// src/app/dashboard/page.tsx
import { auth } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="border-4 border-dashed border-gray-200 rounded-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Welcome to NexusProcure, {session.user?.name}!
          </h1>
          <p className="text-lg text-gray-600 mb-4">
            You are logged in as: {session.user?.email}
          </p>
          <p className="text-lg text-gray-600">
            Your role: <span className="font-semibold">{session.user?.role}</span>
          </p>
          
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-2">IOM Management</h2>
              <p className="text-gray-600">Create and manage Internal Office Memos</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-2">Purchase Orders</h2>
              <p className="text-gray-600">Manage purchase orders and vendor communications</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-2">Check Requests</h2>
              <p className="text-gray-600">Handle payment processing and check requests</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}