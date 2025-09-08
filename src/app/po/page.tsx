// src/app/po/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PurchaseOrder } from "@/types/po";

export default function POListPage() {
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPOs();
  }, []);

  const fetchPOs = async () => {
    try {
      const response = await fetch("/api/po");
      if (response.ok) {
        const data = await response.json();
        setPos(data);
      }
    } catch (error) {
      console.error("Error fetching POs:", error);
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
      case "ORDERED": return "bg-purple-100 text-purple-800";
      case "DELIVERED": return "bg-teal-100 text-teal-800";
      case "CANCELLED": return "bg-red-100 text-red-800";
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

  // Check if a PO can be converted to CR
  const canCreateCR = (status: string) => {
    return ['APPROVED', 'ORDERED', 'DELIVERED'].includes(status);
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
          <h1 className="text-3xl font-bold text-gray-900">Purchase Orders</h1>
          <div className="space-x-4">
            <Link
              href="/po/create"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
            >
              Create New PO
            </Link>
            <Link
              href="/vendors"
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md"
            >
              Manage Vendors
            </Link>
          </div>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {pos.length === 0 ? (
              <li className="px-6 py-4 text-center text-gray-500">
                No purchase orders found. Create your first PO to get started.
              </li>
            ) : (
              pos.map((po) => (
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
                          {canCreateCR(po.status) && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Can Create CR
                            </span>
                          )}
                          <span className="text-sm font-semibold text-gray-900">
                            {formatCurrency(po.grandTotal)}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 sm:flex sm:justify-between">
                        <div className="sm:flex">
                          <p className="flex items-center text-sm text-gray-500">
                            Vendor: {po.vendorName}
                            {po.iom && (
                              <span className="ml-3 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                From IOM: {po.iom.iomNumber}
                              </span>
                            )}
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
      </div>
    </div>
  );
}