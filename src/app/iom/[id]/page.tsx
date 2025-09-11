// src/app/iom/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { IOM, IOMStatus } from "@/types/iom";
import PageLayout from "@/components/PageLayout";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorDisplay from "@/components/ErrorDisplay";
import { getIOMStatusColor } from "@/lib/utils";
import { useHasPermission } from "@/hooks/useHasPermission";
import { User } from "next-auth";

export default function IOMDetailPage() {
  const params = useParams();
  const [iom, setIom] = useState<IOM | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showApproverModal, setShowApproverModal] = useState(false);
  const [approvers, setApprovers] = useState<User[]>([]);
  const [selectedApprover, setSelectedApprover] = useState<string>('');

  const canApprove = useHasPermission('APPROVE_IOM');
  const canReview = useHasPermission('REVIEW_IOM');

  useEffect(() => {
    if (params.id) {
      fetchIOM();
    }
    if (canReview) {
      fetchApprovers();
    }
  }, [params.id, canReview]);

  const fetchIOM = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/iom/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setIom(data);
      } else {
        console.error("Failed to fetch IOM");
      }
    } catch (error) {
      console.error("Error fetching IOM:", error);
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

  const updateStatus = async (newStatus?: IOMStatus, approverId?: string) => {
    setUpdating(true);
    try {
      const body: { status?: IOMStatus; approverId?: string } = {};
      if (newStatus) body.status = newStatus;
      if (approverId) body.approverId = approverId;

      const response = await fetch(`/api/iom/${params.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const updatedIOM = await response.json();
        setIom(updatedIOM);
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
      updateStatus(undefined, selectedApprover);
    }
  };

  const getAvailableStatusActions = (currentStatus: IOMStatus) => {
    const actions: { status: IOMStatus; label: string; color: string; onClick: () => void }[] = [];
    
    switch (currentStatus) {
      case IOMStatus.DRAFT:
        actions.push({
          status: IOMStatus.SUBMITTED,
          label: "Submit for Review",
          color: "bg-blue-600 hover:bg-blue-700",
          onClick: () => updateStatus(IOMStatus.SUBMITTED)
        });
        break;
      case IOMStatus.SUBMITTED:
        actions.push(
          { status: IOMStatus.UNDER_REVIEW, label: "Start Review", color: "bg-yellow-600 hover:bg-yellow-700", onClick: () => updateStatus(IOMStatus.UNDER_REVIEW) },
          { status: IOMStatus.REJECTED, label: "Reject", color: "bg-red-600 hover:bg-red-700", onClick: () => updateStatus(IOMStatus.REJECTED) }
        );
        break;
      case IOMStatus.UNDER_REVIEW:
        if (canApprove) {
          actions.push({ status: IOMStatus.APPROVED, label: "Approve", color: "bg-green-600 hover:bg-green-700", onClick: () => updateStatus(IOMStatus.APPROVED) });
        } else if (canReview) {
          actions.push({ status: IOMStatus.SUBMITTED, label: "Submit for Approval", color: "bg-blue-600 hover:bg-blue-700", onClick: () => setShowApproverModal(true) });
        }
        actions.push({ status: IOMStatus.REJECTED, label: "Reject", color: "bg-red-600 hover:bg-red-700", onClick: () => updateStatus(IOMStatus.REJECTED) });
        break;
      case IOMStatus.APPROVED:
        actions.push({ status: IOMStatus.COMPLETED, label: "Mark as Completed", color: "bg-purple-600 hover:bg-purple-700", onClick: () => updateStatus(IOMStatus.COMPLETED) });
        break;
    }
    
    return actions;
  };

  if (loading) {
    return (
      <PageLayout title="Loading IOM...">
        <LoadingSpinner />
      </PageLayout>
    );
  }

  if (!iom) {
    return (
      <PageLayout title="IOM Not Found">
        <ErrorDisplay
          title="IOM Not Found"
          message={`Could not find an IOM with the ID: ${params.id}`}
        />
        <div className="mt-6 text-center">
          <Link href="/iom" className="text-blue-600 hover:text-blue-800">
            &larr; Back to IOM List
          </Link>
        </div>
      </PageLayout>
    );
  }

  const statusActions = getAvailableStatusActions(iom.status as IOMStatus);

  return (
    <PageLayout title={iom.title}>
      {showApproverModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl">
            <h2 className="text-lg font-bold mb-4">Select Approver</h2>
            <select
              value={selectedApprover}
              onChange={(e) => setSelectedApprover(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="" disabled>Select an approver</option>
              {approvers.map((approver) => (
                <option key={approver.id} value={approver.id}>
                  {approver.name}
                </option>
              ))}
            </select>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowApproverModal(false)}
                className="px-4 py-2 bg-gray-300 rounded"
                disabled={updating}
              >
                Cancel
              </button>
              <button
                onClick={handleApproverSubmit}
                className="px-4 py-2 bg-blue-600 text-white rounded"
                disabled={!selectedApprover || updating}
              >
                {updating ? "Submitting..." : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="mb-6">
        <Link href="/iom" className="text-blue-600 hover:text-blue-800">
          &larr; Back to IOM List
        </Link>
      </div>
      <div className="flex justify-between items-start mt-2 mb-6">
        <div>
          <p className="text-lg text-gray-600">{iom.iomNumber}</p>
        </div>
        <div className="text-right">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getIOMStatusColor(iom.status)}`}>
            {iom.status.replace("_", " ")}
          </span>
          <p className="text-sm text-gray-500 mt-1">
            Created: {new Date(iom.createdAt!).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* IOM Details */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">IOM Details</h2>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">From</dt>
                <dd className="mt-1 text-sm text-gray-900">{iom.from}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">To</dt>
                <dd className="mt-1 text-sm text-gray-900">{iom.to}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Subject</dt>
                <dd className="mt-1 text-sm text-gray-900">{iom.subject}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Total Amount</dt>
                <dd className="mt-1 text-sm font-semibold text-gray-900">
                  ₹{iom.totalAmount.toFixed(2)}
                </dd>
              </div>
              <div className="md:col-span-2">
                <dt className="text-sm font-medium text-gray-500">Content</dt>
                <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
                  {iom.content || "No content provided."}
                </dd>
              </div>
            </dl>
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
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {iom.items.map((item, index) => (
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
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                        ₹{item.totalPrice.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
                      Grand Total:
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900">
                      ₹{iom.totalAmount.toFixed(2)}
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
              <h3 className="text-lg font-medium text-gray-900 mb-4">IOM Actions</h3>
              <div className="space-y-2">
                {statusActions.map((action) => (
                  <button
                    key={action.status}
                    onClick={action.onClick}
                    disabled={updating}
                    className={`w-full ${action.color} text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50`}
                  >
                    {updating ? "Updating..." : action.label}
                  </button>
                ))}

                {/* Add Convert to PO button for approved IOMs */}
                {iom.status === "APPROVED" && (
                  <Link
                    href={`/po/create?iomId=${iom.id}`}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium text-center block"
                  >
                    Convert to Purchase Order
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* People Involved */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">People Involved</h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">Prepared By</dt>
                <dd className="text-sm text-gray-900">
                  {iom.preparedBy?.name} ({iom.preparedBy?.email})
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Requested By</dt>
                <dd className="text-sm text-gray-900">
                  {iom.requestedBy?.name} ({iom.requestedBy?.email})
                </dd>
              </div>
              {iom.reviewedBy && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Reviewed By</dt>
                  <dd className="text-sm text-gray-900">
                    {iom.reviewedBy.name} ({iom.reviewedBy.email})
                  </dd>
                </div>
              )}
              {iom.approvedBy && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Approved By</dt>
                  <dd className="text-sm text-gray-900">
                    {iom.approvedBy.name} ({iom.approvedBy.email})
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
              Print IOM
            </button>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}