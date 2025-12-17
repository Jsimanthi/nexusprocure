"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { createUserSchema } from '@/lib/schemas';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Camera,
  CheckCircle,
  Loader2,
  Lock,
  Mail,
  Shield,
  User,
  UserPlus
} from "lucide-react";
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from "react-hot-toast";
import { z } from 'zod';

type CreateUserFormInputs = z.infer<typeof createUserSchema>;

interface Role {
  id: string;
  name: string;
}

interface CreateUserFormProps {
  roles: Role[];
}

export default function CreateUserForm({ roles }: CreateUserFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CreateUserFormInputs>({
    resolver: zodResolver(createUserSchema),
  });

  const watchedName = watch("name");
  const watchedEmail = watch("email");
  const watchedRole = watch("roleId");

  const getRoleName = (id: string) => {
    return roles.find(r => r.id === id)?.name || "Role";
  };

  const onSubmit = async (data: CreateUserFormInputs) => {
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create user');
      }

      toast.success("User created successfully!");
      router.push('/dashboard/users');
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('An unknown error occurred');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
      {/* Left Column: Profile Preview */}
      <div className="lg:col-span-1">
        <Card className="border-0 shadow-sm ring-1 ring-slate-200">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-lg">Profile Preview</CardTitle>
            <CardDescription>How the user will appear</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center pt-6 pb-8 space-y-4">
            <div className="relative group">
              <div className="w-32 h-32 rounded-full bg-slate-100 flex items-center justify-center border-4 border-white shadow-md">
                <User className="w-16 h-16 text-slate-300" />
              </div>
              <div className="absolute bottom-0 right-0 bg-blue-600 p-2 rounded-full text-white shadow-sm">
                <Camera className="w-4 h-4" />
              </div>
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-bold text-xl text-slate-900 break-all">
                {watchedName || "New User"}
              </h3>
              <p className="text-sm text-slate-500 break-all">
                {watchedEmail || "email@example.com"}
              </p>
            </div>

            <div className="w-full pt-4">
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</span>
                <span className="text-sm font-medium text-blue-700 bg-blue-50 px-2 py-1 rounded-md">
                  {watchedRole ? getRoleName(watchedRole) : "Pending"}
                </span>
              </div>
            </div>

            <div className="w-full pt-2">
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</span>
                <span className="text-sm font-medium text-green-700 bg-green-50 px-2 py-1 rounded-md flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Active
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Column: Form */}
      <div className="lg:col-span-2">
        <Card className="border-0 shadow-sm ring-1 ring-slate-200">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <UserPlus className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-lg">User Details</CardTitle>
                <CardDescription>Enter the information for the new account.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                      id="name"
                      {...register('name')}
                      className={`pl-9 ${errors.name ? 'border-red-300 focus-visible:ring-red-500' : ''}`}
                      placeholder="John Doe"
                    />
                  </div>
                  {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                      id="email"
                      type="email"
                      {...register('email')}
                      className={`pl-9 ${errors.email ? 'border-red-300 focus-visible:ring-red-500' : ''}`}
                      placeholder="john.doe@company.com"
                    />
                  </div>
                  {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="roleId">Assigned Role</Label>
                    <div className="relative">
                      <Shield className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <select
                        id="roleId"
                        {...register('roleId')}
                        className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 pl-9 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="">Select a role...</option>
                        {roles.map((role) => (
                          <option key={role.id} value={role.id}>
                            {role.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    {errors.roleId && <p className="text-xs text-red-500">{errors.roleId.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Initial Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <Input
                        id="password"
                        type="password"
                        {...register('password')}
                        className={`pl-9 ${errors.password ? 'border-red-300 focus-visible:ring-red-500' : ''}`}
                        placeholder="••••••••"
                      />
                    </div>
                    {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" /> Create User
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
