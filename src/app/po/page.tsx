"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { PurchaseOrder, POStatus } from "@/types/po";
import SearchAndFilter from "@/components/SearchAndFilter";
import DashboardHeader from "@/components/DashboardHeader";
import { useState } from "react";

const fetchPOs = async (page = 1, pageSize = 10) => {
  const response = await fetch(`/api/po?page=${page}&pageSize=${pageSize}`);
  if (!response.ok) throw new Error("Network response was not ok");
  return response.json();
};

export default function POListPage() {
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["purchaseOrders", page, pageSize],
    queryFn: () => fetchPOs(page, pageSize),
  });
  const pos = data?.data || [];
  const total = data?.total || 0;
  const pageCount = data?.pageCount || 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "DRAFT": return "bg-gray-100 text-gray-800";
      case "SUBMITTED": return "bg-blue-100 text-blue-800";
      case "UNDER_REVIEW": return "bg-yellow-100 text-yellow-800";
      case "APPROVED": return "bg-green-100 text-green-800";
      case "REJECTED": return "bg-red-100 text-red-800";
      case "COMPLETED": return "bg-purple-100 text-purple-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  // TODO: Implement server-side search and filtering
  const handleSearch = (query: string) => {
    console.log("Search query:", query);
  };

  const handleFilter = (filters: any) => {
    console.log("Filters:", filters);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <DashboardHeader />
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-gray-100">
        <DashboardHeader />
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0 flex items-center justify-center text-red-600">
            Error: {error.message}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <DashboardHeader />
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Purchase Orders</h1>
            <Link
              href="/po/create"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
            >
              Create New PO
            </Link>
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

          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {pos.length === 0 ? (
                <li className="px-6 py-4 text-center text-gray-500">
                  No POs found.
                </li>
              ) : (
                pos.map((po: PurchaseOrder) => (
                  <li key={po.id}>
                    <Link href={`/po/${po.id}`} className="block hover:bg-gray-50">
                      <div className="px-4 py-4 sm:px-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <span className="text-sm font-medium text-blue-600">
                              {po.poNumber}
                            </span>
                            <span className="ml-3 text-sm text-gray-900 font-semibold">
                              {po.title}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(po.status)}`}>
                              {po.status.replace("_", " ")}
                            </span>
                            <span className="text-sm font-semibold text-gray-900">
                              {formatCurrency(po.grandTotal)}
                            </span>
                          </div>
                        </div>
                        <div className="mt-2 sm:flex sm:justify-between">
                          <div className="sm:flex">
                            <p className="flex items-center text-sm text-gray-500">
                              Vendor: {po.vendorName}
                            </p>
                          </div>
                          <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                            <p>Created: {new Date(po.createdAt!).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </div>

          {/* Pagination Controls */}
          <div className="mt-6 flex items-center justify-between">
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
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-gray-700">
                Page <span className="font-medium">{page}</span> of <span className="font-medium">{pageCount}</span>
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= pageCount}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
