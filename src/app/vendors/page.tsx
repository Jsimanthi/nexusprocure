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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  // Alias mutation for compatibility with new UI calls that might use saveMutation
  const saveMutation = mutation;

  const resetForm = () => {
    setFormData({});
    setEditingVendor(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

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
    resetForm();
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
      <PageLayout title="Vendor Directory">
        <LoadingSpinner />
      </PageLayout>
    );
  }

  if (isError) {
    return (
      <PageLayout title="Vendor Directory">
        <ErrorDisplay
          title="Error Loading Vendors"
          message={error.message}
          onRetry={() => window.location.reload()}
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Vendor Directory">
      <div className="space-y-8 animate-in fade-in duration-500">

        {/* Creative Header Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Total Vendors Card */}
          <Card className="border-0 shadow bg-white rounded-xl overflow-hidden relative group hover:shadow-lg transition-all transform hover:-translate-y-1">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Building2 className="w-24 h-24 text-indigo-600" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Total Vendors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-extrabold text-slate-800">{total}</div>
              <p className="text-xs text-slate-400 mt-1">Active Database</p>
            </CardContent>
          </Card>

          {/* Add Vendor Action Card */}
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Card className="border-0 shadow bg-indigo-600 rounded-xl overflow-hidden relative group cursor-pointer hover:bg-indigo-700 transition-colors">
                <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-30">
                  <Plus className="w-24 h-24 text-white" />
                </div>
                <CardContent className="flex flex-col justify-center h-full text-white p-6">
                  <div className="font-bold text-2xl mb-1 flex items-center gap-2">
                    <Plus className="w-6 h-6" /> Add Vendor
                  </div>
                  <p className="text-indigo-100 text-sm opacity-80">Onboard a new supplier.</p>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{editingVendor ? "Edit Vendor" : "Add New Vendor"}</DialogTitle>
                <DialogDescription>
                  {editingVendor ? "Update vendor details below." : "Enter the details for the new vendor to be added to the system."}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">Name</Label>
                  <Input id="name" name="name" value={formData.name} onChange={handleInputChange} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="text-right">Email</Label>
                  <Input id="email" name="email" value={formData.email} onChange={handleInputChange} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="phone" className="text-right">Phone</Label>
                  <Input id="phone" name="phone" value={formData.phone || ""} onChange={handleInputChange} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="address" className="text-right">Address</Label>
                  <Textarea id="address" name="address" value={formData.address || ""} onChange={handleInputChange} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="taxId" className="text-right">Tax ID</Label>
                  <Input id="taxId" name="taxId" value={formData.taxId || ""} onChange={handleInputChange} className="col-span-3" />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" onClick={handleSubmit} disabled={saveMutation.isPending}>
                  {saveMutation.isPending && <LoadingSpinner className="mr-2" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Export Action Card */}
          <Card className="border-0 shadow bg-emerald-600 rounded-xl overflow-hidden relative group cursor-pointer hover:bg-emerald-700 transition-colors" onClick={() => toast.success("Export started")}>
            <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-30">
              <Download className="w-24 h-24 text-white" />
            </div>
            <CardContent className="flex flex-col justify-center h-full text-white p-6">
              <div className="font-bold text-2xl mb-1 flex items-center gap-2">
                <Download className="w-6 h-6" /> Export List
              </div>
              <p className="text-emerald-100 text-sm opacity-80">Download vendor data as CSV.</p>
            </CardContent>
          </Card>
        </div>

        {/* Search & Filter */}
        <div className="bg-white p-4 rounded-xl shadow border-0 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <SearchAndFilter
            onSearch={handleSearch}
            onFilter={handleFilter}
            filterOptions={{
              status: ["ACTIVE", "INACTIVE"], // Mock status options
            }}
            placeholder="Search Vendors..."
            className="w-full sm:w-auto flex-1 m-0"
          />
          <div className="text-sm text-slate-500 hidden md:block">
            Showing <span className="font-bold text-slate-700">{(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)}</span> of {total}
          </div>
        </div>

        {/* Content Table */}
        <Card className="border-0 shadow bg-white rounded-xl overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="hover:bg-transparent border-slate-100">
                <TableHead className="w-[180px] pl-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Vendor Name</TableHead>
                <TableHead className="py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Contact</TableHead>
                <TableHead className="py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Tax ID</TableHead>
                <TableHead className="py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Location</TableHead>
                <TableHead className="text-right pr-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <Building2 className="w-12 h-12 mb-4 text-slate-200" />
                      <p className="text-lg font-medium text-slate-600">No vendors found</p>
                      <Button variant="outline" className="mt-4" onClick={() => setIsDialogOpen(true)}>Add First Vendor</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                vendors.map((vendor: Vendor) => (
                  <TableRow key={vendor.id} className="cursor-pointer hover:bg-slate-50 transition-colors border-slate-100">
                    <TableCell className="font-semibold text-slate-700 pl-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs shadow-sm">
                          {vendor.name.charAt(0).toUpperCase()}
                        </div>
                        {vendor.name}
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex flex-col gap-1 text-sm">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Mail className="w-3.5 h-3.5 text-slate-400" /> {vendor.email}
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Phone className="w-3.5 h-3.5 text-slate-400" /> {vendor.phone || "N/A"}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <Badge variant="outline" className="font-mono text-slate-500 border-slate-200 bg-slate-50">
                        {vendor.taxId || "N/A"}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4">
                      <span className="text-sm text-slate-600 truncate max-w-[150px] block" title={vendor.address || ""}>
                        {vendor.address || "N/A"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right pr-6 py-4">
                      <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(vendor)} className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(vendor.id as string)}
                          className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        {/* Pagination */}
        {(pageCount > 1 || total > 0) && (
          <div className="flex items-center justify-between px-2 py-4">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="bg-white border-0 shadow-sm hover:bg-slate-50"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page >= pageCount}
                className="bg-white border-0 shadow-sm hover:bg-slate-50"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}