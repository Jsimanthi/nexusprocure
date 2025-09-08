// src/components/DashboardHeader.tsx
"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import Notifications from "./Notifications";

export default function DashboardHeader() {
  const { data: session } = useSession();

  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-gray-900">NexusProcure</h1>
            <nav className="ml-8 space-x-4">
              <Link href="/dashboard" className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
                Dashboard
              </Link>
              <Link href="/iom" className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
                IOM Management
              </Link>
              <Link href="/po" className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
                Purchase Orders
              </Link>
              <Link href="/vendors" className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
                Vendors
              </Link>
              <Link href="/cr" className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
                Check Requests
              </Link>
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            <Notifications />
            <span className="text-sm text-gray-700">
              Welcome, {session?.user?.name}
            </span>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}