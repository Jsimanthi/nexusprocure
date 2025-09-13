// src/components/DashboardHeader.tsx
"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import Notifications from "./Notifications";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useHasPermission } from "@/hooks/useHasPermission";

export default function DashboardHeader() {
  const { data: session } = useSession();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const canManageUsers = useHasPermission('MANAGE_USERS');
  const canManageRoles = useHasPermission('MANAGE_ROLES');

  const navLinks = [
    { href: "/dashboard", text: "Dashboard", show: true },
    { href: "/dashboard/analytics", text: "Analytics", show: useHasPermission('VIEW_ANALYTICS') },
    { href: "/iom", text: "IOMs", show: true },
    { href: "/po", text: "POs", show: true },
    { href: "/pr", text: "PRs", show: true },
    { href: "/vendors", text: "Vendors", show: true },
    { href: "/dashboard/users", text: "Users", show: canManageUsers },
    { href: "/dashboard/roles", text: "Roles", show: canManageRoles },
  ];

  const visibleNavLinks = navLinks.filter(link => link.show);

  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center">
            <div className="flex items-center">
              <img src="https://i.postimg.cc/Kctw8crn/sblt-logo.png" alt="NexusProcure Logo" className="h-8 w-auto mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">NexusProcure</h1>
            </div>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex ml-8 space-x-4">
              {visibleNavLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    pathname === link.href
                      ? "bg-gray-100 text-gray-900"
                      : "text-gray-700 hover:text-gray-900"
                  }`}
                >
                  {link.text}
                </Link>
              ))}
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
              {visibleNavLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    pathname === link.href
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  {link.text}
                </Link>
              ))}
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