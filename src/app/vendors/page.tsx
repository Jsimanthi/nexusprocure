"use client";

import ErrorDisplay from "@/components/ErrorDisplay";
import LoadingSpinner from "@/components/LoadingSpinner";
import PageLayout from "@/components/PageLayout";
import SearchAndFilter, { FilterState } from "@/components/SearchAndFilter";
import { Vendor } from "@/types/po";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Download, Mail, Pencil, Phone, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

// New UI Components
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "../../components/ui/textarea";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const fetchVendors = async (page = 1, pageSize = 10) => {
  const response = await fetch(`/api/vendors?page=${page}&pageSize=${pageSize}`);
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Network response was not ok");
  }
  return response.json();
};

const saveVendor = async (vendor: Partial<Vendor>) => {
  const url = vendor.id ? `/api/vendors/${vendor.id}` : "/api/vendors";
  const method = vendor.id ? "PUT" : "POST";
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(vendor),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to save vendor");
  }
  return response.json();
};

const deleteVendor = async (id: string) => {
  const response = await fetch(`/api/vendors/${id}`, { method: "DELETE" });
  if (!response.ok) {
    throw new Error("Failed to delete vendor");
  }
  return response.json();
};

export default function VendorsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [formData, setFormData] = useState<Partial<Vendor>>({});
  const [isExporting, setIsExporting] = useState(false);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["vendors", page, pageSize],
    queryFn: () => fetchVendors(page, pageSize),
  });
  const vendors = data?.data || [];
  const total = data?.total || 0;
  const pageCount = data?.pageCount || 0;

  const mutation = useMutation({
    mutationFn: saveVendor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      handleCloseDialog();
      toast.success(editingVendor ? "Vendor updated successfully" : "Vendor added successfully");
    },
    onError: (err) => {
      toast.error(err.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteVendor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      toast.success("Vendor deleted");
    },
    onError: (err) => {
      toast.error(err.message);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  const handleEdit = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setFormData(vendor);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingVendor(null);
    setFormData({});
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this vendor?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    toast.loading("Exporting vendors...");
    try {
      const response = await fetch("/api/vendors/export");
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to export vendors.");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const disposition = response.headers.get('content-disposition');
      let filename = `vendors-export-${new Date().toISOString()}.csv`;
      if (disposition && disposition.indexOf('attachment') !== -1) {
        const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
        const matches = filenameRegex.exec(disposition);
        if (matches != null && matches[1]) {
          filename = matches[1].replace(/['"]/g, '');
        }
      }
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.dismiss();
      toast.success("Vendors exported successfully!");
    } catch (error) {
      toast.dismiss();
      toast.error(error instanceof Error ? error.message : "An unknown error occurred during export.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleSearch = (query: string) => {
    console.log("Search query:", query);
  };

  const handleFilter = (filters: FilterState) => {
    console.log("Filters:", filters);
  };

  if (isLoading) {
    return (
      <PageLayout title="Vendor Management">
        <LoadingSpinner />
      </PageLayout>
    );
  }

  if (isError) {
    return (
      <PageLayout title="Vendor Management">
        <ErrorDisplay
          title="Error Loading Vendors"
          message={error.message}
          onRetry={() => window.location.reload()}
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Vendor Management">
      <div className="space-y-6 animate-in fade-in duration-500">

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <SearchAndFilter
            onSearch={handleSearch}
            onFilter={handleFilter}
            filterOptions={{ dateRange: true }}
            placeholder="Search vendors..."
            className="w-full md:w-auto md:flex-1 md:max-w-xl mb-0"
          />

          <div className="flex items-center gap-2 w-full md:w-auto">
            <Button variant="outline" onClick={handleExport} disabled={isExporting}>
              {isExporting ? <LoadingSpinner /> : <Download className="mr-2 h-4 w-4" />}
              Export
            </Button>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200" onClick={() => { setEditingVendor(null); setFormData({}); }}>
                  <Plus className="mr-2 h-4 w-4" /> Add Vendor
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingVendor ? "Edit Vendor" : "Add New Vendor"}</DialogTitle>
                  <DialogDescription>
                    {editingVendor ? "Update the vendor details below." : "Enter the details for the new vendor."}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Vendor Name *</Label>
                      <Input id="name" required value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Vendor Name" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="taxId">Tax ID (GSTIN)</Label>
                      <Input id="taxId" value={formData.taxId || ''} onChange={(e) => setFormData({ ...formData, taxId: e.target.value })} placeholder="GSTIN" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input id="email" type="email" required value={formData.email || ''} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="vendor@co.com" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone *</Label>
                      <Input id="phone" type="tel" required value={formData.phone || ''} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="+91..." />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Address *</Label>
                    <Textarea id="address" required value={formData.address || ''} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, address: e.target.value })} placeholder="Full billing address" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="contactInfo">Contact Person *</Label>
                      <Input id="contactInfo" required value={formData.contactInfo || ''} onChange={(e) => setFormData({ ...formData, contactInfo: e.target.value })} placeholder="John Doe" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="currency">Currency</Label>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={formData.currency || 'INR'}
                        onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                      >
                        <option value="INR">INR</option>
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                      </select>
                    </div>
                  </div>

                  <DialogFooter className="pt-4">
                    <Button type="button" variant="outline" onClick={handleCloseDialog}>Cancel</Button>
                    <Button type="submit" disabled={mutation.isPending}>
                      {mutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card className="border-0 shadow-xl bg-white/70 backdrop-blur-md">
          <CardHeader className="pb-2">
            <CardTitle>Approved Vendors</CardTitle>
            <CardDescription>Directory of authorized suppliers and service providers.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border bg-white/50">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Performance</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendors.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">
                        No vendors found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    vendors.map((vendor: Vendor) => (
                      <TableRow key={vendor.id} className="hover:bg-slate-50/80 transition-colors">
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-800 flex items-center gap-2">
                              <Building2 className="h-3 w-3 text-slate-400" />
                              {vendor.name}
                            </span>
                            <span className="text-xs text-muted-foreground ml-5">{vendor.address?.substring(0, 30)}...</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col text-sm text-slate-600 space-y-1">
                            <span className="flex items-center gap-2">
                              <Mail className="h-3 w-3 text-slate-400" /> {vendor.email}
                            </span>
                            <span className="flex items-center gap-2">
                              <Phone className="h-3 w-3 text-slate-400" /> {vendor.phone}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col space-y-1">
                            <div className="flex items-center gap-2 text-xs">
                              <span className="font-medium">On-Time:</span>
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                {(vendor.onTimeDeliveryRate || 0).toFixed(0)}%
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <span className="font-medium">Quality:</span>
                              <span className="font-bold text-blue-600">{(vendor.averageQualityScore || 0).toFixed(1)}/5</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(vendor)}>
                              <Pencil className="h-4 w-4 text-blue-500" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(vendor.id!)} disabled={deleteMutation.isPending} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}