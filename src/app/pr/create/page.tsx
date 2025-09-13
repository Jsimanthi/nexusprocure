// src/app/pr/create/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import BackButton from "@/components/BackButton";
import { PurchaseOrder } from "@/types/po";
import { PaymentMethod } from "@/types/pr";
import PageLayout from "@/components/PageLayout";
import { useSession } from "next-auth/react";

interface User {
  id: string;
  name: string;
}

interface FormData {
  title: string;
  poId: string;
  paymentTo: string;
  paymentDate: string;
  purpose: string;
  paymentMethod: PaymentMethod;
  bankAccount: string;
  referenceNumber: string;
  totalAmount: number;
  taxAmount: number;
  grandTotal: number;
  requestedById: string;
}

export default function CreatePRPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [selectedPo, setSelectedPo] = useState<PurchaseOrder | null>(null);
  const [formData, setFormData] = useState<Omit<FormData, 'reviewedById'>>({
    title: "",
    poId: "",
    paymentTo: "",
    paymentDate: new Date().toISOString().split('T')[0],
    purpose: "",
    paymentMethod: PaymentMethod.CHEQUE,
    bankAccount: "",
    referenceNumber: "",
    totalAmount: 0,
    taxAmount: 0,
    grandTotal: 0,
    requestedById: "",
  });

  useEffect(() => {
    fetchPOs();
  }, []);

  const fetchPOs = async () => {
    try {
      const response = await fetch("/api/pr/po");
      if (response.ok) {
        const data = await response.json();
        setPos(data);
      }
    } catch (error) {
      console.error("Error fetching POs:", error);
    }
  };

  const handlePoChange = (poId: string) => {
    const po = pos.find(p => p.id === poId);
    if (po) {
      setSelectedPo(po);
      setFormData(prev => ({
        ...prev,
        poId: po.id ?? "",
        title: `Payment for ${po.title}`,
        paymentTo: po.vendorName,
        totalAmount: po.totalAmount,
        taxAmount: po.taxAmount,
        grandTotal: po.grandTotal,
        requestedById: po.requestedById,
      }));
    } else {
      setSelectedPo(null);
      setFormData(prev => ({ 
        ...prev, 
        poId: "", 
        totalAmount: 0, 
        taxAmount: 0, 
        grandTotal: 0,
        requestedById: session?.user?.id || "",
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Prepare data for API - convert empty poId to undefined
      const submitData = {
        ...formData,
        poId: formData.poId || undefined,
        requestedById: formData.requestedById || session?.user?.id,
      };

      const response = await fetch("/api/pr", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      });

      if (response.ok) {
        router.push("/pr");
      } else {
        console.error("Failed to create PR");
      }
    } catch (error) {
      console.error("Error creating PR:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout title="Create Payment Request">
      <div className="mb-6">
        <BackButton href="/pr" />
      </div>
      <form onSubmit={handleSubmit} className="bg-white shadow-sm rounded-lg p-6 space-y-6">
          {/* PO Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Select Purchase Order</label>
            <select
              value={formData.poId}
              onChange={(e) => handlePoChange(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">Select a PO (optional)</option>
              {pos.map((po) => (
                <option key={po.id} value={po.id}>
                  {po.poNumber} - {po.title} (₹{po.grandTotal.toFixed(2)})
                </option>
              ))}
            </select>
            {selectedPo && (
              <p className="mt-2 text-sm text-green-600">
                Selected PO: {selectedPo.poNumber} - Vendor: {selectedPo.vendorName}
              </p>
            )}
          </div>

          {/* Basic PR Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">PR Title *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Payment Method *</label>
              <select
                required
                value={formData.paymentMethod}
                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as PaymentMethod })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value={PaymentMethod.CHEQUE}>Cheque</option>
                <option value={PaymentMethod.BANK_TRANSFER}>Bank Transfer</option>
                <option value={PaymentMethod.CASH}>Cash</option>
                <option value={PaymentMethod.ONLINE_PAYMENT}>Online Payment</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Payment To *</label>
              <input
                type="text"
                required
                value={formData.paymentTo}
                onChange={(e) => setFormData({ ...formData, paymentTo: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Payment Date *</label>
              <input
                type="date"
                required
                value={formData.paymentDate}
                onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Purpose *</label>
            <textarea
              rows={3}
              required
              value={formData.purpose}
              onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          {/* Payment Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Bank Account</label>
              <input
                type="text"
                value={formData.bankAccount}
                onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Required for bank transfers"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Reference Number</label>
              <input
                type="text"
                value={formData.referenceNumber}
                onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Check number, transaction ID, etc."
              />
            </div>
          </div>

          {/* Financial Summary */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Financial Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Total Amount</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.totalAmount}
                  onChange={(e) => setFormData({ ...formData, totalAmount: parseFloat(e.target.value) || 0 })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Tax Amount</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.taxAmount}
                  onChange={(e) => setFormData({ ...formData, taxAmount: parseFloat(e.target.value) || 0 })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Grand Total</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.grandTotal}
                  onChange={(e) => setFormData({ ...formData, grandTotal: parseFloat(e.target.value) || 0 })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 font-semibold"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.push("/pr")}
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2 rounded-md"
            >
              {loading ? "Creating..." : "Create PR"}
            </button>
          </div>
        </form>
    </PageLayout>
  );
}