// src/app/po/[id]/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PurchaseOrder } from "@/types/po";
import { PaymentMethod } from "@/types/pr";
import PageLayout from "@/components/PageLayout";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorDisplay from "@/components/ErrorDisplay";
import { getPOStatusColor } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { useHasPermission } from "@/hooks/useHasPermission";
import POPrintView from "@/components/POPrintView";

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

  // Add permission check to view PO
  const canViewPO = useHasPermission('READ_PO');
  const canCancel = useHasPermission('CANCEL_PO');
  const canMarkAsOrdered = useHasPermission('ORDER_PO');
  const canMarkAsDelivered = useHasPermission('DELIVER_PO');
  const canConvertToPR = useHasPermission('CREATE_PR');

  const fetchPO = useCallback(async () => {
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
  }, [params.id]);

  useEffect(() => {
    // Check permission before fetching data
    if (!canViewPO) {
      setLoading(false);
      return;
    }
    if (params.id) {
      fetchPO();
    }
  }, [params.id, canViewPO, fetchPO]);

  const handleAction = async (action: "APPROVE" | "REJECT" | "ORDER" | "DELIVER" | "CANCEL") => {
    setUpdating(true);
    try {
      const response = await fetch(`/api/po/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (response.ok) {
        const updatedPO = await response.json();
        setPo(updatedPO);
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
        router.push(`/pr/${pr.id}`);
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

  const isAllowedToConvertToPR = (status: string) => {
    return ['APPROVED', 'ORDERED', 'DELIVERED'].includes(status) && canConvertToPR;
  };

  if (loading) {
    return (
      <PageLayout title="Loading Purchase Order...">
        <LoadingSpinner />
      </PageLayout>
    );
  }

  // Display a forbidden message if the user does not have permission
  if (!canViewPO) {
    return (
      <PageLayout title="Access Denied">
        <ErrorDisplay
          title="Forbidden"
          message="You do not have permission to view this purchase order."
        />
        <div className="mt-6 text-center">
          <Link href="/po" className="text-blue-600 hover:text-blue-800">
            &larr; Back to PO List
          </Link>
        </div>
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

  const isReviewer = session?.user?.id === po.reviewedById;
  const isApprover = session?.user?.id === po.approvedById;

  const getActionStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'text-green-600';
      case 'REJECTED': return 'text-red-600';
      default: return 'text-yellow-600';
    }
  };

  const handlePrint = () => {
    const printContent = document.getElementById('po-print-view');
    if (!printContent) return;

    // Create a new iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    // Get stylesheets from the main document
    const styles = Array.from(document.styleSheets)
      .map(s => s.href ? `<link rel="stylesheet" href="${s.href}">` : (s.ownerNode as HTMLStyleElement)?.outerHTML)
      .join('');

    // Get the HTML content to print
    const content = printContent.outerHTML;

    // Write the content and styles to the iframe
    doc.open();
    doc.write(`
      <html>
        <head>
          <title>Print Purchase Order</title>
          ${styles}
          <style>
            @page { size: auto; margin: 0; }
            body, html { margin: 0; padding: 0; height: 100%; }
            body { padding: 2rem; box-sizing: border-box; }
            #po-print-view { display: flex; flex-direction: column; height: 100%; box-shadow: none !important; border: none !important; }
            .po-main-content { flex-grow: 1; }
            .po-footer { flex-shrink: 0; margin-top: auto; }
          </style>
        </head>
        <body>
          ${content}
        </body>
      </html>
    `);
    doc.close();

    // Wait for the iframe to load before printing
    iframe.onload = function() {
      if (iframe.contentWindow) {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      }
      // Remove the iframe after a delay
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 500);
    };
  };

  return (
    <PageLayout title={po.title}>
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
          <div className="lg:col-span-2">
            <POPrintView po={po} />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* PO Actions */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">PO Actions</h3>
              <div className="space-y-2">
                {isReviewer && po.reviewerStatus === 'PENDING' && (
                  <div className="flex space-x-2">
                    <button onClick={() => handleAction('APPROVE')} disabled={updating} className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50">
                      {updating ? "Processing..." : "Approve (Review)"}
                    </button>
                    <button onClick={() => handleAction('REJECT')} disabled={updating} className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50">
                      {updating ? "Processing..." : "Reject (Review)"}
                    </button>
                  </div>
                )}
                {isApprover && po.approverStatus === 'PENDING' && (
                  <div className="flex space-x-2">
                    <button onClick={() => handleAction('APPROVE')} disabled={updating} className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50">
                      {updating ? "Processing..." : "Approve (Final)"}
                    </button>
                    <button onClick={() => handleAction('REJECT')} disabled={updating} className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50">
                      {updating ? "Processing..." : "Reject (Final)"}
                    </button>
                  </div>
                )}
                {po.status === 'APPROVED' && canMarkAsOrdered && (
                  <button onClick={() => handleAction('ORDER')} disabled={updating} className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50">
                    {updating ? "Processing..." : "Mark as Ordered"}
                  </button>
                )}
                {po.status === 'ORDERED' && canMarkAsDelivered && (
                  <button onClick={() => handleAction('DELIVER')} disabled={updating} className="w-full bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50">
                    {updating ? "Processing..." : "Mark as Delivered"}
                  </button>
                )}
                {po.status === 'APPROVED' && canCancel && (
                  <button onClick={() => handleAction('CANCEL')} disabled={updating} className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50">
                    {updating ? "Processing..." : "Cancel PO"}
                  </button>
                )}
              </div>
            </div>

            {/* Approval Status */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Approval Status</h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Reviewer Status</dt>
                  <dd className={`text-sm font-semibold ${getActionStatusColor(po.reviewerStatus)}`}>
                    {po.reviewerStatus}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Approver Status</dt>
                  <dd className={`text-sm font-semibold ${getActionStatusColor(po.approverStatus)}`}>
                    {po.approverStatus}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Convert to PR Button */}
            {isAllowedToConvertToPR(po.status) && (
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
                    <dt className="text-sm font-medium text-gray-500">Selected Reviewer</dt>
                    <dd className="text-sm text-gray-900">
                      {po.reviewedBy.name} ({po.reviewedBy.email})
                    </dd>
                  </div>
                )}
                {po.approvedBy && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Selected Approver</dt>
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
                onClick={handlePrint}
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