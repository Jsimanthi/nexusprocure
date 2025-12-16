"use client";
import ConfirmationModal from "@/components/ConfirmationModal";
import ErrorDisplay from "@/components/ErrorDisplay";
import LoadingSpinner from "@/components/LoadingSpinner";
import PageLayout from "@/components/PageLayout";
import SearchAndFilter from "@/components/SearchAndFilter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { POStatus, PurchaseOrder } from "@/types/po";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Eye, Pencil, Trash2 } from "lucide-react";
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
  const canDelete = useHasPermission("DELETE_PO");
  const canUpdate = useHasPermission("UPDATE_PO");
  const canCreate = useHasPermission("CREATE_PO");

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
      <>
        <ConfirmationModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onConfirm={confirmDelete}
          title="Confirm Deletion"
          message="Are you sure you want to delete this Purchase Order? This action cannot be undone."
        />

        <div className="flex flex-col space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <SearchAndFilter
              onSearch={handleSearch}
              onFilter={handleFilter}
              filterOptions={{
                status: Object.values(POStatus),
                dateRange: true
              }}
              placeholder="Search POs..."
              className="w-full sm:w-auto flex-1"
            />

            <div className="flex gap-3">
              <Button
                onClick={handleExport}
                disabled={isExporting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20"
                size="sm"
              >
                <Download className="mr-2 h-4 w-4" />
                {isExporting ? "Exporting..." : "Export CSV"}
              </Button>

              {canCreate && (
                <Link href="/po/create">
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20" size="sm">
                    Create PO
                  </Button>
                </Link>
              )}
            </div>
          </div>

          <Card className="border-0 shadow-xl bg-white/50 backdrop-blur-xl ring-1 ring-slate-900/5">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-slate-200/60">
                  <TableHead className="w-[120px] pl-6">PO Number</TableHead>
                  <TableHead>Vendor & Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                  <TableHead className="text-right pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                      No Purchase Orders found.
                    </TableCell>
                  </TableRow>
                ) : (
                  pos.map((po: PurchaseOrder) => (
                    <TableRow key={po.id} className="cursor-pointer hover:bg-blue-50/30 transition-colors border-slate-200/60">
                      <TableCell className="font-semibold text-blue-600 pl-6">
                        <Link href={`/po/${po.id}`} className="hover:underline">
                          {po.poNumber}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-700">{po.title}</span>
                          <span className="text-xs text-slate-500">Vendor ID: {po.vendorId}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`${getPOStatusColor(po.status)} border-0`}>
                          {po.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold text-slate-700">
                        {formatCurrency(po.grandTotal)}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-1">
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
            <div className="flex items-center justify-between px-2">
              <p className="text-sm text-slate-500">
                Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} of {total} results
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="bg-white"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page >= pageCount}
                  className="bg-white"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </>
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