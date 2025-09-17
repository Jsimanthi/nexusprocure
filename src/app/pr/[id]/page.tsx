// src/app/pr/[id]/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PaymentRequest, PRStatus, PaymentMethod } from "@/types/pr";
import PageLayout from "@/components/PageLayout";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorDisplay from "@/components/ErrorDisplay";
import { getPRStatusColor, formatCurrency } from "@/lib/utils";
import { UserRef } from "@/types/iom";
import { PurchaseOrder } from "@prisma/client";
import { useSession } from "next-auth/react";
import { useHasPermission } from "@/hooks/useHasPermission";
import { User } from "next-auth";

type FullPaymentRequest = PaymentRequest & {
  po?: Partial<PurchaseOrder> | null;
  preparedBy?: UserRef | null;
  requestedBy?: UserRef | null;
  reviewedBy?: UserRef | null;
  approvedBy?: UserRef | null;
};

export default function PRDetailPage() {
  const params = useParams();
  const { data: session } = useSession();
  const [pr, setPr] = useState<FullPaymentRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Added permission check to view PR
  const canViewPR = useHasPermission('READ_PR');
  const canApprove = useHasPermission('APPROVE_PR');
  const canReject = useHasPermission('REJECT_PR');
  const canCancel = useHasPermission('CANCEL_PR');
  const canMarkAsProcessed = useHasPermission('PROCESS_PR');
  const isCreator = session?.user?.id === pr?.preparedById;

  const fetchPR = useCallback(async () => {
    try {
      const response = await fetch(`/api/pr/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setPr(data);
      } else {
        console.error("Failed to fetch PR");
      }
    } catch (error) {
      console.error("Error fetching PR:", error);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    if (!canViewPR) {
      setLoading(false);
      return;
    }
    if (params.id) {
      fetchPR();
    }
  }, [params.id, canViewPR, fetchPR]);

  const handleAction = async (action: "APPROVE" | "REJECT" | "PROCESS" | "CANCEL") => {
    setUpdating(true);
    try {
      const response = await fetch(`/api/pr/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (response.ok) {
        const updatedPR = await response.json();
        setPr(updatedPR);
      } else {
        const errorData = await response.json();
        console.error("Failed to update status:", errorData.error);
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


  if (loading) {
    return <PageLayout title="Loading Payment Request..."><LoadingSpinner /></PageLayout>;
  }

  // Display forbidden message if user lacks permission
  if (!canViewPR) {
    return (
      <PageLayout title="Access Denied">
        <ErrorDisplay
          title="Forbidden"
          message="You do not have permission to view this payment request."
        />
        <div className="mt-6 text-center">
          <Link href="/pr" className="text-blue-600 hover:text-blue-800">
            &larr; Back to PR List
          </Link>
        </div>
      </PageLayout>
    );
  }

  if (!pr) {
    return (
      <PageLayout title="Payment Request Not Found">
        <ErrorDisplay title="PR Not Found" message={`Could not find a Payment Request with the ID: ${params.id}`} />
        <div className="mt-6 text-center"><Link href="/pr" className="text-blue-600 hover:text-blue-800">&larr; Back to PR List</Link></div>
      </PageLayout>
    );
  }

  const isReviewer = session?.user?.id === pr.reviewedById;
  const isApprover = session?.user?.id === pr.approvedById;

  const getActionStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'text-green-600';
      case 'REJECTED': return 'text-red-600';
      default: return 'text-yellow-600';
    }
  };

  return (
    <PageLayout title={pr.title}>
      <div className="mb-6"><Link href="/pr" className="text-blue-600 hover:text-blue-800">&larr; Back to PR List</Link></div>
      <div className="flex justify-between items-start mt-2 mb-6">
        <div>
          <p className="text-lg text-gray-600">{pr.prNumber}</p>
          {pr.po && <p className="text-sm text-gray-500">Linked to PO: {pr.po.poNumber}</p>}
        </div>
        <div className="text-right">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getPRStatusColor(pr.status)}`}>{pr.status.replace("_", " ")}</span>
          <p className="text-sm text-gray-500 mt-1">Created: {new Date(pr.createdAt!).toLocaleDateString()}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Payment Request Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Payment Information</h3>
                <dl className="space-y-2">
                  <div><dt className="text-sm font-medium text-gray-500">Payment To</dt><dd className="text-sm text-gray-900">{pr.paymentTo}</dd></div>
                  <div><dt className="text-sm font-medium text-gray-500">Payment Date</dt><dd className="text-sm text-gray-900">{new Date(pr.paymentDate).toLocaleDateString()}</dd></div>
                  <div><dt className="text-sm font-medium text-gray-500">Payment Method</dt><dd className="text-sm text-gray-900">{getPaymentMethodLabel(pr.paymentMethod)}</dd></div>
                  {pr.bankAccount && <div><dt className="text-sm font-medium text-gray-500">Bank Account</dt><dd className="text-sm text-gray-900">{pr.bankAccount}</dd></div>}
                  {pr.referenceNumber && <div><dt className="text-sm font-medium text-gray-500">Reference Number</dt><dd className="text-sm text-gray-900">{pr.referenceNumber}</dd></div>}
                </dl>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Purpose</h3>
                <p className="text-sm text-gray-900 whitespace-pre-wrap">{pr.purpose}</p>
              </div>
            </div>
          </div>
          {pr.po && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Linked Purchase Order</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">PO Details</h3>
                  <dl className="space-y-2">
                    <div><dt className="text-sm font-medium text-gray-500">PO Number</dt><dd className="text-sm text-gray-900">{pr.po.poNumber}</dd></div>
                    <div><dt className="text-sm font-medium text-gray-500">Title</dt><dd className="text-sm text-gray-900">{pr.po.title}</dd></div>
                    <div><dt className="text-sm font-medium text-gray-500">Vendor</dt><dd className="text-sm text-gray-900">{pr.po.vendorName}</dd></div>
                    <div><dt className="text-sm font-medium text-gray-500">Status</dt><dd className="text-sm text-gray-900">{pr.po.status}</dd></div>
                  </dl>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Financial Summary</h3>
                  <dl className="space-y-2">
                    <div className="flex justify-between"><dt className="text-sm font-medium text-gray-500">Total Amount</dt><dd className="text-sm text-gray-900">{formatCurrency(pr.po.grandTotal!)}</dd></div>
                  </dl>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">PR Actions</h3>
            <div className="space-y-2">
              {isReviewer && pr.reviewerStatus === 'PENDING' && (
                <div className="flex space-x-2">
                  <button onClick={() => handleAction('APPROVE')} disabled={updating} className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50">
                    {updating ? "Processing..." : "Approve (Review)"}
                  </button>
                  <button onClick={() => handleAction('REJECT')} disabled={updating} className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50">
                    {updating ? "Processing..." : "Reject (Review)"}
                  </button>
                </div>
              )}
              {isApprover && pr.approverStatus === 'PENDING' && (
                <div className="flex space-x-2">
                  <button onClick={() => handleAction('APPROVE')} disabled={updating} className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50">
                    {updating ? "Processing..." : "Approve (Final)"}
                  </button>
                  <button onClick={() => handleAction('REJECT')} disabled={updating} className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50">
                    {updating ? "Processing..." : "Reject (Final)"}
                  </button>
                </div>
              )}
              {pr.status === 'APPROVED' && canMarkAsProcessed && (
                <button onClick={() => handleAction('PROCESS')} disabled={updating} className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50">
                  {updating ? "Processing..." : "Mark as Processed"}
                </button>
              )}
              {pr.status === 'APPROVED' && canCancel && (
                <button onClick={() => handleAction('CANCEL')} disabled={updating} className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50">
                  {updating ? "Processing..." : "Cancel PR"}
                </button>
              )}
            </div>
          </div>
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Approval Status</h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">Reviewer Status</dt>
                <dd className={`text-sm font-semibold ${getActionStatusColor(pr.reviewerStatus)}`}>
                  {pr.reviewerStatus}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Approver Status</dt>
                <dd className={`text-sm font-semibold ${getActionStatusColor(pr.approverStatus)}`}>
                  {pr.approverStatus}
                </dd>
              </div>
            </dl>
          </div>
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Financial Summary</h3>
            <dl className="space-y-2">
              <div className="flex justify-between"><dt className="text-sm font-medium text-gray-500">Total Amount</dt><dd className="text-sm text-gray-900">{formatCurrency(pr.totalAmount)}</dd></div>
              <div className="flex justify-between"><dt className="text-sm font-medium text-gray-500">Tax Amount</dt><dd className="text-sm text-gray-900">{formatCurrency(pr.taxAmount)}</dd></div>
              <div className="flex justify-between border-t pt-2"><dt className="text-sm font-semibold text-gray-900">Grand Total</dt><dd className="text-sm font-bold text-gray-900">{formatCurrency(pr.grandTotal)}</dd></div>
            </dl>
          </div>
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">People Involved</h3>
            <dl className="space-y-3">
              <div><dt className="text-sm font-medium text-gray-500">Prepared By</dt><dd className="text-sm text-gray-900">{pr.preparedBy?.name} ({pr.preparedBy?.email})</dd></div>
              <div><dt className="text-sm font-medium text-gray-500">Requested By</dt><dd className="text-sm text-gray-900">{pr.requestedBy?.name} ({pr.requestedBy?.email})</dd></div>
              {pr.reviewedBy && (<div><dt className="text-sm font-medium text-gray-500">Selected Reviewer</dt><dd className="text-sm text-gray-900">{pr.reviewedBy.name} ({pr.reviewedBy.email})</dd></div>)}
              {pr.approvedBy && (<div><dt className="text-sm font-medium text-gray-500">Selected Approver</dt><dd className="text-sm text-gray-900">{pr.approvedBy.name} ({pr.approvedBy.email})</dd></div>)}
            </dl>
          </div>
          <div className="bg-white shadow rounded-lg p-6">
            <button onClick={() => window.print()} className="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium">Print PR</button>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}