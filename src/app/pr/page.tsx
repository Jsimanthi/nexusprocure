"use client";

import ConfirmationModal from "@/components/ConfirmationModal";
import ErrorDisplay from "@/components/ErrorDisplay";
import LoadingSpinner from "@/components/LoadingSpinner";
import PageLayout from "@/components/PageLayout";
import SearchAndFilter from "@/components/SearchAndFilter";
import { useHasPermission } from "@/hooks/useHasPermission";
import { formatCurrency, getPRStatusColor } from "@/lib/utils";
import { Permission } from "@/types/auth";
import { PaymentRequest, PRStatus } from "@/types/pr";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Eye, FileText, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

// New UI Components
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

const fetchPRs = async (page = 1, pageSize = 10, searchTerm = "", status = "") => {
  const params = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString(),
    search: searchTerm,
    status: status,
  });
  const response = await fetch(`/api/pr?${params.toString()}`);
  if (!response.ok) {
    throw new Error("Network response was not ok");
  }
  return response.json();
};

export default function PRListPage() {
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPrId, setSelectedPrId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const pageSize = 10;
  const router = useRouter();
  const queryClient = useQueryClient();
  const canDelete = useHasPermission(Permission.DELETE_PR);
  const canUpdate = useHasPermission(Permission.UPDATE_PR);
  const canCreate = useHasPermission(Permission.CREATE_PR);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["paymentRequests", page, pageSize, searchTerm, statusFilter],
    queryFn: () => fetchPRs(page, pageSize, searchTerm, statusFilter),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/pr/${id}`, { method: "DELETE" });
      if (!response.ok) {
        throw new Error("Failed to delete PR");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["paymentRequests"] });
      toast.success("PR deleted successfully.");
    },
    onError: (error) => {
      toast.error(`Error deleting PR: ${error.message}`);
    },
  });

  const handleDelete = (id: string) => {
    setSelectedPrId(id);
    setIsModalOpen(true);
  };

  const handleExport = async () => {
    setIsExporting(true);
    toast.loading("Exporting PRs...");
    try {
      const response = await fetch("/api/pr/export");
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to export PRs.");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const disposition = response.headers.get('content-disposition');
      let filename = `payment-requests-export-${new Date().toISOString()}.csv`;
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
      toast.success("PRs exported successfully!");
    } catch (error) {
      toast.dismiss();
      toast.error(error instanceof Error ? error.message : "An unknown error occurred during export.");
    } finally {
      setIsExporting(false);
    }
  };

  const confirmDelete = () => {
    if (selectedPrId) {
      deleteMutation.mutate(selectedPrId);
    }
    setIsModalOpen(false);
    setSelectedPrId(null);
  };

  const prs = data?.paymentRequests || [];
  const total = data?.total || 0;
  const pageCount = Math.ceil(total / pageSize);

  const handleSearch = (query: string) => {
    setPage(1);
    setSearchTerm(query);
  };

  const handleFilter = (filters: { status: string[] }) => {
    setPage(1);
    setStatusFilter(filters.status.join(","));
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "APPROVED": return "success";
      case "REJECTED": return "destructive";
      case "PAID": return "success";
      case "PROCESSED": return "default";
      case "DRAFT": return "secondary";
      default: return "outline";
    }
  };

  if (isLoading) {
    return (
      <PageLayout title="Payment Requests">
        <LoadingSpinner />
      </PageLayout>
    );
  }

  if (isError) {
    return (
      <PageLayout title="Payment Requests">
        <ErrorDisplay
          title="Error Loading Payment Requests"
          message={error.message}
          onRetry={() => window.location.reload()}
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Payment Requests">
      <div className="space-y-8 animate-in fade-in duration-500">

        {/* Creative Header Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Total PRs Card */}
          <Card className="border-0 shadow bg-white rounded-xl overflow-hidden relative group hover:shadow-lg transition-all transform hover:-translate-y-1">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <FileText className="w-24 h-24 text-amber-500" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Total Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-extrabold text-slate-800">{total}</div>
              <p className="text-xs text-slate-400 mt-1">Pending & Approvals</p>
            </CardContent>
          </Card>

          {/* Create Action Card */}
          {canCreate && (
            <Card className="border-0 shadow bg-amber-500 rounded-xl overflow-hidden relative group cursor-pointer hover:bg-amber-600 transition-colors" onClick={() => router.push('/pr/create')}>
              <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-30">
                <Plus className="w-24 h-24 text-white" />
              </div>
              <CardContent className="flex flex-col justify-center h-full text-white p-6">
                <div className="font-bold text-2xl mb-1 flex items-center gap-2">
                  <Plus className="w-6 h-6" /> New Request
                </div>
                <p className="text-amber-100 text-sm opacity-80">Submit a new payment request.</p>
              </CardContent>
            </Card>
          )}

          {/* Export Action Card */}
          <Card className="border-0 shadow bg-slate-800 rounded-xl overflow-hidden relative group cursor-pointer hover:bg-slate-900 transition-colors" onClick={handleExport}>
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20">
              <Download className="w-24 h-24 text-white" />
            </div>
            <CardContent className="flex flex-col justify-center h-full text-white p-6">
              <div className="font-bold text-2xl mb-1 flex items-center gap-2">
                <Download className="w-6 h-6" /> Export data
              </div>
              <p className="text-slate-400 text-sm opacity-80">Download CSV report.</p>
            </CardContent>
          </Card>
        </div>

        {/* Search & Filter */}
        <div className="bg-white p-4 rounded-xl shadow border-0 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <SearchAndFilter
            onSearch={handleSearch}
            onFilter={handleFilter}
            filterOptions={{
              status: Object.values(PRStatus),
              dateRange: true
            }}
            placeholder="Search PRs..."
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
                <TableHead className="w-[120px] pl-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">PR Number</TableHead>
                <TableHead className="py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Title & Dept</TableHead>
                <TableHead className="py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</TableHead>
                <TableHead className="text-right py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Amount</TableHead>
                <TableHead className="text-right pr-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <FileText className="w-12 h-12 mb-4 text-slate-200" />
                      <p className="text-lg font-medium text-slate-600">No requests found</p>
                      <Button variant="outline" className="mt-4" onClick={() => router.push('/pr/create')}>Create First Request</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                prs.map((pr: PaymentRequest) => (
                  <TableRow key={pr.id} className="cursor-pointer hover:bg-amber-50/30 transition-colors border-slate-100">
                    <TableCell className="font-semibold text-amber-600 pl-6 py-4">
                      <Link href={`/pr/${pr.id}`} className="hover:underline flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                        {pr.prNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-700">{pr.title}</span>
                        <span className="text-xs text-slate-500 max-w-[200px] truncate">{pr.purpose || `ID: ${pr.id.substring(0, 8)}`}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <Badge variant="outline" className={`${getPRStatusColor(pr.status)} border-0 px-3 py-1`}>
                        {pr.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-bold text-slate-700 py-4 font-mono">
                      {formatCurrency(pr.grandTotal)}
                    </TableCell>
                    <TableCell className="text-right pr-6 py-4">
                      <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" onClick={() => router.push(`/pr/${pr.id}`)} className="h-8 w-8 hover:bg-indigo-100/50 hover:text-indigo-600">
                          <Eye className="h-4 w-4" />
                        </Button>
                        {canUpdate && pr.status === "DRAFT" && (
                          <Button variant="ghost" size="icon" onClick={() => router.push(`/pr/${pr.id}/edit`)} className="h-8 w-8 hover:bg-blue-100/50 hover:text-blue-600">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete && pr.status === "DRAFT" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(pr.id as string)}
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

      <ConfirmationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={confirmDelete}
        title="Confirm Deletion"
        message="Are you sure you want to delete this Payment Request? This action cannot be undone."
      />
    </PageLayout>
  );
}