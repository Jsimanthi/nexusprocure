// src/app/iom/page.tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { IOM, IOMStatus } from "@/types/iom";
import SearchAndFilter from "@/components/SearchAndFilter";
import { useState } from "react";

const fetchIOMs = async (page = 1, pageSize = 10) => {
  const response = await fetch(`/api/iom?page=${page}&pageSize=${pageSize}`);
  if (!response.ok) {
    throw new Error("Network response was not ok");
  }
  return response.json();
};

export default function IOMListPage() {
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["ioms", page, pageSize],
    queryFn: () => fetchIOMs(page, pageSize),
  });

  const ioms = data?.data || [];
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
          <h1 className="text-3xl font-bold text-gray-900">IOM Management</h1>
          <Link
            href="/iom/create"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
          >
            Create New IOM
          </Link>
        </div>

        {/* Search and Filter */}
        <SearchAndFilter
          onSearch={handleSearch}
          onFilter={handleFilter}
          filterOptions={{
            status: Object.values(IOMStatus),
            dateRange: true
          }}
          placeholder="Search IOMs by title, number, from, to, or subject..."
        />

        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {ioms.length === 0 ? (
              <li className="px-6 py-4 text-center text-gray-500">
                No IOMs found.
              </li>
            ) : (
              ioms.map((iom: IOM) => (
                <li key={iom.id}>
                  <Link href={`/iom/${iom.id}`} className="block hover:bg-gray-50">
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <span className="text-sm font-medium text-blue-600">
                            {iom.iomNumber}
                          </span>
                          <span className="ml-3 text-sm text-gray-900 font-semibold">
                            {iom.title}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(iom.status)}`}>
                            {iom.status.replace("_", " ")}
                          </span>
                          <span className="text-sm font-semibold text-gray-900">
                            {formatCurrency(iom.totalAmount)}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 sm:flex sm:justify-between">
                        <div className="sm:flex">
                          <p className="flex items-center text-sm text-gray-500">
                            From: {iom.from} → To: {iom.to}
                          </p>
                        </div>
                        <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                          <p>Created: {new Date(iom.createdAt!).toLocaleDateString()}</p>
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