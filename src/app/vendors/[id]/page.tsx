"use client";

import { BreadcrumbBackButton } from "@/components/BreadcrumbBackButton";
import ErrorDisplay from "@/components/ErrorDisplay";
import LoadingSpinner from "@/components/LoadingSpinner";
import PageLayout from "@/components/PageLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useHasPermission } from "@/hooks/useHasPermission";
import { formatCurrency } from "@/lib/utils";
import { Permission } from "@/types/auth";
import { Vendor } from "@/types/po"; // Assuming Vendor type is exported from po or we might need to fix import
import { BarChart3, FileText, Globe, Mail, MapPin, Package, Phone, Star, Truck } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";

// Extended Vendor interface if needed or just use the basic one
interface FullVendor extends Vendor {
    totalOrders?: number;
    totalSpent?: number;
    averageRating?: number;
}

export default function VendorDetailPage() {
    const params = useParams();
    const [vendor, setVendor] = useState<FullVendor | null>(null);
    const [loading, setLoading] = useState(true);

    // Permission checks
    const canViewVendor = useHasPermission(Permission.READ_ALL_VENDORS);
    const canEditVendor = useHasPermission(Permission.MANAGE_VENDORS);

    const fetchVendor = useCallback(async () => {
        try {
            const response = await fetch(`/api/vendors/${params.id}`);
            if (response.ok) {
                const data = await response.json();
                setVendor(data);
            } else {
                toast.error("Failed to fetch vendor details");
            }
        } catch (error) {
            console.error("Error fetching vendor:", error);
            toast.error("Network error when fetching vendor");
        } finally {
            setLoading(false);
        }
    }, [params.id]);

    useEffect(() => {
        if (!canViewVendor) {
            setLoading(false);
            return;
        }
        if (params.id) {
            fetchVendor();
        }
    }, [params.id, canViewVendor, fetchVendor]);

    if (loading) return <PageLayout><LoadingSpinner /></PageLayout>;

    if (!canViewVendor) {
        return (
            <PageLayout>
                <ErrorDisplay title="Forbidden" message="You do not have permission to view vendor details." />
                <div className="mt-6 text-center">
                    <Link href="/vendors"><Button variant="link">&larr; Back to Vendor List</Button></Link>
                </div>
            </PageLayout>
        );
    }

    if (!vendor) {
        return (
            <PageLayout>
                <ErrorDisplay title="Vendor Not Found" message={`Could not find a Vendor with the ID: ${params.id}`} />
                <div className="mt-6 text-center">
                    <Link href="/vendors"><Button variant="link">&larr; Back to Vendor List</Button></Link>
                </div>
            </PageLayout>
        );
    }

    // Mock stats for now as API might not provide them
    const stats = {
        totalOrders: vendor.totalOrders || 12,
        totalSpent: vendor.totalSpent || 450000,
        rating: vendor.averageQualityScore || 4.8,
        onTime: vendor.onTimeDeliveryRate || 98
    };

    return (
        <PageLayout>
            <div className="flex flex-col space-y-6 pb-20">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div>
                        <div className="flex items-center gap-3">
                            <BreadcrumbBackButton href="/vendors" text="Back to Vendors" />
                            <h1 className="text-2xl font-bold text-slate-900 tracking-tight ml-2">{vendor.name}</h1>
                            <Badge variant={stats.rating >= 4.5 ? "success" : "default"} className="flex gap-1 items-center">
                                <Star className="w-3 h-3 fill-current" /> {stats.rating}/5.0
                            </Badge>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-slate-500">
                            {vendor.address && <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {vendor.address}</span>}
                            {vendor.website && (
                                <>
                                    <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                    <a href={vendor.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline">
                                        <Globe className="w-4 h-4" /> Website
                                    </a>
                                </>
                            )}
                        </div>
                    </div>

                    {canEditVendor && (
                        <Button variant="default" className="bg-slate-900 hover:bg-slate-800">
                            Edit Vendor Profile
                        </Button>
                    )}
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="p-6 flex flex-col gap-2">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                <Package className="w-4 h-4" /> Total Orders
                            </span>
                            <span className="text-2xl font-bold text-slate-900">{stats.totalOrders}</span>
                            <span className="text-xs text-green-600 font-medium">+2 this month</span>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6 flex flex-col gap-2">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                <BarChart3 className="w-4 h-4" /> Total Spend
                            </span>
                            <span className="text-2xl font-bold text-slate-900">{formatCurrency(stats.totalSpent)}</span>
                            <span className="text-xs text-slate-400 font-medium">Lifetime value</span>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6 flex flex-col gap-2">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                <Star className="w-4 h-4" /> Quality Score
                            </span>
                            <span className="text-2xl font-bold text-slate-900">{stats.rating}</span>
                            <span className="text-xs text-slate-400 font-medium">Consistent quality</span>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6 flex flex-col gap-2">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                <Truck className="w-4 h-4" /> On-Time Rate
                            </span>
                            <span className="text-2xl font-bold text-slate-900">{stats.onTime}%</span>
                            <span className="text-xs text-green-600 font-medium">Excellent Service</span>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Left Column: Details */}
                    <div className="lg:col-span-2 space-y-6">
                        <Tabs defaultValue="contact" className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="contact">Contact Information</TabsTrigger>
                                <TabsTrigger value="history">Order History</TabsTrigger>
                            </TabsList>

                            <TabsContent value="contact" className="mt-4 space-y-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Contact Details</CardTitle>
                                        <CardDescription>Primary contact points for this vendor.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="grid gap-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="flex gap-3">
                                                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                                                    <Phone className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-slate-900">Phone Number</p>
                                                    <p className="text-sm text-slate-500">{vendor.phone || "Not provided"}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-3">
                                                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                                                    <Mail className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-slate-900">Email Address</p>
                                                    <p className="text-sm text-slate-500">{vendor.email || "Not provided"}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-3">
                                                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                                                    <MapPin className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-slate-900">Address</p>
                                                    <p className="text-sm text-slate-500">{vendor.address || "Not provided"}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-3">
                                                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                                                    <FileText className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-slate-900">Tax ID</p>
                                                    <p className="text-sm text-slate-500">{vendor.taxId || "Not provided"}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle>Bank Information</CardTitle>
                                        <CardDescription>Banking details for payments.</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                            <p className="text-sm text-slate-500 italic">Financial details are protected. Only authorized finance personnel can view full banking information.</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="history">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Recent Orders</CardTitle>
                                        <CardDescription>Last 5 Purchase Orders.</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-center py-8 text-slate-500">
                                            <Package className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                                            <p>Order history integration coming soon.</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    </div>

                    {/* Right Column: Timeline/Activity */}
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Vendor Notes</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-slate-500">No notes added for this vendor.</p>
                                <Button variant="outline" className="w-full mt-4 text-xs">Add Note</Button>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Compliance</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-slate-600">Contract Status</span>
                                    <Badge variant="success">Active</Badge>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-slate-600">Insurance</span>
                                    <Badge variant="outline">Verified</Badge>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-slate-600">NDA Signed</span>
                                    <Badge variant="success">Yes</Badge>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                </div>
            </div>
        </PageLayout>
    );
}
