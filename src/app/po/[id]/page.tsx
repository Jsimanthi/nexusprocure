// src/app/po/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PurchaseOrder, POStatus } from "@/types/po";
import { PaymentMethod } from "@/types/pr";
import PageLayout from "@/components/PageLayout";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorDisplay from "@/components/ErrorDisplay";
import { getPOStatusColor } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { useHasPermission } from "@/hooks/useHasPermission";
import { User } from "next-auth";

export default function PODetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [po, setPo] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [converting, setConverting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    PaymentMethod.CHEQUE
  );
  const [showApproverModal, setShowApproverModal] = useState(false);
  const [approvers, setApprovers] = useState<User[]>([]);
  const [selectedApprover, setSelectedApprover] = useState<string>('');

  const canApprove = useHasPermission('APPROVE_PO');
  const canReview = useHasPermission('REVIEW_PO');
  const isCreator = session?.user?.id === po?.preparedById;

  useEffect(() => {
    if (params.id) {
      fetchPO();
    }
    if (canReview) {
      fetchApprovers();
    }
  }, [params.id, canReview]);

  const fetchPO = async () => {
    try {
      const response = await fetch(`/api/po/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setPo(data);
      } else {
        console.error("Failed to fetch PO");
      }
    } catch (error) {
      console.error("Error fetching PO:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchApprovers = async () => {
    try {
      const response = await fetch('/api/users?role=MANAGER');
      if (response.ok) {
        const data = await response.json();
        setApprovers(data);
      } else {
        console.error("Failed to fetch approvers");
      }
    } catch (error) {
      console.error("Error fetching approvers:", error);
    }
  };

  const updateStatus = async (newStatus?: POStatus, approverId?: string) => {
    setUpdating(true);
    try {
      const body: { status?: POStatus; approverId?: string } = {};
      if (newStatus) body.status = newStatus;
      if (approverId) body.approverId = approverId;

      const response = await fetch(`/api/po/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const updatedPO = await response.json();
        setPo(updatedPO);
      } else {
        console.error("Failed to update status");
      }
    } catch (error) {
      console.error("Error updating status:", error);
    } finally {
      setUpdating(false);
      setShowApproverModal(false);
    }
  };

  const handleApproverSubmit = () => {
    if (selectedApprover) {
      updateStatus(POStatus.PENDING_APPROVAL, selectedApprover);
    }
  };

  const convertToPR = async () => {
    setConverting(true);
    try {
      const response = await fetch(`/api/po/${params.id}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethod }),
      });

      if (response.ok) {
        const pr = await response.json();
        router.push(`/cr/${pr.id}`); // Keep old route for now
      } else {
        const errorData = await response.json();
        console.error("Failed to convert PO to PR:", errorData.error);
        alert(`Failed to convert PO to PR: ${errorData.error}`);
      }
    } catch (error) {
      console.error("Error converting PO to PR:", error);
       alert("An unexpected error occurred while converting the PO to a PR.");
    } finally {
      setConverting(false);
    }
  };

  const getAvailableStatusActions = (currentStatus: POStatus) => {
    const actions: { status: POStatus; label: string; color: string; onClick: () => void }[] = [];
    
    switch (currentStatus) {
      case POStatus.DRAFT:
        if (isCreator) {
          actions.push({ status: POStatus.SUBMITTED, label: "Submit for Review", color: "bg-blue-600 hover:bg-blue-700", onClick: () => updateStatus(POStatus.SUBMITTED) });
        }
        break;
      case POStatus.SUBMITTED:
        if (isCreator) {
          actions.push({ status: POStatus.DRAFT, label: "Withdraw Request", color: "bg-gray-600 hover:bg-gray-700", onClick: () => updateStatus(POStatus.DRAFT) });
        } else if (canReview) {
          actions.push({ status: POStatus.UNDER_REVIEW, label: "Start Review", color: "bg-yellow-600 hover:bg-yellow-700", onClick: () => updateStatus(POStatus.UNDER_REVIEW) });
        }
        break;
      case POStatus.UNDER_REVIEW:
        if (canReview) {
          actions.push({ status: POStatus.PENDING_APPROVAL, label: "Submit for Approval", color: "bg-blue-600 hover:bg-blue-700", onClick: () => setShowApproverModal(true) });
        }
        break;
      case POStatus.PENDING_APPROVAL:
        if (canApprove) {
          actions.push({ status: POStatus.APPROVED, label: "Approve PO", color: "bg-green-600 hover:bg-green-700", onClick: () => updateStatus(POStatus.APPROVED) });
          actions.push({ status: POStatus.REJECTED, label: "Reject PO", color: "bg-red-600 hover:bg-red-700", onClick: () => updateStatus(POStatus.REJECTED) });
        }
        break;
      case POStatus.APPROVED:
        actions.push({ status: POStatus.ORDERED, label: "Mark as Ordered", color: "bg-purple-600 hover:bg-purple-700", onClick: () => updateStatus(POStatus.ORDERED) });
        actions.push({ status: POStatus.CANCELLED, label: "Cancel PO", color: "bg-red-600 hover:bg-red-700", onClick: () => updateStatus(POStatus.CANCELLED) });
        break;
      case POStatus.ORDERED:
        actions.push({ status: POStatus.DELIVERED, label: "Mark as Delivered", color: "bg-teal-600 hover:bg-teal-700", onClick: () => updateStatus(POStatus.DELIVERED) });
        break;
    }
    
    return actions;
  };

  const canConvertToPR = (status: string) => {
    return ['APPROVED', 'ORDERED', 'DELIVERED'].includes(status);
  };

  if (loading) {
    return (
      <PageLayout title="Loading Purchase Order...">
        <LoadingSpinner />
      </PageLayout>
    );
  }

  if (!po) {
    return (
      <PageLayout title="Purchase Order Not Found">
        <ErrorDisplay
          title="PO Not Found"
          message={`Could not find a Purchase Order with the ID: ${params.id}`}
        />
        <div className="mt-6 text-center">
          <Link href="/po" className="text-blue-600 hover:text-blue-800">
            &larr; Back to PO List
          </Link>
        </div>
      </PageLayout>
    );
  }

  const statusActions = getAvailableStatusActions(po.status as POStatus);

  return (
    <PageLayout title={po.title}>
      {showApproverModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl">
            <h2 className="text-lg font-bold mb-4">Select Approver</h2>
            <select value={selectedApprover} onChange={(e) => setSelectedApprover(e.target.value)} className="w-full p-2 border rounded">
              <option value="" disabled>Select an approver</option>
              {approvers.map((approver) => (<option key={approver.id} value={approver.id}>{approver.name}</option>))}
            </select>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setShowApproverModal(false)} className="px-4 py-2 bg-gray-300 rounded" disabled={updating}>Cancel</button>
              <button onClick={handleApproverSubmit} className="px-4 py-2 bg-blue-600 text-white rounded" disabled={!selectedApprover || updating}>{updating ? "Submitting..." : "Submit"}</button>
            </div>
          </div>
        </div>
      )}
      <div className="mb-6">
        <Link href="/po" className="text-blue-600 hover:text-blue-800">
          &larr; Back to PO List
        </Link>
      </div>
      <div className="flex justify-between items-start mt-2 mb-6">
        <div>
          <p className="text-lg text-gray-600">{po.poNumber}</p>
          {po.iom && (
            <p className="text-sm text-gray-500">
              Created from IOM: {po.iom.iomNumber}
            </p>
          )}
        </div>
        <div className="text-right">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getPOStatusColor(po.status)}`}>
            {po.status.replace("_", " ")}
          </span>
          <p className="text-sm text-gray-500 mt-1">
                Created: {new Date(po.createdAt!).toLocaleDateString()}
              </p>
            </div>
          </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* PO Details */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Purchase Order Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Company Details</h3>
                  <dl className="space-y-2">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Name</dt>
                      <dd className="text-sm text-gray-900">{po.companyName}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Address</dt>
                      <dd className="text-sm text-gray-900 whitespace-pre-wrap">{po.companyAddress}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Contact</dt>
                      <dd className="text-sm text-gray-900">{po.companyContact}</dd>
                    </div>
                  </dl>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Vendor Details</h3>
                  <dl className="space-y-2">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Name</dt>
                      <dd className="text-sm text-gray-900">{po.vendorName}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Address</dt>
                      <dd className="text-sm text-gray-900 whitespace-pre-wrap">{po.vendorAddress}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Contact</dt>
                      <dd className="text-sm text-gray-900">{po.vendorContact}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>

            {/* Items List */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Items</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Item
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Qty
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Unit Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tax Rate
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tax Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {po.items.map((item, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {item.itemName}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {item.description || "-"}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {item.quantity}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          ₹{item.unitPrice.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {item.taxRate}%
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          ₹{item.taxAmount.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                          ₹{item.totalPrice.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
                        Subtotal:
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                        ₹{po.totalAmount.toFixed(2)}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
                        Total Tax:
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                        ₹{po.taxAmount.toFixed(2)}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
                        Grand Total:
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-900">
                        ₹{po.grandTotal.toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status Actions */}
            {statusActions.length > 0 && (
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">PO Actions</h3>
                <div className="space-y-2">
                  {statusActions.map((action) => (<button key={action.status} onClick={action.onClick} disabled={updating} className={`w-full ${action.color} text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50`}>{updating ? "Updating..." : action.label}</button>))}
                </div>
              </div>
            )}

            {/* Convert to PR Button */}
            {canConvertToPR(po.status) && (
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Payment Processing
                </h3>
                <div className="mb-4">
                  <label
                    htmlFor="paymentMethod"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Payment Method
                  </label>
                  <select
                    id="paymentMethod"
                    name="paymentMethod"
                    value={paymentMethod}
                    onChange={(e) =>
                      setPaymentMethod(e.target.value as PaymentMethod)
                    }
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                  >
                    {Object.values(PaymentMethod).map((method) => (
                      <option key={method} value={method}>
                        {method.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={convertToPR}
                  disabled={converting}
                  className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  {converting ? "Converting..." : "Convert to Payment Request"}
                </button>
                <p className="text-sm text-gray-500 mt-2">
                  Create a payment request for this purchase order.
                </p>
              </div>
            )}

            {/* People Involved */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">People Involved</h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Prepared By</dt>
                  <dd className="text-sm text-gray-900">
                    {po.preparedBy?.name} ({po.preparedBy?.email})
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Requested By</dt>
                  <dd className="text-sm text-gray-900">
                    {po.requestedBy?.name} ({po.requestedBy?.email})
                  </dd>
                </div>
                {po.reviewedBy && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Reviewed By</dt>
                    <dd className="text-sm text-gray-900">
                      {po.reviewedBy.name} ({po.reviewedBy.email})
                    </dd>
                  </div>
                )}
                {po.approvedBy && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Approved By</dt>
                    <dd className="text-sm text-gray-900">
                      {po.approvedBy.name} ({po.approvedBy.email})
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Financial Summary */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Financial Summary</h3>
              <dl className="space-y-2">
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">Subtotal</dt>
                  <dd className="text-sm text-gray-900">₹{po.totalAmount.toFixed(2)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">Tax ({po.taxRate}%)</dt>
                  <dd className="text-sm text-gray-900">₹{po.taxAmount.toFixed(2)}</dd>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <dt className="text-sm font-semibold text-gray-900">Grand Total</dt>
                  <dd className="text-sm font-bold text-gray-900">₹{po.grandTotal.toFixed(2)}</dd>
                </div>
              </dl>
            </div>

            {/* Print Button */}
            <div className="bg-white shadow rounded-lg p-6">
              <button
                onClick={() => window.print()}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Print PO
              </button>
            </div>
          </div>
        </div>
    </PageLayout>
  );
}