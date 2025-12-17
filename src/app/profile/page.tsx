"use client";

import { BreadcrumbBackButton } from "@/components/BreadcrumbBackButton";
import LoadingSpinner from "@/components/LoadingSpinner";
import PageLayout from "@/components/PageLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Camera, Key, Lock, Mail, Phone, Shield, User } from "lucide-react";
import { useSession } from "next-auth/react";
import { useState } from "react";
import toast from "react-hot-toast";

export default function ProfilePage() {
    const { data: session, status } = useSession();
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));
        setIsSaving(false);
        toast.success("Profile updated successfully!");
    };

    if (status === "loading") {
        return (
            <PageLayout title="My Profile">
                <LoadingSpinner />
            </PageLayout>
        );
    }

    const user = session?.user;
    const initials = user?.name
        ?.split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

    return (
        <PageLayout>
            <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-700 pb-20">

                <div className="flex flex-col gap-2">
                    <div className="w-fit">
                        <BreadcrumbBackButton href="/dashboard" text="Back to Dashboard" />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">My Profile</h1>
                </div>

                {/* Header / Banner */}
                <div className="relative mt-4">
                    <div className="h-48 w-full rounded-2xl bg-gradient-to-r from-blue-600/60 to-indigo-600/60 shadow-lg overflow-hidden relative z-0">
                        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20"></div>
                    </div>

                    <div className="absolute -bottom-16 left-10 flex items-end z-20">
                        <div className="relative group cursor-pointer">
                            <div className="h-32 w-32 rounded-full ring-4 ring-white bg-white shadow-xl overflow-hidden flex items-center justify-center">
                                <Avatar className="h-full w-full">
                                    <AvatarImage src={user?.image || ""} alt={user?.name || "User"} />
                                    <AvatarFallback className="bg-slate-50 text-3xl font-bold text-blue-600 w-full h-full flex items-center justify-center">
                                        {initials}
                                    </AvatarFallback>
                                </Avatar>
                            </div>
                            <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-30 rounded-full">
                                <Camera className="w-8 h-8 text-white" />
                            </div>
                        </div>
                        <div className="ml-6 mb-4 pt-10">
                            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{user?.name}</h1>
                            <div className="flex items-center gap-2 text-slate-500 mt-1">
                                <Mail className="w-4 h-4" />
                                <span>{user?.email}</span>
                                <span className="text-slate-300">•</span>
                                <Badge variant="secondary" className="font-normal capitalize shadow-none bg-blue-50 text-blue-700 hover:bg-blue-100">
                                    {user?.role?.name || "User"}
                                </Badge>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-28 grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Left Column: Quick Stats / Info */}
                    <div className="space-y-6">
                        <Card className="border-0 shadow-sm bg-white overflow-hidden">
                            <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                                <CardTitle className="text-base font-medium flex items-center gap-2">
                                    <Shield className="w-4 h-4 text-indigo-500" /> Account Security
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-4">
                                <div className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                                    <span className="text-sm text-slate-500">Password</span>
                                    <span className="text-xs font-mono text-slate-400">••••••••</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                                    <span className="text-sm text-slate-500">2FA</span>
                                    <Badge variant="outline" className="text-emerald-600 bg-emerald-50 border-emerald-100">Enabled</Badge>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                                    <span className="text-sm text-slate-500">Last Login</span>
                                    <span className="text-sm text-slate-700">Today, 10:23 AM</span>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-0 shadow-sm bg-gradient-to-br from-indigo-600 to-indigo-700 text-white overflow-hidden relative">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <User className="w-32 h-32" />
                            </div>
                            <CardContent className="pt-6 relative z-10">
                                <h3 className="font-bold text-lg mb-1">Nexus Pro</h3>
                                <p className="text-indigo-100 text-sm opacity-80 mb-4">Enterprise License</p>
                                <div className="h-1 w-12 bg-indigo-400/50 rounded-full"></div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column: Settings Tabs */}
                    <div className="lg:col-span-2">
                        <Tabs defaultValue="personal" className="w-full">
                            <TabsList className="w-full justify-start bg-transparent p-0 border-b border-slate-200 rounded-none mb-6">
                                <TabsTrigger value="personal" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 rounded-none px-6 pb-3 text-slate-500 data-[state=active]:text-indigo-600 hover:text-slate-700 transition-colors">
                                    Personal Details
                                </TabsTrigger>
                                <TabsTrigger value="preferences" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 rounded-none px-6 pb-3 text-slate-500 data-[state=active]:text-indigo-600 hover:text-slate-700 transition-colors">
                                    Preferences
                                </TabsTrigger>
                                <TabsTrigger value="security" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 rounded-none px-6 pb-3 text-slate-500 data-[state=active]:text-indigo-600 hover:text-slate-700 transition-colors">
                                    Security
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="personal" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <Card className="border-0 shadow-sm">
                                    <CardHeader>
                                        <CardTitle>Edit Profile</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <form onSubmit={handleSave} className="space-y-6">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <Label htmlFor="fullName">Full Name</Label>
                                                    <div className="relative">
                                                        <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                                        <Input id="fullName" defaultValue={user?.name || ""} className="pl-9" />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="title">Job Title</Label>
                                                    <div className="relative">
                                                        <Shield className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                                        <Input id="title" defaultValue="Senior Procurement Manager" className="pl-9" />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="email">Email Address</Label>
                                                    <div className="relative">
                                                        <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                                        <Input id="email" defaultValue={user?.email || ""} className="pl-9" />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="phone">Phone Number</Label>
                                                    <div className="relative">
                                                        <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                                        <Input id="phone" defaultValue="+1 (555) 000-0000" className="pl-9" />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="pt-4 flex justify-end">
                                                <Button type="submit" disabled={isSaving}>
                                                    {isSaving ? (
                                                        <>
                                                            <LoadingSpinner className="mr-2 h-4 w-4 border-white" /> Saving...
                                                        </>
                                                    ) : (
                                                        "Save Changes"
                                                    )}
                                                </Button>
                                            </div>
                                        </form>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="security" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <Card className="border-0 shadow-sm">
                                    <CardHeader>
                                        <CardTitle>Change Password</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <form className="space-y-6">
                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="current">Current Password</Label>
                                                    <div className="relative">
                                                        <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                                        <Input id="current" type="password" className="pl-9" />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="new">New Password</Label>
                                                    <div className="relative">
                                                        <Key className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                                        <Input id="new" type="password" className="pl-9" />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="pt-4 flex justify-end">
                                                <Button variant="outline">Update Password</Button>
                                            </div>
                                        </form>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            </div>
        </PageLayout>
    );
}
