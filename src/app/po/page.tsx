// src/app/po/page.tsx
"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { PurchaseOrder, POStatus } from "@/types/po";
import SearchAndFilter from "@/components/SearchAndFilter";
import { useState } from "react";
import PageLayout from "@/components/PageLayout";
import { formatCurrency, getPOStatusColor } from "@/lib/utils";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorDisplay from "@/components/ErrorDisplay";
import { useHasPermission } from "@/hooks/useHasPermission";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, Trash2, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

const fetchPOs = async (page = 1, pageSize = 10, searchTerm = "", status = "") => {
  const params = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString(),
    search: searchTerm,
    status: status,
  });
  const response = await fetch(`/api/po?${params.toString()}`);
  if (!response.ok) throw new Error("Network response was not ok");
  return response.json();
};

export default function POListPage() {
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const pageSize = 10;
  const router = useRouter();
  const queryClient = useQueryClient();
  const canDelete = useHasPermission("DELETE_PO");
  const canUpdate = useHasPermission("UPDATE_PO");
  const canCreate = useHasPermission("CREATE_PO");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["purchaseOrders", page, pageSize, searchTerm, statusFilter],
    queryFn: () => fetchPOs(page, pageSize, searchTerm, statusFilter),
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
    if (window.confirm("Are you sure you want to delete this PO?")) {
      deleteMutation.mutate(id);
    }
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
        <div className="flex justify-end mb-6">
          {canCreate && (
            <Link
              href="/po/create"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap"
            >
              Create New PO
            </Link>
          )}
        </div>

          {/* Search and Filter */}
          <SearchAndFilter
            onSearch={handleSearch}
            onFilter={handleFilter}
            filterOptions={{
              status: Object.values(POStatus),
              dateRange: true
            }}
            placeholder="Search POs by number, title, vendor, or status..."
          />

          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="border-b border-gray-200 bg-white px-4 py-5 sm:px-6">
              <h3 className="text-lg font-medium leading-6 text-gray-900">Purchase Orders</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">List of all purchase orders in the system</p>
            </div>
            
            <ul className="divide-y divide-gray-200">
              {pos.length === 0 ? (
                <li className="px-6 py-12 text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-gray-500 text-lg">No purchase orders found.</p>
                  <p className="text-gray-400 text-sm mt-2">Create your first purchase order to get started</p>
                </li>
              ) : (
                pos.map((po: PurchaseOrder) => (
                  <li key={po.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex-1 min-w-0">
                        <Link href={`/po/${po.id}`} className="text-sm font-medium text-blue-600 truncate hover:underline">
                          {po.poNumber}
                        </Link>
                        <p className="ml-3 text-sm text-gray-900 font-semibold truncate">
                          {po.title}
                        </p>
                      </div>
                      <div className="flex items-center space-x-4 flex-shrink-0">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPOStatusColor(po.status)}`}>
                          {po.status.replace("_", " ")}
                        </span>
                        <span className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                          {formatCurrency(po.grandTotal)}
                        </span>
                        <div className="flex items-center space-x-2">
                          <button onClick={() => router.push(`/po/${po.id}`)} className="p-1 text-gray-500 hover:text-gray-700">
                            <Eye size={18} />
                          </button>
                          {canUpdate && po.status === "DRAFT" && (
                            <button onClick={() => router.push(`/po/${po.id}/edit`)} className="p-1 text-gray-500 hover:text-gray-700">
                              <Pencil size={18} />
                            </button>
                          )}
                          {canDelete && po.status === "DRAFT" && po.id && (
                            <button onClick={() => handleDelete(po.id as string)} disabled={deleteMutation.isPending} className="p-1 text-red-500 hover:text-red-700 disabled:opacity-50">
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>

          {/* Pagination Controls */}
          {(pageCount > 1 || total > 0) && (
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{(page - 1) * pageSize + 1}</span> to <span className="font-medium">{Math.min(page * pageSize, total)}</span> of{' '}
                  <span className="font-medium">{total}</span> results
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-700">
                  Page <span className="font-medium">{page}</span> of <span className="font-medium">{pageCount}</span>
                </span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page >= pageCount}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
      </>
    </PageLayout>
  );
}