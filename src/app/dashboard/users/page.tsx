"use client";

import ErrorDisplay from '@/components/ErrorDisplay';
import LoadingSpinner from '@/components/LoadingSpinner';
import PageLayout from '@/components/PageLayout';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useHasPermission } from '@/hooks/useHasPermission';
import { Permission } from '@/types/auth';
import { useQuery } from '@tanstack/react-query';
import { Download, ShieldCheck, UserPlus, Users } from "lucide-react";
import Link from 'next/link';
import { useState } from 'react';
import toast from 'react-hot-toast';

interface User {
  id: string;
  name: string | null;
  email: string;
  role: {
    id: string;
    name: string;
  } | null;
}

const fetchUsers = async (): Promise<User[]> => {
  const response = await fetch('/api/users');
  if (!response.ok) {
    throw new Error('Failed to fetch users');
  }
  return response.json();
};

export default function UserManagementPage() {
  const canManageUsers = useHasPermission(Permission.MANAGE_USERS);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { data: usersData, isLoading, isError, error } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: fetchUsers,
    enabled: canManageUsers,
  });

  // Mock pagination for now as API returns full list
  const users = usersData ? usersData.slice((page - 1) * pageSize, page * pageSize) : [];
  const total = usersData ? usersData.length : 0;
  const pageCount = Math.ceil(total / pageSize);

  if (!canManageUsers) {
    return (
      <PageLayout title="User Management">
        <ErrorDisplay title="Unauthorized" message="You do not have permission to view this page." />
      </PageLayout>
    );
  }

  if (isLoading) {
    return (
      <PageLayout title="User Directory">
        <LoadingSpinner />
      </PageLayout>
    );
  }

  if (isError) {
    return (
      <PageLayout title="User Directory">
        <ErrorDisplay title="Error" message={error.message} />
      </PageLayout>
    );
  }

  return (
    <PageLayout title="User Directory">
      <div className="space-y-8 animate-in fade-in duration-500">

        {/* Creative Header Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Total Users Card */}
          <Card className="border-0 shadow bg-white rounded-xl overflow-hidden relative group hover:shadow-lg transition-all transform hover:-translate-y-1">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Users className="w-24 h-24 text-indigo-600" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-extrabold text-slate-800">{total}</div>
              <p className="text-xs text-slate-400 mt-1">Active Accounts</p>
            </CardContent>
          </Card>

          {/* Add User Action Card */}
          <Link href="/dashboard/users/create" className="block h-full">
            <Card className="border-0 shadow bg-indigo-600 rounded-xl overflow-hidden relative group cursor-pointer hover:bg-indigo-700 transition-colors h-full">
              <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-30">
                <UserPlus className="w-24 h-24 text-white" />
              </div>
              <CardContent className="flex flex-col justify-center h-full text-white p-6">
                <div className="font-bold text-2xl mb-1 flex items-center gap-2">
                  <UserPlus className="w-6 h-6" /> Add User
                </div>
                <p className="text-indigo-100 text-sm opacity-80">Invite a new team member.</p>
              </CardContent>
            </Card>
          </Link>

          {/* Managed Roles Action Card */}
          <Link href="/dashboard/roles" className="block h-full">
            <Card className="border-0 shadow bg-slate-800 rounded-xl overflow-hidden relative group cursor-pointer hover:bg-slate-700 transition-colors h-full">
              <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-30">
                <ShieldCheck className="w-24 h-24 text-white" />
              </div>
              <CardContent className="flex flex-col justify-center h-full text-white p-6">
                <div className="font-bold text-2xl mb-1 flex items-center gap-2">
                  <ShieldCheck className="w-6 h-6" /> Manage Roles
                </div>
                <p className="text-slate-300 text-sm opacity-80">Configure permissions and access.</p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Users Table */}
        <Card className="border-0 shadow bg-white rounded-xl overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/30">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>System Users</CardTitle>
                <p className="text-sm text-slate-500 mt-1">Manage user access and roles.</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="hidden sm:flex" onClick={() => toast.success("Exporting users list...")}>
                  <Download className="mr-2 h-4 w-4" /> Export
                </Button>
              </div>
            </div>
          </CardHeader>
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="hover:bg-transparent border-slate-100">
                <TableHead className="w-[250px] pl-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">User</TableHead>
                <TableHead className="py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Role</TableHead>
                <TableHead className="py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</TableHead>
                <TableHead className="text-right pr-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <Users className="w-12 h-12 mb-4 text-slate-200" />
                      <p className="text-lg font-medium text-slate-600">No users found</p>
                      <Link href="/dashboard/users/create">
                        <Button variant="outline" className="mt-4">Create First User</Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id} className="cursor-pointer hover:bg-slate-50 transition-colors border-slate-100">
                    <TableCell className="font-semibold text-slate-700 pl-6 py-4">
                      <Link href={`/dashboard/users/${user.id}`} className="flex items-center gap-3 group">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-md group-hover:scale-105 transition-transform">
                          {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div className="flex flex-col">
                          <span className="group-hover:text-indigo-600 transition-colors">{user.name || 'No Name'}</span>
                          <span className="text-xs text-slate-400 font-normal">{user.email}</span>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell className="py-4">
                      <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-100">
                        {user.role?.name || 'No Role'}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Active
                      </span>
                    </TableCell>
                    <TableCell className="text-right pr-6 py-4">
                      <Link href={`/dashboard/users/${user.id}`}>
                        <Button variant="ghost" size="sm" className="text-slate-400 hover:text-indigo-600">
                          View Details
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {(pageCount > 1 || total > 0) && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/30">
              <p className="text-sm text-slate-500">
                Showing <span className="font-bold">{(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)}</span> of {total} users
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="bg-white border-slate-200 shadow-sm hover:bg-slate-50"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page >= pageCount}
                  className="bg-white border-slate-200 shadow-sm hover:bg-slate-50"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </PageLayout>
  );
}
