"use client";
import ConfirmationModal from "@/components/ConfirmationModal";
import ErrorDisplay from "@/components/ErrorDisplay";
import LoadingSpinner from "@/components/LoadingSpinner";
import PageLayout from "@/components/PageLayout";
import SearchAndFilter from "@/components/SearchAndFilter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useHasPermission } from "@/hooks/useHasPermission";
import { formatCurrency, getPOStatusColor } from "@/lib/utils";
import { Permission } from "@/types/auth";
import { POStatus, PurchaseOrder } from "@/types/po";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Eye, FileText, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import toast from "react-hot-toast";

const fetchPOs = async (page = 1, pageSize = 10, searchTerm = "", status = "", month = "") => {
  const params = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString(),
    search: searchTerm,
    status: status,
  });
  if (month) {
    params.set('month', month);
  }
  const response = await fetch(`/api/po?${params.toString()}`);
  if (!response.ok) throw new Error("Network response was not ok");
  return response.json();
};

function POList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [monthFilter] = useState(searchParams.get("month") || "");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPoId, setSelectedPoId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const pageSize = 10;
  const queryClient = useQueryClient();
  const canDelete = useHasPermission(Permission.DELETE_PO);
  const canUpdate = useHasPermission(Permission.UPDATE_PO);
  const canCreate = useHasPermission(Permission.CREATE_PO);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["purchaseOrders", page, pageSize, searchTerm, statusFilter, monthFilter],
    queryFn: () => fetchPOs(page, pageSize, searchTerm, statusFilter, monthFilter),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/po/${id}`, { method: "DELETE" });
      if (!response.ok) {
        throw new Error("Failed to delete PO");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] });
      toast.success("PO deleted successfully.");
    },
    onError: (error) => {
      toast.error(`Error deleting PO: ${error.message}`);
    },
  });

  const handleDelete = (id: string) => {
    setSelectedPoId(id);
    setIsModalOpen(true);
  };

  const handleExport = async () => {
    setIsExporting(true);
    toast.loading("Exporting POs...");
    try {
      const response = await fetch("/api/po/export");
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to export POs.");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const disposition = response.headers.get('content-disposition');
      let filename = `purchase-orders-export-${new Date().toISOString()}.csv`;
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
      toast.success("POs exported successfully!");
    } catch (error) {
      toast.dismiss();
      toast.error(error instanceof Error ? error.message : "An unknown error occurred during export.");
    } finally {
      setIsExporting(false);
    }
  };

  const confirmDelete = () => {
    if (selectedPoId) {
      deleteMutation.mutate(selectedPoId);
    }
    setIsModalOpen(false);
    setSelectedPoId(null);
  };

  const pos = data?.pos || [];
  const total = data?.total || 0;
  const pageCount = Math.ceil(total / pageSize);

  const handleSearch = (query: string) => {
    setPage(1);
    setSearchTerm(query);
  };

  const handleFilter = (filters: { status: string[] }) => {
    setPage(1);
    setStatusFilter(filters.status.join(','));
  };

  if (isLoading) {
    return (
      <PageLayout title="Purchase Orders">
        <LoadingSpinner />
      </PageLayout>
    );
  }

  if (isError) {
    return (
      <PageLayout title="Purchase Orders">
        <ErrorDisplay
          title="Error Loading Purchase Orders"
          message={error.message}
          onRetry={() => window.location.reload()}
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Purchase Orders">
      <div className="space-y-8 animate-in fade-in duration-500">
        <ConfirmationModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onConfirm={confirmDelete}
          title="Confirm Deletion"
          message="Are you sure you want to delete this Purchase Order? This action cannot be undone."
        />

        {/* Creative Header Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Total POs Card */}
          <Card className="border-0 shadow bg-white rounded-xl overflow-hidden relative group hover:shadow-lg transition-all transform hover:-translate-y-1">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <FileText className="w-24 h-24 text-indigo-600" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Total Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-extrabold text-slate-800">{total}</div>
              <p className="text-xs text-slate-400 mt-1">Processed to date</p>
            </CardContent>
          </Card>

          {/* Export Action Card */}
          <Card className="border-0 shadow bg-emerald-600 rounded-xl overflow-hidden relative group cursor-pointer hover:bg-emerald-700 transition-colors" onClick={handleExport}>
            <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-30">
              <Download className="w-24 h-24 text-white" />
            </div>
            <CardContent className="flex flex-col justify-center h-full text-white p-6">
              <div className="font-bold text-2xl mb-1 flex items-center gap-2">
                <Download className="w-6 h-6" /> Export
              </div>
              <p className="text-emerald-100 text-sm opacity-80">Download CSV report.</p>
            </CardContent>
          </Card>

          {/* Create Action Card */}
          {canCreate && (
            <Card className="border-0 shadow bg-indigo-600 rounded-xl overflow-hidden relative group cursor-pointer hover:bg-indigo-700 transition-colors" onClick={() => router.push('/po/create')}>
              <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-30">
                <Plus className="w-24 h-24 text-white" />
              </div>
              <CardContent className="flex flex-col justify-center h-full text-white p-6">
                <div className="font-bold text-2xl mb-1 flex items-center gap-2">
                  <Plus className="w-6 h-6" /> Create PO
                </div>
                <p className="text-indigo-100 text-sm opacity-80">Issue a new purchase order.</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Search & Filter */}
        <div className="bg-white p-4 rounded-xl shadow border-0 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <SearchAndFilter
            onSearch={handleSearch}
            onFilter={handleFilter}
            filterOptions={{
              status: Object.values(POStatus),
              dateRange: true
            }}
            placeholder="Search POs..."
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
                <TableHead className="w-[120px] pl-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">PO Number</TableHead>
                <TableHead className="py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Vendor & Title</TableHead>
                <TableHead className="py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</TableHead>
                <TableHead className="text-right py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Total Amount</TableHead>
                <TableHead className="text-right pr-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <FileText className="w-12 h-12 mb-4 text-slate-200" />
                      <p className="text-lg font-medium text-slate-600">No POs found</p>
                      <Button variant="outline" className="mt-4" onClick={() => router.push('/po/create')}>Create First PO</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                pos.map((po: PurchaseOrder) => (
                  <TableRow key={po.id} className="cursor-pointer hover:bg-blue-50/30 transition-colors border-slate-100">
                    <TableCell className="font-semibold text-blue-600 pl-6 py-4">
                      <Link href={`/po/${po.id}`} className="hover:underline flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                        {po.poNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-700">{po.title}</span>
                        <span className="text-xs text-slate-500">Vendor ID: {po.vendorId}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <Badge variant="outline" className={`${getPOStatusColor(po.status)} border-0 px-3 py-1`}>
                        {po.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-bold text-slate-700 py-4 font-mono">
                      {formatCurrency(po.grandTotal)}
                    </TableCell>
                    <TableCell className="text-right pr-6 py-4">
                      <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" onClick={() => router.push(`/po/${po.id}`)} className="h-8 w-8 hover:bg-indigo-100/50 hover:text-indigo-600">
                          <Eye className="h-4 w-4" />
                        </Button>
                        {canUpdate && po.status === "DRAFT" && (
                          <Button variant="ghost" size="icon" onClick={() => router.push(`/po/${po.id}/edit`)} className="h-8 w-8 hover:bg-blue-100/50 hover:text-blue-600">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete && po.status === "DRAFT" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(po.id as string)}
                            disabled={deleteMutation.isPending}
                            className="h-8 w-8 hover:bg-red-100/50 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

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

// Wrap the main component in a Suspense boundary
export default function POListPageWrapper() {
  return (
    <Suspense fallback={<PageLayout title="Purchase Orders"><LoadingSpinner /></PageLayout>}>
      <POList />
    </Suspense>
  );
}