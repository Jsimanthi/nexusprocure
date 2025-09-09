"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { CheckRequest, CRStatus } from "@/types/cr";
import SearchAndFilter from "@/components/SearchAndFilter";
import { useState } from "react";
import PageLayout from "@/components/PageLayout";
import { formatCurrency, getCRStatusColor } from "@/lib/utils";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorDisplay from "@/components/ErrorDisplay";

const fetchCRs = async (page = 1, pageSize = 10, searchTerm = "", status = "") => {
  const params = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString(),
    search: searchTerm,
    status: status,
  });
  const response = await fetch(`/api/cr?${params.toString()}`);
  if (!response.ok) {
    throw new Error("Network response was not ok");
  }
  return response.json();
};

export default function CRListPage() {
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const pageSize = 10;
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["checkRequests", page, pageSize, searchTerm, statusFilter],
    queryFn: () => fetchCRs(page, pageSize, searchTerm, statusFilter),
  });

  const crs = data?.data || [];
  const total = data?.total || 0;
  const pageCount = data?.pageCount || 0;

  const handleSearch = (query: string) => {
    setPage(1);
    setSearchTerm(query);
  };

  const handleFilter = (filters: { status: string[] }) => {
    setPage(1);
    setStatusFilter(filters.status.join(","));
  };

  if (isLoading) {
    return (
      <PageLayout title="Check Requests">
        <LoadingSpinner />
      </PageLayout>
    );
  }

  if (isError) {
    return (
      <PageLayout title="Check Requests">
        <ErrorDisplay
          title="Error Loading Check Requests"
          message={error.message}
          onRetry={() => window.location.reload()}
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Check Requests">
      <>
        <div className="flex justify-end mb-6">
          <Link
            href="/cr/create"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap"
            >
              Create New CR
            </Link>
          </div>
          <SearchAndFilter
            onSearch={handleSearch}
            onFilter={handleFilter}
            filterOptions={{
              status: Object.values(CRStatus),
              dateRange: true
            }}
            placeholder="Search CRs by title, number, payment to, purpose, or PO number..."
          />
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="border-b border-gray-200 bg-white px-4 py-5 sm:px-6">
              <h3 className="text-lg font-medium leading-6 text-gray-900">Check Requests</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">List of all check requests in the system</p>
            </div>
            <ul className="divide-y divide-gray-200">
              {crs.length === 0 ? (
                <li className="px-6 py-12 text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-gray-500 text-lg">No check requests found.</p>
                  <p className="text-gray-400 text-sm mt-2">Create your first check request to get started</p>
                </li>
              ) : (
                crs.map((cr: CheckRequest) => (
                  <li key={cr.id} className="hover:bg-gray-50 transition-colors">
                    <Link href={`/cr/${cr.id}`} className="block">
                      <div className="px-4 py-4 sm:px-6">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center min-w-0">
                            <span className="text-sm font-medium text-blue-600 truncate">
                              {cr.crNumber}
                            </span>
                            <span className="ml-3 text-sm text-gray-900 font-semibold truncate">
                              {cr.title}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2 flex-shrink-0">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCRStatusColor(cr.status)}`}>
                              {cr.status.replace("_", " ")}
                            </span>
                            <span className="text-sm font-semibold text-gray-900 whitespace-nowrap">
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
                            <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                            </svg>
                            Payment Date: {new Date(cr.paymentDate).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </div>
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