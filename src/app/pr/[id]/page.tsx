// src/app/pr/[id]/page.tsx
"use client";

import { BreadcrumbBackButton } from "@/components/BreadcrumbBackButton";
import ErrorDisplay from "@/components/ErrorDisplay";
import LoadingSpinner from "@/components/LoadingSpinner";
import PageLayout from "@/components/PageLayout";
import PRPrintView from "@/components/PRPrintView";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useHasPermission } from "@/hooks/useHasPermission";
import { formatCurrency } from "@/lib/utils";
import { Permission } from "@/types/auth";
import { UserRef } from "@/types/iom";
import { PaymentRequest } from "@/types/pr";
import { PurchaseOrder } from "@prisma/client";
import { AlertCircle, Banknote, Calendar, CheckCircle, CreditCard, FileText, Link as LinkIcon, Printer, XCircle } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";

type FullPaymentRequest = PaymentRequest & {
  po?: (Partial<PurchaseOrder> & {
    iom?: { iomNumber: string } | null;
  }) | null;
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

  // Permission checks
  const canViewPR = useHasPermission(Permission.READ_PR);
  const canCancel = useHasPermission(Permission.CANCEL_PR);
  const canMarkAsProcessed = useHasPermission(Permission.PROCESS_PAYMENT_REQUEST);

  const fetchPR = useCallback(async () => {
    try {
      const response = await fetch(`/api/pr/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setPr(data);
      } else {
        toast.error("Failed to fetch PR details");
      }
    } catch (error) {
      console.error("Error fetching PR:", error);
      toast.error("Network error when fetching PR");
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
      let response;
      if (action === 'PROCESS') {
        response = await fetch(`/api/pr/${params.id}/process`, {
          method: "POST",
        });
      } else {
        response = await fetch(`/api/pr/${params.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });
      }

      if (response.ok) {
        const updatedPR = await response.json();
        setPr(updatedPR);
        toast.success(`PR action ${action} completed successfully`);
      } else {
        const errorData = await response.json();
        toast.error(`Action failed: ${errorData.error}`);
      }
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    let variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" = "default";
    switch (status) {
      case 'APPROVED': variant = "success"; break;
      case 'REJECTED': variant = "destructive"; break;
      case 'PENDING_APPROVAL': variant = "warning"; break;
      case 'PROCESSED': variant = "success"; break;
      case 'CANCELLED': variant = "secondary"; break;
    }
    return <Badge variant={variant}>{status.replace("_", " ")}</Badge>;
  };

  const handlePrint = () => {
    const printContent = document.getElementById('pr-print-view');
    if (!printContent) return;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    const styles = Array.from(document.styleSheets)
      .map(s => s.href ? `<link rel="stylesheet" href="${s.href}">` : (s.ownerNode as HTMLStyleElement)?.outerHTML)
      .join('');

    const content = printContent.outerHTML;

    doc.open();
    doc.write(`<html><head><title>Print PR ${pr?.prNumber}</title>${styles}<style>@page { size: auto; margin: 0; } body { padding: 2rem; } #pr-print-view { display: block !important; }</style></head><body>${content}</body></html>`);
    doc.close();

    iframe.onload = function () {
      if (iframe.contentWindow) {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      }
      setTimeout(() => document.body.removeChild(iframe), 500);
    };
  };

  if (loading) return <PageLayout><LoadingSpinner /></PageLayout>;

  if (!canViewPR) {
    return (
      <PageLayout>
        <ErrorDisplay title="Forbidden" message="You do not have permission to view this payment request." />
        <div className="mt-6 text-center">
          <Link href="/pr"><Button variant="link">&larr; Back to PR List</Button></Link>
        </div>
      </PageLayout>
    );
  }

  if (!pr) {
    return (
      <PageLayout>
        <ErrorDisplay title="PR Not Found" message={`Could not find a Payment Request with the ID: ${params.id}`} />
        <div className="mt-6 text-center">
          <Link href="/pr"><Button variant="link">&larr; Back to PR List</Button></Link>
        </div>
      </PageLayout>
    );
  }

  const isReviewer = session?.user?.id === pr.reviewedById;
  const isApprover = session?.user?.id === pr.approvedById;

  return (
    <PageLayout>
      <div className="flex flex-col space-y-6 pb-20">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div>
            <div className="flex items-center gap-3">
              <BreadcrumbBackButton href="/pr" text="Back to PR List" />
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight ml-2">{pr.prNumber}</h1>
              {getStatusBadge(pr.status)}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-slate-500">
              <span className="flex items-center gap-1"><FileText className="w-4 h-4" /> {pr.title}</span>
              <span className="w-1 h-1 rounded-full bg-slate-300"></span>
              <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {new Date(pr.createdAt!).toLocaleDateString()}</span>

              {pr.po && (
                <>
                  <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                  <Link href={`/po/${pr.po.id}`} className="flex items-center gap-1 text-blue-600 hover:underline">
                    <LinkIcon className="w-3 h-3" /> PO: {pr.po.poNumber}
                  </Link>
                </>
              )}
              {pr.po?.iom && (
                <>
                  <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                  <span className="text-slate-600">Ref: {pr.po.iom.iomNumber}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" /> Print PDF
            </Button>
            <Link href={`/print/chain/${pr.id}`} target="_blank" rel="noopener noreferrer">
              <Button variant="default" className="bg-blue-600 hover:bg-blue-700">
                <LinkIcon className="w-4 h-4 mr-2" /> Full Chain Print
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left Column: Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details">PR Details</TabsTrigger>
                <TabsTrigger value="preview">Print Preview</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="mt-4 space-y-6">

                {/* Financial & General Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base text-slate-500 font-medium uppercase tracking-wide">Payment Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-xs text-slate-400 uppercase">Payment Method</p>
                        <div className="flex items-center gap-2 mt-1">
                          <CreditCard className="w-4 h-4 text-slate-600" />
                          <span className="font-medium">{pr.paymentMethod.replace("_", " ")}</span>
                        </div>
                      </div>
                      <Separator />
                      <div>
                        <p className="text-xs text-slate-400 uppercase">Purpose</p>
                        <p className="text-sm text-slate-700 mt-1">{pr.purpose || "No purpose provided."}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base text-slate-500 font-medium uppercase tracking-wide">Financial Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between items-center py-1">
                        <span className="text-slate-600">Total Amount</span>
                        <span className="font-medium text-slate-900">{formatCurrency(pr.totalAmount)}</span>
                      </div>
                      <div className="flex justify-between items-center py-1">
                        <span className="text-slate-600">Tax Amount</span>
                        <span className="text-slate-900">{formatCurrency(pr.taxAmount)}</span>
                      </div>
                      <Separator className="my-2" />
                      <div className="flex justify-between items-center py-1">
                        <span className="font-bold text-slate-900">Grand Total</span>
                        <span className="font-bold text-emerald-600 text-lg">{formatCurrency(pr.grandTotal)}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Stakeholders */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Stakeholders</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-xs text-slate-500 uppercase">Requested By</p>
                      <p className="font-medium text-slate-900 truncate">{pr.requestedBy?.name}</p>
                      <p className="text-xs text-slate-400 truncate">{pr.requestedBy?.email}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-xs text-slate-500 uppercase">Prepared By</p>
                      <p className="font-medium text-slate-900 truncate">{pr.preparedBy?.name}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-xs text-slate-500 uppercase">Reviewer</p>
                      <p className="font-medium text-slate-900 truncate">{pr.reviewedBy?.name || "Pending"}</p>
                      <div className="mt-1">{getStatusBadge(pr.reviewerStatus)}</div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-xs text-slate-500 uppercase">Approver</p>
                      <p className="font-medium text-slate-900 truncate">{pr.approvedBy?.name || "Pending"}</p>
                      <div className="mt-1">{getStatusBadge(pr.approverStatus)}</div>
                    </div>
                  </CardContent>
                </Card>

              </TabsContent>

              <TabsContent value="preview">
                <Card>
                  <CardContent className="p-0 overflow-hidden rounded-lg border border-slate-200">
                    <div className="scale-[0.8] origin-top-left w-[125%] h-auto p-4 bg-gray-50">
                      <PRPrintView pr={pr} />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column: Actions Sidebar */}
          <div className="space-y-6">
            <Card className="border-l-4 border-l-blue-600 shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">Workflow Actions</CardTitle>
                <CardDescription>Manage the lifecycle of this PR.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">

                {isReviewer && pr.reviewerStatus === 'PENDING' && (
                  <>
                    <Button onClick={() => handleAction('APPROVE')} disabled={updating} className="w-full bg-green-600 hover:bg-green-700">
                      <CheckCircle className="w-4 h-4 mr-2" /> Approve Review
                    </Button>
                    <Button onClick={() => handleAction('REJECT')} variant="destructive" disabled={updating} className="w-full">
                      <XCircle className="w-4 h-4 mr-2" /> Reject Review
                    </Button>
                  </>
                )}

                {isApprover && pr.approverStatus === 'PENDING' && (
                  <>
                    <Button onClick={() => handleAction('APPROVE')} disabled={updating} className="w-full bg-green-600 hover:bg-green-700">
                      <CheckCircle className="w-4 h-4 mr-2" /> Final Approve
                    </Button>
                    <Button onClick={() => handleAction('REJECT')} variant="destructive" disabled={updating} className="w-full">
                      <XCircle className="w-4 h-4 mr-2" /> Final Reject
                    </Button>
                  </>
                )}

                {pr.status === 'APPROVED' && canMarkAsProcessed && (
                  <Button onClick={() => handleAction('PROCESS')} disabled={updating} className="w-full bg-purple-600 hover:bg-purple-700">
                    <Banknote className="w-4 h-4 mr-2" /> Process Payment
                  </Button>
                )}

                {pr.status === 'APPROVED' && canCancel && (
                  <Button variant="outline" onClick={() => handleAction('CANCEL')} disabled={updating} className="w-full text-red-600 border-red-200 hover:bg-red-50">
                    <AlertCircle className="w-4 h-4 mr-2" /> Cancel PR
                  </Button>
                )}

                {!isReviewer && !isApprover && !canMarkAsProcessed && !canCancel && (
                  <div className="text-center py-4 text-slate-500 italic text-sm">
                    No actions available for your role.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-slate-500 uppercase">Payment Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Method</span>
                  <span className="font-medium">{pr.paymentMethod}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Status</span>
                  <Badge variant="outline">{pr.status}</Badge>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </PageLayout>
  );
}