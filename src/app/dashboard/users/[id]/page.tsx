"use client";

import { BreadcrumbBackButton } from "@/components/BreadcrumbBackButton";
import ErrorDisplay from '@/components/ErrorDisplay';
import LoadingSpinner from '@/components/LoadingSpinner';
import PageLayout from '@/components/PageLayout';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useHasPermission } from '@/hooks/useHasPermission';
import { Permission } from '@/types/auth';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, ShieldCheck, User } from "lucide-react";
import Link from "next/link";
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from "react-hot-toast";

// Types
interface User {
  id: string;
  name: string | null;
  email: string;
  role: {
    id: string;
    name: string;
  } | null;
}
interface Role {
  id: string;
  name: string;
}

// API Fetching Functions
const fetchUser = async (id: string): Promise<User> => {
  const response = await fetch(`/api/users/${id}`);
  if (!response.ok) throw new Error('Failed to fetch user data.');
  return response.json();
};

const fetchRoles = async (): Promise<Role[]> => {
  const response = await fetch('/api/roles');
  if (!response.ok) throw new Error('Failed to fetch roles.');
  return response.json();
};

const updateUserRole = async ({ userId, roleId }: { userId: string; roleId: string }) => {
  const response = await fetch(`/api/users/${userId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roleId }),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to update user role.');
  }
  return response.json();
};


export default function UserEditPage() {
  const params = useParams();
  const userId = params.id as string;
  const queryClient = useQueryClient();

  const canManageUsers = useHasPermission(Permission.MANAGE_USERS);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Fetch user data
  const { data: user, isLoading: isLoadingUser, isError: isErrorUser, error: errorUser } = useQuery<User>({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
    enabled: canManageUsers && !!userId,
  });

  // Fetch roles data
  const { data: roles, isLoading: isLoadingRoles, isError: isErrorRoles, error: errorRoles } = useQuery<Role[]>({
    queryKey: ['roles'],
    queryFn: fetchRoles,
    enabled: canManageUsers,
  });

  // Set initial selected role once user data is loaded
  useEffect(() => {
    if (user?.role?.id) {
      setSelectedRoleId(user.role.id);
    }
  }, [user]);

  // Mutation for updating the role
  const mutation = useMutation({
    mutationFn: updateUserRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user', userId] });
      setSuccessMessage('User role updated successfully!');
      toast.success('User role updated successfully!'); // Add toast for consistent feedback
      setTimeout(() => setSuccessMessage(''), 3000);
    },
    onError: (error) => {
      toast.error(`Update failed: ${error.message}`);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRoleId) {
      mutation.mutate({ userId, roleId: selectedRoleId });
    }
  };

  if (!canManageUsers) {
    return (
      <PageLayout title="Edit User">
        <ErrorDisplay title="Unauthorized" message="You do not have permission to view or edit this user." />
        <div className="mt-6 text-center">
          <Link href="/dashboard/users"><Button variant="link">&larr; Back to Users</Button></Link>
        </div>
      </PageLayout>
    );
  }

  const isLoading = isLoadingUser || isLoadingRoles;
  const isError = isErrorUser || isErrorRoles;
  const error = errorUser || errorRoles;

  if (isLoading) return <PageLayout><LoadingSpinner /></PageLayout>;
  if (isError) return <PageLayout><ErrorDisplay title="Error" message={error?.message || 'An unknown error occurred'} /></PageLayout>;

  return (
    <PageLayout>
      <div className="max-w-4xl mx-auto pb-20">
        {/* Header / Banner */}
        <div className="bg-slate-900 h-32 rounded-t-xl w-full relative mb-12">
          <div className="absolute top-4 left-4 z-10">
            <BreadcrumbBackButton href="/dashboard/users" text="Back to Users" className="bg-black/20 text-white hover:bg-black/40 hover:text-white border-0" />
          </div>
          <div className="absolute -bottom-10 left-8 flex items-end">
            <div className="w-24 h-24 rounded-full bg-white p-1 shadow-lg">
              <div className="w-full h-full rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                <User className="w-12 h-12" />
              </div>
            </div>
            <div className="ml-4 mb-2">
              <h1 className="text-2xl font-bold text-slate-900">{user?.name}</h1>
              <p className="text-slate-500 text-sm">{user?.email}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-4 md:px-0">
          {/* Left Column: Stats or Info */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Account Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">Status</span>
                  <Badge variant="success" className="gap-1"><CheckCircle className="w-3 h-3" /> Active</Badge>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">Current Role</span>
                  <Badge variant="outline">{user?.role?.name || 'No Role'}</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Edit Form */}
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Role Management</CardTitle>
                <CardDescription>Update the access level for this user.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="role">Select Role</Label>
                    <div className="relative">
                      <select
                        id="role"
                        name="role"
                        className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
                        value={selectedRoleId}
                        onChange={(e) => setSelectedRoleId(e.target.value)}
                      >
                        <option value="" disabled>Select a role...</option>
                        {roles?.map((role) => (
                          <option key={role.id} value={role.id}>
                            {role.name}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-700">
                        <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                      </div>
                    </div>
                    <p className="text-sm text-slate-500">
                      Assigning a role grants specific permissions within the NexusProcure system.
                    </p>
                  </div>

                  <div className="flex justify-end pt-4 border-t border-slate-100">
                    <Button
                      type="submit"
                      disabled={mutation.isPending || !selectedRoleId || selectedRoleId === user?.role?.id}
                      className={mutation.isPending ? "opacity-70 cursor-not-allowed" : ""}
                    >
                      {mutation.isPending ? (
                        <>
                          <LoadingSpinner className="mr-2 h-4 w-4 border-white" /> Saving...
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="mr-2 h-4 w-4" /> Save Role Changes
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}



