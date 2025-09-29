// src/app/vendors/page.tsx
"use client";
import { useState } from "react";
import Link from "next/link";
import { Vendor } from "@/types/po";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import SearchAndFilter from "@/components/SearchAndFilter";
import PageLayout from "@/components/PageLayout";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorDisplay from "@/components/ErrorDisplay";

// Now, this import will work correctly
import { FilterState } from "@/components/SearchAndFilter";

const fetchVendors = async (page = 1, pageSize = 10) => {
  const response = await fetch(`/api/vendors?page=${page}&pageSize=${pageSize}`);
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Network response was not ok");
  }
  return response.json();
};

const saveVendor = async (vendor: Partial<Vendor>) => {
  const url = vendor.id ? `/api/vendors/${vendor.id}` : "/api/vendors";
  const method = vendor.id ? "PUT" : "POST";
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(vendor),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to save vendor");
  }
  return response.json();
};

const deleteVendor = async (id: string) => {
  const response = await fetch(`/api/vendors/${id}`, { method: "DELETE" });
  if (!response.ok) {
    throw new Error("Failed to delete vendor");
  }
  return response.json();
};

export default function VendorsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [showForm, setShowForm] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [formData, setFormData] = useState<Partial<Vendor>>({});

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["vendors", page, pageSize],
    queryFn: () => fetchVendors(page, pageSize),
  });
  const vendors = data?.data || [];
  const total = data?.total || 0;
  const pageCount = data?.pageCount || 0;

  const mutation = useMutation({
    mutationFn: saveVendor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      cancelForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteVendor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  const handleEdit = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setFormData(vendor);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this vendor?")) {
      deleteMutation.mutate(id);
    }
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingVendor(null);
    setFormData({});
  };

  const handleSearch = (query: string) => {
    console.log("Search query:", query);
  };

  const handleFilter = (filters: FilterState) => {
    console.log("Filters:", filters);
  };

  if (isLoading) {
    return (
      <PageLayout title="Vendor Management">
        <LoadingSpinner />
      </PageLayout>
    );
  }

  if (isError) {
    return (
      <PageLayout title="Vendor Management">
        <ErrorDisplay
          title="Error Loading Vendors"
          message={error.message}
          onRetry={() => window.location.reload()}
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Vendor Management">
      <>
        <div className="flex justify-end mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/po"
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors text-center"
            >
              Back to POs
            </Link>
            <button
              onClick={() => {
                cancelForm();
                setShowForm(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Add New Vendor
            </button>
          </div>
        </div>

        {/* Search and Filter */}
        <SearchAndFilter
          onSearch={handleSearch}
          onFilter={handleFilter}
          filterOptions={{
            dateRange: true
          }}
          placeholder="Search vendors by name, email, phone, or currency..."
        />

        {/* Vendor Form */}
        {showForm && (
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">
              {editingVendor ? "Edit Vendor" : "Add New Vendor"}
            </h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Vendor Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Enter vendor name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="vendor@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone *</label>
                <input
                  type="tel"
                  required
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="+91 1234567890"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tax ID (GSTIN)</label>
                <input
                  type="text"
                  value={formData.taxId || ''}
                  onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="GSTIN number"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Address *</label>
                <textarea
                  rows={3}
                  required
                  value={formData.address || ''}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Full vendor address"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Contact Info *</label>
                <input
                  type="text"
                  required
                  value={formData.contactInfo || ''}
                  onChange={(e) => setFormData({ ...formData, contactInfo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Contact person name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
                <input
                  type="url"
                  value={formData.website || ''}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="https://vendor-website.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Default Currency</label>
                <select
                  value={formData.currency || 'INR'}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                >
                  <option value="INR">INR (Indian Rupee)</option>
                  <option value="USD">USD (US Dollar)</option>
                  <option value="EUR">EUR (Euro)</option>
                  <option value="GBP">GBP (British Pound)</option>
                  <option value="JPY">JPY (Japanese Yen)</option>
                </select>
              </div>
              <div className="md:col-span-2 flex justify-end space-x-4 pt-4">
                <button
                  type="button"
                  onClick={cancelForm}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={mutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {mutation.isPending ? 'Saving...' : (editingVendor ? "Update Vendor" : "Add Vendor")}
                </button>
              </div>
              {mutation.isError && (
                <div className="md:col-span-2">
                  <p className="text-red-500 text-sm">{mutation.error.message}</p>
                </div>
              )}
            </form>
          </div>
        )}

        {/* Vendors List */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="border-b border-gray-200 bg-white px-4 py-5 sm:px-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Vendors</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">List of all vendors in the system</p>
          </div>
          
          <ul className="divide-y divide-gray-200">
            {vendors.length === 0 ? (
              <li className="px-6 py-12 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p className="text-gray-500 text-lg">No vendors found.</p>
                <p className="text-gray-400 text-sm mt-2">Add your first vendor to get started</p>
              </li>
            ) : (
              vendors.map((vendor: Vendor) => (
                <li key={vendor.id} className="hover:bg-gray-50 transition-colors">
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-medium text-gray-900 truncate">
                          <Link href={`/vendors/${vendor.id}`} className="hover:underline text-blue-600">
                            {vendor.name}
                          </Link>
                          <span className="text-sm font-normal text-gray-500 ml-2">({vendor.currency})</span>
                        </h3>
                        <p className="text-sm text-gray-500 truncate">
                          {vendor.email} | {vendor.phone}
                        </p>
                      </div>
                      <div className="flex space-x-4 flex-shrink-0">
                        <button
                          onClick={() => handleEdit(vendor)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(vendor.id!)}
                          disabled={deleteMutation.isPending && deleteMutation.variables === vendor.id}
                          className="text-red-600 hover:text-red-800 text-sm font-medium transition-colors disabled:opacity-50"
                        >
                          {deleteMutation.isPending && deleteMutation.variables === vendor.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </div>
                    {vendor.taxId && (
                      <p className="text-sm text-gray-500 mt-2">
                        Tax ID: {vendor.taxId}
                      </p>
                    )}
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                      {vendor.address}
                    </p>
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