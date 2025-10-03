"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import PageLayout from "@/components/PageLayout";
import { Prisma, PaymentRequest, PaymentMethod } from "@prisma/client";
import LoadingSpinner from "@/components/LoadingSpinner";
import { toast } from "react-hot-toast";
import BackButton from "@/components/BackButton";

const prDetailValidator = Prisma.validator<Prisma.PaymentRequestDefaultArgs>()({});
type PRDetail = Prisma.PaymentRequestGetPayload<typeof prDetailValidator>;


interface FormData {
  title: string;
  paymentTo: string;
  paymentDate: string;
  purpose: string;
  paymentMethod: PaymentMethod;
  bankAccount: string;
  referenceNumber: string;
  totalAmount: number;
  taxAmount: number;
  grandTotal: number;
}

export default function EditPRPage() {
  const router = useRouter();
  const params = useParams();
  const prId = params.id as string;
  const [loading, setLoading] = useState(false);
  const [pr, setPr] = useState<PRDetail | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string[]>>>({});
  const firstInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<FormData>({
    title: "",
    paymentTo: "",
    paymentDate: new Date().toISOString().split('T')[0],
    purpose: "",
    paymentMethod: PaymentMethod.CHEQUE,
    bankAccount: "",
    referenceNumber: "",
    totalAmount: 0,
    taxAmount: 0,
    grandTotal: 0,
  });

  const fetchPR = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/pr/${prId}`);
      if (!response.ok) {
        toast.error("Failed to fetch payment request data.");
        router.push('/pr');
        return;
      }
      const data = await response.json();
      setPr(data);
      setFormData({
        title: data.title,
        paymentTo: data.paymentTo,
        paymentDate: new Date(data.paymentDate).toISOString().split('T')[0],
        purpose: data.purpose,
        paymentMethod: data.paymentMethod,
        bankAccount: data.bankAccount || "",
        referenceNumber: data.referenceNumber || "",
        totalAmount: data.totalAmount,
        taxAmount: data.taxAmount,
        grandTotal: data.grandTotal,
      });
    } catch (error) {
      toast.error("An unexpected error occurred while fetching data.");
      console.error("Error fetching PR:", error);
    } finally {
      setLoading(false);
    }
  }, [prId, router]);

  useEffect(() => {
    if (prId) {
      fetchPR();
    }
    firstInputRef.current?.focus();
  }, [prId, fetchPR]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      const response = await fetch(`/api/pr/${prId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success("Payment Request updated successfully!");
        router.push(`/pr/${prId}`);
      } else {
        const errorData = await response.json();
        if (response.status === 400 && errorData.details?.fieldErrors) {
          setErrors(errorData.details.fieldErrors);
          toast.error("Please correct the errors in the form.");
        } else {
          toast.error(`Error: ${errorData.error || "Failed to update PR"}`);
        }
      }
    } catch (error) {
      console.error("Error updating PR:", error);
      toast.error("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  if (!pr && loading) {
    return <PageLayout title="Edit Payment Request"><LoadingSpinner /></PageLayout>;
  }

  if (!pr) {
    return <PageLayout title="Error"><p>Payment Request not found.</p></PageLayout>;
  }

  return (
    <PageLayout title="Edit Payment Request">
      <div className="mb-6">
        <BackButton href={`/pr/${prId}`} />
      </div>
      <form onSubmit={handleSubmit} className="bg-white shadow-sm rounded-lg p-6 space-y-6">
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
                ref={firstInputRef}
              />
              {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title[0]}</p>}
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
              {errors.paymentTo && <p className="text-red-500 text-xs mt-1">{errors.paymentTo[0]}</p>}
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
              {errors.paymentDate && <p className="text-red-500 text-xs mt-1">{errors.paymentDate[0]}</p>}
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
            {errors.purpose && <p className="text-red-500 text-xs mt-1">{errors.purpose[0]}</p>}
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
              onClick={() => router.push(`/pr/${prId}`)}
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2 rounded-md flex items-center justify-center"
            >
            {loading && <LoadingSpinner />}
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
    </PageLayout>
  );
}