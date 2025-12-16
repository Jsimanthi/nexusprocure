"use client";

import ConfirmationModal from "@/components/ConfirmationModal";
import ErrorDisplay from "@/components/ErrorDisplay";
import LoadingSpinner from "@/components/LoadingSpinner";
import PageLayout from "@/components/PageLayout";
import SearchAndFilter from "@/components/SearchAndFilter";
import { useHasPermission } from "@/hooks/useHasPermission";
import { formatCurrency } from "@/lib/utils";
import { PaymentRequest, PRStatus } from "@/types/pr";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Eye, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

// New UI Components
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  const canDelete = useHasPermission("DELETE_PR");
  const canUpdate = useHasPermission("UPDATE_PR");
  const canCreate = useHasPermission("CREATE_PR");

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
      <div className="space-y-6 animate-in fade-in duration-500">
        <ConfirmationModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onConfirm={confirmDelete}
          title="Confirm Deletion"
          message="Are you sure you want to delete this Payment Request? This action cannot be undone."
        />

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <SearchAndFilter
            onSearch={handleSearch}
            onFilter={handleFilter}
            filterOptions={{
              status: Object.values(PRStatus),
              dateRange: true
            }}
            placeholder="Search PRs..."
            className="w-full md:w-auto md:flex-1 md:max-w-xl mb-0"
          />

          <div className="flex items-center gap-2 w-full md:w-auto">
            <Button variant="outline" onClick={handleExport} disabled={isExporting}>
              {isExporting ? <LoadingSpinner /> : <Download className="mr-2 h-4 w-4" />}
              Export
            </Button>
            {canCreate && (
              <Link href="/pr/create">
                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200">
                  <Plus className="mr-2 h-4 w-4" /> Create PR
                </Button>
              </Link>
            )}
          </div>
        </div>

        <Card className="border-0 shadow-xl bg-white/70 backdrop-blur-md">
          <CardHeader className="pb-2">
            <CardTitle>All Requests</CardTitle>
            <CardDescription>Manage your payment processing workflow.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border bg-white/50">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PR Number</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {prs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        No payment requests found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    prs.map((pr: PaymentRequest) => (
                      <TableRow key={pr.id} className="hover:bg-slate-50/80 transition-colors cursor-pointer" onClick={() => router.push(`/pr/${pr.id}`)}>
                        <TableCell className="font-medium text-indigo-600">{pr.prNumber}</TableCell>
                        <TableCell>{pr.title}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(pr.status)}>
                            {pr.status.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-bold font-mono text-slate-700">
                          {formatCurrency(pr.grandTotal)}
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => router.push(`/pr/${pr.id}`)}>
                              <Eye className="h-4 w-4 text-slate-500" />
                            </Button>
                            {canUpdate && pr.status === "DRAFT" && (
                              <Button variant="ghost" size="icon" onClick={() => router.push(`/pr/${pr.id}/edit`)}>
                                <Pencil className="h-4 w-4 text-blue-500" />
                              </Button>
                            )}
                            {canDelete && pr.status === "DRAFT" && (
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(pr.id)} disabled={deleteMutation.isPending} className="text-red-500 hover:text-red-700 hover:bg-red-50">
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
            </div>

            {/* Pagination */}
            {(pageCount > 1 || total > 0) && (
              <div className="flex items-center justify-end space-x-2 py-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <div className="text-sm text-muted-foreground">
                  Page {page} of {pageCount}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page >= pageCount}
                >
                  Next
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}