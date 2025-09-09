// src/app/cr/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CheckRequest, CRStatus, PaymentMethod } from "@/types/cr";
import PageLayout from "@/components/PageLayout";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorDisplay from "@/components/ErrorDisplay";
import { getCRStatusColor, formatCurrency } from "@/lib/utils";

export default function CRDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [cr, setCr] = useState<CheckRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchCR();
    }
  }, [params.id]);

  const fetchCR = async () => {
    try {
      const response = await fetch(`/api/cr/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setCr(data);
      } else {
        console.error("Failed to fetch CR");
      }
    } catch (error) {
      console.error("Error fetching CR:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (newStatus: CRStatus) => {
    setUpdating(true);
    try {
      const response = await fetch(`/api/cr/${params.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        const updatedCR = await response.json();
        setCr(updatedCR);
      } else {
        console.error("Failed to update status");
      }
    } catch (error) {
      console.error("Error updating status:", error);
    } finally {
      setUpdating(false);
    }
  };

  const getPaymentMethodLabel = (method: PaymentMethod) => {
    switch (method) {
      case PaymentMethod.CHEQUE: return "Cheque";
      case PaymentMethod.BANK_TRANSFER: return "Bank Transfer";
      case PaymentMethod.CASH: return "Cash";
      case PaymentMethod.ONLINE_PAYMENT: return "Online Payment";
      default: return method;
    }
  };

  const getAvailableStatusActions = (currentStatus: CRStatus) => {
    const actions: { status: CRStatus; label: string; color: string }[] = [];
    
    switch (currentStatus) {
      case CRStatus.DRAFT:
        actions.push(
          { status: CRStatus.PENDING_APPROVAL, label: "Submit for Approval", color: "bg-blue-600 hover:bg-blue-700" }
        );
        break;
      case CRStatus.PENDING_APPROVAL:
        actions.push(
          { status: CRStatus.APPROVED, label: "Approve CR", color: "bg-green-600 hover:bg-green-700" },
          { status: CRStatus.REJECTED, label: "Reject CR", color: "bg-red-600 hover:bg-red-700" }
        );
        break;
      case CRStatus.APPROVED:
        actions.push(
          { status: CRStatus.PROCESSED, label: "Mark as Processed", color: "bg-purple-600 hover:bg-purple-700" },
          { status: CRStatus.CANCELLED, label: "Cancel CR", color: "bg-red-600 hover:bg-red-700" }
        );
        break;
    }
    
    return actions;
  };

  if (loading) {
    return (
      <PageLayout title="Loading Check Request...">
        <LoadingSpinner />
      </PageLayout>
    );
  }

  if (!cr) {
    return (
      <PageLayout title="Check Request Not Found">
        <ErrorDisplay
          title="CR Not Found"
          message={`Could not find a Check Request with the ID: ${params.id}`}
        />
        <div className="mt-6 text-center">
          <Link href="/cr" className="text-blue-600 hover:text-blue-800">
            &larr; Back to CR List
          </Link>
        </div>
      </PageLayout>
    );
  }

  const statusActions = getAvailableStatusActions(cr.status as CRStatus);

  return (
    <PageLayout title={cr.title}>
      <div className="mb-6">
        <Link href="/cr" className="text-blue-600 hover:text-blue-800">
          &larr; Back to CR List
        </Link>
      </div>
      <div className="flex justify-between items-start mt-2 mb-6">
        <div>
          <p className="text-lg text-gray-600">{cr.crNumber}</p>
          {cr.po && (
            <p className="text-sm text-gray-500">
              Linked to PO: {cr.po.poNumber}
            </p>
          )}
        </div>
        <div className="text-right">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getCRStatusColor(cr.status)}`}>
            {cr.status.replace("_", " ")}
          </span>
          <p className="text-sm text-gray-500 mt-1">
                Created: {new Date(cr.createdAt!).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* CR Details */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Check Request Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Payment Information</h3>
                  <dl className="space-y-2">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Payment To</dt>
                      <dd className="text-sm text-gray-900">{cr.paymentTo}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Payment Date</dt>
                      <dd className="text-sm text-gray-900">{new Date(cr.paymentDate).toLocaleDateString()}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Payment Method</dt>
                      <dd className="text-sm text-gray-900">{getPaymentMethodLabel(cr.paymentMethod)}</dd>
                    </div>
                    {cr.bankAccount && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Bank Account</dt>
                        <dd className="text-sm text-gray-900">{cr.bankAccount}</dd>
                      </div>
                    )}
                    {cr.referenceNumber && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Reference Number</dt>
                        <dd className="text-sm text-gray-900">{cr.referenceNumber}</dd>
                      </div>
                    )}
                  </dl>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Purpose</h3>
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{cr.purpose}</p>
                </div>
              </div>
            </div>

            {/* PO Information (if linked) */}
            {cr.po && (
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Linked Purchase Order</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">PO Details</h3>
                    <dl className="space-y-2">
                      <div>
                        <dt className="text-sm font-medium text-gray-500">PO Number</dt>
                        <dd className="text-sm text-gray-900">{cr.po.poNumber}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Title</dt>
                        <dd className="text-sm text-gray-900">{cr.po.title}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Vendor</dt>
                        <dd className="text-sm text-gray-900">{cr.po.vendorName}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Status</dt>
                        <dd className="text-sm text-gray-900">{cr.po.status}</dd>
                      </div>
                    </dl>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Financial Summary</h3>
                    <dl className="space-y-2">
                      <div className="flex justify-between">
                        <dt className="text-sm font-medium text-gray-500">Total Amount</dt>
                        <dd className="text-sm text-gray-900">{formatCurrency(cr.po.grandTotal)}</dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status Actions */}
            {statusActions.length > 0 && (
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">CR Actions</h3>
                <div className="space-y-2">
                  {statusActions.map((action) => (
                    <button
                      key={action.status}
                      onClick={() => updateStatus(action.status)}
                      disabled={updating}
                      className={`w-full ${action.color} text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50`}
                    >
                      {updating ? "Updating..." : action.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Financial Summary */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Financial Summary</h3>
              <dl className="space-y-2">
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">Total Amount</dt>
                  <dd className="text-sm text-gray-900">{formatCurrency(cr.totalAmount)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">Tax Amount</dt>
                  <dd className="text-sm text-gray-900">{formatCurrency(cr.taxAmount)}</dd>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <dt className="text-sm font-semibold text-gray-900">Grand Total</dt>
                  <dd className="text-sm font-bold text-gray-900">{formatCurrency(cr.grandTotal)}</dd>
                </div>
              </dl>
            </div>

            {/* People Involved */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">People Involved</h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Prepared By</dt>
                  <dd className="text-sm text-gray-900">
                    {cr.preparedBy?.name} ({cr.preparedBy?.email})
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Requested By</dt>
                  <dd className="text-sm text-gray-900">
                    {cr.requestedBy?.name} ({cr.requestedBy?.email})
                  </dd>
                </div>
                {cr.reviewedBy && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Reviewed By</dt>
                    <dd className="text-sm text-gray-900">
                      {cr.reviewedBy.name} ({cr.reviewedBy.email})
                    </dd>
                  </div>
                )}
                {cr.approvedBy && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Approved By</dt>
                    <dd className="text-sm text-gray-900">
                      {cr.approvedBy.name} ({cr.approvedBy.email})
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Print Button */}
            <div className="bg-white shadow rounded-lg p-6">
              <button
                onClick={() => window.print()}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Print CR
              </button>
            </div>
          </div>
        </div>
    </PageLayout>
  );
}