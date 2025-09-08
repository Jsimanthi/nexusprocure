// src/app/cr/page.tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { CheckRequest, CRStatus } from "@/types/cr";
import SearchAndFilter from "@/components/SearchAndFilter";
import { useState } from "react";

const fetchCRs = async (page = 1, pageSize = 10) => {
  const response = await fetch(`/api/cr?page=${page}&pageSize=${pageSize}`);
  if (!response.ok) {
    throw new Error("Network response was not ok");
  }
  return response.json();
};

export default function CRListPage() {
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["checkRequests", page, pageSize],
    queryFn: () => fetchCRs(page, pageSize),
  });

  const crs = data?.data || [];
  const total = data?.total || 0;
  const pageCount = data?.pageCount || 0;

  // TODO: Server-side search and filtering should be implemented.
  const handleSearch = (query: string) => {
    // console.log("Search query:", query);
  };

  const handleFilter = (filters: any) => {
    // console.log("Filters:", filters);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "DRAFT": return "bg-gray-100 text-gray-800";
      case "PENDING_APPROVAL": return "bg-blue-100 text-blue-800";
      case "APPROVED": return "bg-green-100 text-green-800";
      case "REJECTED": return "bg-red-100 text-red-800";
      case "PROCESSED": return "bg-purple-100 text-purple-800";
      case "CANCELLED": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-600">
        Error: {error.message}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Check Requests</h1>
          <Link
            href="/cr/create"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
          >
            Create New CR
          </Link>
        </div>

        {/* Search and Filter */}
        <SearchAndFilter
          onSearch={handleSearch}
          onFilter={handleFilter}
          filterOptions={{
            status: Object.values(CRStatus),
            dateRange: true
          }}
          placeholder="Search CRs by title, number, payment to, purpose, or PO number..."
        />

        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {crs.length === 0 ? (
              <li className="px-6 py-4 text-center text-gray-500">
                No check requests found.
              </li>
            ) : (
              crs.map((cr: CheckRequest) => (
                <li key={cr.id}>
                  <Link href={`/cr/${cr.id}`} className="block hover:bg-gray-50">
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <span className="text-sm font-medium text-blue-600">
                            {cr.crNumber}
                          </span>
                          <span className="ml-3 text-sm text-gray-900 font-semibold">
                            {cr.title}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(cr.status)}`}>
                            {cr.status.replace("_", " ")}
                          </span>
                          <span className="text-sm font-semibold text-gray-900">
                            {formatCurrency(cr.grandTotal)}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 sm:flex sm:justify-between">
                        <div className="sm:flex">
                          <p className="flex items-center text-sm text-gray-500">
                            Payment to: {cr.paymentTo}
                            {cr.po && (
                              <span className="ml-3 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                PO: {cr.po.poNumber}
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                          <p>Payment Date: {new Date(cr.paymentDate).toLocaleDateString()}</p>
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
  );
}