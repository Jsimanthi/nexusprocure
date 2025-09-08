// src/app/iom/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { IOM, IOMStatus } from "@/types/iom";
import SearchAndFilter from "@/components/SearchAndFilter";

export default function IOMListPage() {
  const [ioms, setIoms] = useState<IOM[]>([]);
  const [filteredIoms, setFilteredIoms] = useState<IOM[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIOMs();
  }, []);

  const fetchIOMs = async () => {
    try {
      const response = await fetch("/api/iom");
      if (response.ok) {
        const data = await response.json();
        setIoms(data);
        setFilteredIoms(data);
      }
    } catch (error) {
      console.error("Error fetching IOMs:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    const filtered = ioms.filter(iom =>
      iom.title.toLowerCase().includes(query.toLowerCase()) ||
      iom.iomNumber.toLowerCase().includes(query.toLowerCase()) ||
      iom.from.toLowerCase().includes(query.toLowerCase()) ||
      iom.to.toLowerCase().includes(query.toLowerCase()) ||
      iom.subject.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredIoms(filtered);
  };

  const handleFilter = (filters: any) => {
    let filtered = ioms;

    // Status filter
    if (filters.status && filters.status.length > 0) {
      filtered = filtered.filter(iom => filters.status.includes(iom.status));
    }

    // Date range filter
    if (filters.dateRange.from) {
      filtered = filtered.filter(iom => 
        new Date(iom.createdAt!) >= new Date(filters.dateRange.from)
      );
    }
    if (filters.dateRange.to) {
      filtered = filtered.filter(iom => 
        new Date(iom.createdAt!) <= new Date(filters.dateRange.to)
      );
    }

    setFilteredIoms(filtered);
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
            {filteredIoms.length === 0 ? (
              <li className="px-6 py-4 text-center text-gray-500">
                {ioms.length === 0 
                  ? "No IOMs found. Create your first IOM to get started."
                  : "No IOMs match your search criteria."
                }
              </li>
            ) : (
              filteredIoms.map((iom) => (
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
                          <span className="text-sm text-gray-500">
                            ${iom.totalAmount.toFixed(2)}
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
      </div>
    </div>
  );
}