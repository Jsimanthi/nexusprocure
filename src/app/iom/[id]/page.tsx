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
import { ArrowLeft, Download } from "lucide-react";

export default function IOMDetailPage() {
  const params = useParams();
  const { data: session } = useSession();
  const [iom, setIom] = useState<IOM | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

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
      <PageLayout>
        <LoadingSpinner />
      </PageLayout>
    );
  }

  if (!iom) {
    return (
      <PageLayout>
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

  const handleDownloadPdf = async () => {
    if (!iom) return;
    setIsDownloadingPdf(true);
    try {
      const response = await fetch(`/api/pdf/iom/${iom.id}/download`);
      if (!response.ok) {
        throw new Error('Failed to download PDF');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `IOM-${iom.iomNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Failed to download PDF.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  return (
    <PageLayout>
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">{iom.title}</h1>
          <Link href="/iom" className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            <ArrowLeft className="h-4 w-4" />
            Back to IOM List
          </Link>
        </div>
        <div className="flex justify-between items-center mt-2">
          <p className="text-lg font-semibold text-gray-800">{iom.iomNumber}</p>
          <div className="flex items-center gap-4">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getIOMStatusColor(iom.status)}`}>
              {iom.status.replace("_", " ")}
            </span>
            <p className="text-sm text-gray-500">
              Created: {new Date(iom.createdAt!).toLocaleDateString()}
            </p>
          </div>
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
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center justify-center disabled:opacity-50"
            >
              <Download className="h-4 w-4 mr-2" />
              {isDownloadingPdf ? 'Downloading...' : 'Download PDF'}
            </button>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}