"use client";
import { useState } from "react";
import Link from "next/link";
import { Vendor } from "@/types/po";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardHeader from "@/components/DashboardHeader";
import SearchAndFilter from "@/components/SearchAndFilter";

const fetchVendors = async (page = 1, pageSize = 10) => {
  const response = await fetch(`/api/vendors?page=${page}&pageSize=${pageSize}`);
  if (!response.ok) {
    throw new Error("Network response was not ok");
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
            <h1 className="text-3xl font-bold text-gray-900">Vendor Management</h1>
            <div className="space-x-4">
              <Link
                href="/po"
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md"
              >
                Back to POs
              </Link>
              <button
                onClick={() => {
                  cancelForm();
                  setShowForm(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
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
              <h2 className="text-xl font-semibold mb-4">
                {editingVendor ? "Edit Vendor" : "Add New Vendor"}
              </h2>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Vendor Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone *</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tax ID (GSTIN)</label>
                  <input
                    type="text"
                    value={formData.taxId || ''}
                    onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Address *</label>
                  <textarea
                    rows={3}
                    required
                    value={formData.address || ''}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Contact Info *</label>
                  <input
                    type="text"
                    required
                    value={formData.contactInfo || ''}
                    onChange={(e) => setFormData({ ...formData, contactInfo: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Website</label>
                  <input
                    type="url"
                    value={formData.website || ''}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Default Currency</label>
                  <select
                    value={formData.currency || 'INR'}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option>INR</option>
                    <option>USD</option>
                    <option>EUR</option>
                    <option>GBP</option>
                    <option>JPY</option>
                  </select>
                </div>
                <div className="md:col-span-2 flex justify-end space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={cancelForm}
                    className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={mutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md disabled:opacity-50"
                  >
                    {mutation.isPending ? 'Saving...' : (editingVendor ? "Update Vendor" : "Add Vendor")}
                  </button>
                </div>
                {mutation.isError && <p className="text-red-500 md:col-span-2">{mutation.error.message}</p>}
              </form>
            </div>
          )}

          {/* Vendors List */}
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {vendors.length === 0 ? (
                <li className="px-6 py-4 text-center text-gray-500">No vendors found.</li>
              ) : (
                vendors.map((vendor: Vendor) => (
                  <li key={vendor.id} className="hover:bg-gray-50">
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">
                            {vendor.name} <span className="text-sm font-normal text-gray-500">({vendor.currency})</span>
                          </h3>
                          <p className="text-sm text-gray-500">{vendor.email} | {vendor.phone}</p>
                        </div>
                        <div className="flex space-x-4">
                          <button
                            onClick={() => handleEdit(vendor)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(vendor.id!)}
                            disabled={deleteMutation.isPending && deleteMutation.variables === vendor.id}
                            className="text-red-600 hover:text-red-800 text-sm font-medium disabled:opacity-50"
                          >
                            {deleteMutation.isPending && deleteMutation.variables === vendor.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </div>
                    </div>
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
