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
import { Lock, Plus, ShieldCheck } from "lucide-react";
import Link from 'next/link';

interface Role {
  id: string;
  name: string;
}

const fetchRoles = async (): Promise<Role[]> => {
  const response = await fetch('/api/roles');
  if (!response.ok) {
    throw new Error('Failed to fetch roles');
  }
  return response.json();
};

export default function RolesPage() {
  const canManageRoles = useHasPermission(Permission.MANAGE_ROLES);

  const { data: roles, isLoading, isError, error } = useQuery<Role[]>({
    queryKey: ['roles'],
    queryFn: fetchRoles,
    enabled: canManageRoles,
  });

  if (!canManageRoles) {
    return (
      <PageLayout title="Roles">
        <ErrorDisplay title="Unauthorized" message="You do not have permission to view this page." />
      </PageLayout>
    );
  }

  if (isLoading) {
    return (
      <PageLayout title="Roles & Permissions">
        <LoadingSpinner />
      </PageLayout>
    );
  }

  if (isError) {
    return (
      <PageLayout title="Roles & Permissions">
        <ErrorDisplay title="Error" message={error.message} />
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Roles & Permissions">
      <div className="space-y-8 animate-in fade-in duration-500">

        {/* Creative Header Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Total Roles Card */}
          <Card className="border-0 shadow bg-white rounded-xl overflow-hidden relative group hover:shadow-lg transition-all transform hover:-translate-y-1">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <ShieldCheck className="w-24 h-24 text-purple-600" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Defined Roles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-extrabold text-slate-800">{roles?.length || 0}</div>
              <p className="text-xs text-slate-400 mt-1">Access Levels</p>
            </CardContent>
          </Card>

          {/* Permission Sets Card */}
          <Card className="border-0 shadow bg-white rounded-xl overflow-hidden relative group hover:shadow-lg transition-all transform hover:-translate-y-1">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Lock className="w-24 h-24 text-slate-600" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Permissions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-extrabold text-slate-800">12</div>
              <p className="text-xs text-slate-400 mt-1">Granular Controls</p>
            </CardContent>
          </Card>

          {/* Add Role Action Card */}
          {/* Note: Create Role path assumes it exists or uses modal loop (not implemented here, keeping logic simple) */}
          <div className="h-full">
            <Card className="border-0 shadow bg-purple-600 rounded-xl overflow-hidden relative group cursor-pointer hover:bg-purple-700 transition-colors h-full flex flex-col justify-center items-center">
              <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-30">
                <Plus className="w-24 h-24 text-white" />
              </div>
              <CardContent className="flex flex-col justify-center items-center h-full text-white p-6 z-10">
                <div className="font-bold text-2xl mb-1 flex items-center gap-2">
                  <Plus className="w-6 h-6" /> Create Role
                </div>
                <p className="text-purple-100 text-sm opacity-80 mt-2 text-center">Define a new access role.</p>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card className="border-0 shadow bg-white rounded-xl overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/30">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Role Configuration</CardTitle>
                <p className="text-sm text-slate-500 mt-1">Manage system roles and their capabilities.</p>
              </div>
            </div>
          </CardHeader>
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="hover:bg-transparent border-slate-100">
                <TableHead className="w-[300px] pl-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Role Name</TableHead>
                <TableHead className="py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Access Scope</TableHead>
                <TableHead className="text-right pr-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles?.map((role) => (
                <TableRow key={role.id} className="cursor-pointer hover:bg-slate-50 transition-colors border-slate-100">
                  <TableCell className="font-semibold text-slate-700 pl-6 py-4">
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="w-5 h-5 text-purple-500" />
                      {role.name}
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <Badge variant="outline" className="border-slate-200 text-slate-500 font-mono text-xs">
                      SYSTEM_DEFINED
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right pr-6 py-4">
                    <Link href={`/dashboard/roles/${role.id}`}>
                      <Button variant="ghost" size="sm" className="text-slate-400 hover:text-purple-600">
                        Configure
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </PageLayout>
  );
}
