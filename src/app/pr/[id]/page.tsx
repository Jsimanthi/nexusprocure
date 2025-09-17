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
  const [showApproverSelection, setShowApproverSelection] = useState(false);
  const [approvers, setApprovers] = useState<User[]>([]);
  const [selectedApprover, setSelectedApprover] = useState<string>('');

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

  const fetchApprovers = useCallback(async () => {
    try {
      // Fetch users who are managers and have the permission to approve PRs
      const response = await fetch('/api/users?permission=APPROVE_PR&role=MANAGER');
      if (response.ok) {
        const data = await response.json();
        setApprovers(data);
      } else {
        console.error("Failed to fetch approvers");
      }
    } catch (error) {
      console.error("Error fetching approvers:", error);
    }
  }, []);

  useEffect(() => {
    if (!canViewPR) {
      setLoading(false);
      return;
    }
    if (params.id) {
      fetchPR();
    }
    // Only fetch approvers if the user has a relevant permission
    if (canApprove) {
      fetchApprovers();
    }
  }, [params.id, canViewPR, canApprove, fetchPR, fetchApprovers]);

  const updateStatus = async (newStatus?: PRStatus, approverId?: string) => {
    setUpdating(true);
    try {
      const body: { status?: PRStatus; approverId?: string } = {};
      if (newStatus) body.status = newStatus;
      if (approverId) body.approverId = approverId;

      const response = await fetch(`/api/pr/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const updatedPR = await response.json();
        setPr(updatedPR);
      } else {
        console.error("Failed to update status");
      }
    } catch (error) {
      console.error("Error updating status:", error);
    } finally {
      setUpdating(false);
      setShowApproverSelection(false);
    }
  };

  const handleApproverSubmit = () => {
    if (selectedApprover) {
      updateStatus(PRStatus.PENDING_APPROVAL, selectedApprover);
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

  const getAvailableStatusActions = (currentStatus: PRStatus) => {
    const actions: { status: PRStatus; label: string; color: string; onClick: () => void }[] = [];

    switch (currentStatus) {
      case PRStatus.DRAFT:
        if (isCreator) {
          actions.push({ status: PRStatus.PENDING_APPROVAL, label: "Submit for Approval", color: "bg-blue-600 hover:bg-blue-700", onClick: () => setShowApproverSelection(true) });
        }
        break;
      case PRStatus.PENDING_APPROVAL:
        if (canApprove) {
          actions.push({ status: PRStatus.APPROVED, label: "Approve PR", color: "bg-green-600 hover:bg-green-700", onClick: () => updateStatus(PRStatus.APPROVED) });
        }
        if (canReject) {
          actions.push({ status: PRStatus.REJECTED, label: "Reject PR", color: "bg-red-600 hover:bg-red-700", onClick: () => updateStatus(PRStatus.REJECTED) });
        }
        break;
      case PRStatus.APPROVED:
        if (canMarkAsProcessed) {
          actions.push({ status: PRStatus.PROCESSED, label: "Mark as Processed", color: "bg-purple-600 hover:bg-purple-700", onClick: () => updateStatus(PRStatus.PROCESSED) });
        }
        if (canCancel) {
          actions.push({ status: PRStatus.CANCELLED, label: "Cancel PR", color: "bg-red-600 hover:bg-red-700", onClick: () => updateStatus(PRStatus.CANCELLED) });
        }
        break;
    }

    return actions;
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

  const statusActions = getAvailableStatusActions(pr.status as PRStatus);

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
          {statusActions.length > 0 && (
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">PR Actions</h3>
              <div className="space-y-2">
                {showApproverSelection ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Select Approver</label>
                      <select
                        value={selectedApprover}
                        onChange={(e) => setSelectedApprover(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      >
                        <option value="">Select an approver</option>
                        {approvers.map((approver) => (
                          <option key={approver.id} value={approver.id}>
                            {approver.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={handleApproverSubmit}
                      disabled={!selectedApprover || updating}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
                    >
                      {updating ? "Submitting..." : "Confirm & Submit"}
                    </button>
                    <button
                      onClick={() => setShowApproverSelection(false)}
                      disabled={updating}
                      className="w-full bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-md text-sm font-medium"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  statusActions.map((action) => (
                    <button
                      key={action.status}
                      onClick={action.onClick}
                      disabled={updating}
                      className={`w-full ${action.color} text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50`}
                    >
                      {updating ? "Updating..." : action.label}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
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
              {pr.reviewedBy && (<div><dt className="text-sm font-medium text-gray-500">Reviewed By</dt><dd className="text-sm text-gray-900">{pr.reviewedBy.name} ({pr.reviewedBy.email})</dd></div>)}
              {pr.approvedBy && (<div><dt className="text-sm font-medium text-gray-500">Approved By</dt><dd className="text-sm text-gray-900">{pr.approvedBy.name} ({pr.approvedBy.email})</dd></div>)}
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