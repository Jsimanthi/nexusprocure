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
import { formatCurrency, getIOMStatusColor } from "@/lib/utils";
import { IOM, IOMStatus } from "@/types/iom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Eye, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

const fetchIOMs = async (page = 1, pageSize = 10, searchTerm = "", status = "") => {
  const params = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString(),
    search: searchTerm,
    status: status,
  });
  const response = await fetch(`/api/iom?${params.toString()}`);
  if (!response.ok) {
    throw new Error("Network response was not ok");
  }
  return response.json();
};

export default function IOMListPage() {
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedIomId, setSelectedIomId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const pageSize = 10;
  const router = useRouter();
  const queryClient = useQueryClient();
  const canDelete = useHasPermission("DELETE_IOM");
  const canUpdate = useHasPermission("UPDATE_IOM");
  const canCreate = useHasPermission("CREATE_IOM");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["ioms", page, pageSize, searchTerm, statusFilter],
    queryFn: () => fetchIOMs(page, pageSize, searchTerm, statusFilter),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/iom/${id}`, { method: "DELETE" });
      if (!response.ok) {
        throw new Error("Failed to delete IOM");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ioms"] });
      toast.success("IOM deleted successfully.");
    },
    onError: (error) => {
      toast.error(`Error deleting IOM: ${error.message}`);
    },
  });

  const handleDelete = (id: string) => {
    setSelectedIomId(id);
    setIsModalOpen(true);
  };

  const handleExport = async () => {
    setIsExporting(true);
    toast.loading("Exporting IOMs...");
    try {
      const response = await fetch("/api/iom/export");
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to export IOMs.");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      // Extract filename from content-disposition header if available
      const disposition = response.headers.get('content-disposition');
      let filename = `ioms-export-${new Date().toISOString()}.csv`;
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
      toast.success("IOMs exported successfully!");
    } catch (error) {
      toast.dismiss();
      toast.error(error instanceof Error ? error.message : "An unknown error occurred during export.");
    } finally {
      setIsExporting(false);
    }
  };

  const confirmDelete = () => {
    if (selectedIomId) {
      deleteMutation.mutate(selectedIomId);
    }
    setIsModalOpen(false);
    setSelectedIomId(null);
  };

  const ioms = data?.ioms || [];
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
      <PageLayout title="IOM Management">
        <LoadingSpinner />
      </PageLayout>
    );
  }

  if (isError) {
    return (
      <PageLayout title="IOM Management">
        <ErrorDisplay
          title="Error Loading IOMs"
          message={error.message}
          onRetry={() => window.location.reload()}
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout title="IOM Management">
      <>
        <ConfirmationModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onConfirm={confirmDelete}
          title="Confirm Deletion"
          message="Are you sure you want to delete this IOM? This action cannot be undone."
        />

        <div className="flex flex-col space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <SearchAndFilter
              onSearch={handleSearch}
              onFilter={handleFilter}
              filterOptions={{
                status: Object.values(IOMStatus),
                dateRange: true
              }}
              placeholder="Search IOMs..."
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
                <Link href="/iom/create">
                  <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20" size="sm">
                    Create IOM
                  </Button>
                </Link>
              )}
            </div>
          </div>

          <Card className="border-0 shadow-xl bg-white/50 backdrop-blur-xl ring-1 ring-slate-900/5">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-slate-200/60">
                  <TableHead className="w-[120px] pl-6">ID</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ioms.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                      No IOMs found. Create one to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  ioms.map((iom: IOM) => (
                    <TableRow key={iom.id} className="cursor-pointer hover:bg-indigo-50/30 transition-colors border-slate-200/60">
                      <TableCell className="font-semibold text-indigo-600 pl-6">
                        <Link href={`/iom/${iom.id}`} className="hover:underline">
                          {iom.iomNumber}
                        </Link>
                      </TableCell>
                      <TableCell className="font-medium text-slate-700">{iom.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`${getIOMStatusColor(iom.status)} border-0`}>
                          {iom.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold text-slate-700">
                        {formatCurrency(iom.totalAmount)}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => router.push(`/iom/${iom.id}`)} className="h-8 w-8 hover:bg-indigo-100/50 hover:text-indigo-600">
                            <Eye className="h-4 w-4" />
                          </Button>
                          {canUpdate && iom.status === "DRAFT" && (
                            <Button variant="ghost" size="icon" onClick={() => router.push(`/iom/${iom.id}/edit`)} className="h-8 w-8 hover:bg-blue-100/50 hover:text-blue-600">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete && iom.status === "DRAFT" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(iom.id as string)}
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