// src/app/cr/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckRequest, CRStatus } from "@/types/cr";

export default function CRListPage() {
  const [crs, setCrs] = useState<CheckRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCRs();
  }, []);

  const fetchCRs = async () => {
    try {
      const response = await fetch("/api/cr");
      if (response.ok) {
        const data = await response.json();
        setCrs(data);
      }
    } catch (error) {
      console.error("Error fetching CRs:", error);
    } finally {
      setLoading(false);
    }
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
          <h1 className="text-3xl font-bold text-gray-900">Check Requests</h1>
          <Link
            href="/cr/create"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
          >
            Create New CR
          </Link>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {crs.length === 0 ? (
              <li className="px-6 py-4 text-center text-gray-500">
                No check requests found. Create your first CR to get started.
              </li>
            ) : (
              crs.map((cr) => (
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
      </div>
    </div>
  );
}