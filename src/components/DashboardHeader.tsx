// src/components/DashboardHeader.tsx
"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import Notifications from "./Notifications";
import { useState } from "react";
import { Menu, X } from "lucide-react";

export default function DashboardHeader() {
  const { data: session } = useSession();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-gray-900">NexusProcure</h1>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex ml-8 space-x-4">
              <Link href="/dashboard" className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                Dashboard
              </Link>
              <Link href="/dashboard/analytics" className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                Analytics
              </Link>
              <Link href="/iom" className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                IOM Management
              </Link>
              <Link href="/po" className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                Purchase Orders
              </Link>
              <Link href="/vendors" className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                Vendors
              </Link>
              <Link href="/cr" className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                Check Requests
              </Link>
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            <Notifications />
            
            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <span className="hidden sm:block text-sm text-gray-700">
              Welcome, {session?.user?.name}
            </span>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden pb-4">
            <nav className="grid grid-cols-2 gap-2">
              <Link href="/dashboard" className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors bg-gray-50">
                Dashboard
              </Link>
              <Link href="/dashboard/analytics" className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors bg-gray-50">
                Analytics
              </Link>
              <Link href="/iom" className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors bg-gray-50">
                IOM Management
              </Link>
              <Link href="/po" className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors bg-gray-50">
                Purchase Orders
              </Link>
              <Link href="/vendors" className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors bg-gray-50">
                Vendors
              </Link>
              <Link href="/cr" className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors bg-gray-50">
                Check Requests
              </Link>
            </nav>
            <div className="mt-3 pt-3 border-t border-gray-200">
              <span className="text-sm text-gray-700 px-3">
                Welcome, {session?.user?.name}
              </span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}