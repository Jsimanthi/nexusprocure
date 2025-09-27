// src/app/iom/[id]/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { IOM } from "@/types/iom";
import PageLayout from "@/components/PageLayout";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorDisplay from "@/components/ErrorDisplay";
import { getIOMStatusColor } from "@/lib/utils";
import { useHasPermission } from "@/hooks/useHasPermission";
import { useSession } from "next-auth/react";
import IOMPrintView from "@/components/IOMPrintView";
import { ArrowLeft } from "lucide-react";

export default function IOMDetailPage() {
  const params = useParams();
  const { data: session } = useSession();
  const [iom, setIom] = useState<IOM | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const canCreatePO = useHasPermission('CREATE_PO');

  const fetchIOM = useCallback(async () => {
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
  }, [params.id]);

  useEffect(() => {
    if (params.id) {
      fetchIOM();
    }
  }, [params.id, fetchIOM]);

  const handleAction = async (action: 'APPROVE' | 'REJECT') => {
    setUpdating(true);
    try {
      const response = await fetch(`/api/iom/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (response.ok) {
        const updatedIOM = await response.json();
        setIom(updatedIOM);
      } else {
        const errorData = await response.json();
        console.error("Failed to update status:", errorData.error);
        // You might want to show a toast notification here
      }
    } catch (error) {
      console.error("Error updating status:", error);
    } finally {
      setUpdating(false);
    }
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

  const isReviewer = session?.user?.id === iom.reviewedById;
  const isApprover = session?.user?.id === iom.approvedById;

  const getActionStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'text-green-600';
      case 'REJECTED': return 'text-red-600';
      default: return 'text-yellow-600';
    }
  };

  const handlePrint = () => {
    const printContent = document.getElementById('iom-print-view');
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
          <title>Print IOM</title>
          ${styles}
          <style>
            @page {
              size: auto;
              margin: 0;
            }
            body, html {
              margin: 0;
              padding: 0;
              height: 100%;
            }
            body {
              padding: 2rem; /* Add some margin to the printed page */
              box-sizing: border-box;
            }
            #iom-print-view {
              display: flex;
              flex-direction: column;
              height: 100%; /* Make the container fill the body height */
              box-shadow: none !important;
              border: none !important;
            }
            .iom-main-content {
              flex-grow: 1;
            }
            .iom-footer {
              flex-shrink: 0;
              margin-top: auto; /* Push footer to the bottom */
            }
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
    <PageLayout title={iom.title}>
      <div className="mb-4">
        <div className="flex justify-between items-center">
          <p className="text-lg font-semibold text-gray-800">{iom.iomNumber}</p>
          <Link href="/iom" className="inline-flex items-center gap-2 rounded-md bg-gray-200 px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-300">
            <ArrowLeft className="h-4 w-4" />
            Back to IOM List
          </Link>
        </div>
        <div className="flex justify-end items-center gap-4 mt-1">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getIOMStatusColor(iom.status)}`}>
            {iom.status.replace("_", " ")}
          </span>
          <p className="text-sm text-gray-500">
            Created: {new Date(iom.createdAt!).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <IOMPrintView iom={iom} />
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* IOM Actions */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">IOM Actions</h3>
            <div className="space-y-2">
              {isReviewer && iom.reviewerStatus === 'PENDING' && (
                <div className="flex space-x-2">
                  <button onClick={() => handleAction('APPROVE')} disabled={updating} className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50">
                    {updating ? "Processing..." : "Approve (Review)"}
                  </button>
                  <button onClick={() => handleAction('REJECT')} disabled={updating} className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50">
                    {updating ? "Processing..." : "Reject (Review)"}
                  </button>
                </div>
              )}
              {isApprover && iom.approverStatus === 'PENDING' && (
                <div className="flex space-x-2">
                  <button onClick={() => handleAction('APPROVE')} disabled={updating} className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50">
                    {updating ? "Processing..." : "Approve (Final)"}
                  </button>
                  <button onClick={() => handleAction('REJECT')} disabled={updating} className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50">
                    {updating ? "Processing..." : "Reject (Final)"}
                  </button>
                </div>
              )}
              {iom.status === "APPROVED" && canCreatePO && (
                <Link href={`/po/create?iomId=${iom.id}`} className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium text-center block">
                  Convert to Purchase Order
                </Link>
              )}
              {iom.status !== 'DRAFT' && !isReviewer && !isApprover && iom.status !== 'APPROVED' && (
                <p className="text-sm text-gray-600">You are not assigned to review or approve this IOM.</p>
              )}
            </div>
          </div>

          {/* Approval Status */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Approval Status</h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">Reviewer Status</dt>
                <dd className={`text-sm font-semibold ${getActionStatusColor(iom.reviewerStatus)}`}>
                  {iom.reviewerStatus}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Approver Status</dt>
                <dd className={`text-sm font-semibold ${getActionStatusColor(iom.approverStatus)}`}>
                  {iom.approverStatus}
                </dd>
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
                  <dt className="text-sm font-medium text-gray-500">Selected Reviewer</dt>
                  <dd className="text-sm text-gray-900">
                    {iom.reviewedBy.name} ({iom.reviewedBy.email})
                  </dd>
                </div>
              )}
              {iom.approvedBy && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Selected Approver</dt>
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
              onClick={handlePrint}
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