// src/app/po/[id]/page.tsx
"use client";

import { BreadcrumbBackButton } from "@/components/BreadcrumbBackButton";
import ErrorDisplay from "@/components/ErrorDisplay";
import LoadingSpinner from "@/components/LoadingSpinner";
import PageLayout from "@/components/PageLayout";
import POPrintView from "@/components/POPrintView";
import { ThreeWayMatch } from "@/components/ThreeWayMatch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useHasPermission } from "@/hooks/useHasPermission";
import { Permission } from "@/types/auth";
import { PurchaseOrder } from "@/types/po";
import { PaymentMethod } from "@/types/pr";
import { AlertCircle, CheckCircle, Clock, FileText, Printer, ShoppingCart, Truck, XCircle } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";

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

  // Permission checks
  const canViewPO = useHasPermission(Permission.READ_PO);
  const canCancel = useHasPermission(Permission.CANCEL_PO);
  const canMarkAsOrdered = useHasPermission(Permission.ORDER_PO);
  const canMarkAsDelivered = useHasPermission(Permission.DELIVER_PO);
  const canConvertToPR = useHasPermission(Permission.CREATE_PR);

  const fetchPO = useCallback(async () => {
    try {
      const response = await fetch(`/api/po/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setPo(data);
      } else {
        toast.error("Failed to fetch PO details");
      }
    } catch (error) {
      console.error("Error fetching PO:", error);
      toast.error("Network error when fetching PO");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
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
        toast.success(`PO status updated to ${action}`);
      } else {
        const errorData = await response.json();
        toast.error(`Failed: ${errorData.error}`);
      }
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("An unexpected error occurred");
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
        toast.success("Converted to Payment Request successfully!");
        router.push(`/pr/${pr.id}`);
      } else {
        const errorData = await response.json();
        toast.error(`Conversion failed: ${errorData.error}`);
      }
    } catch (error) {
      console.error("Error converting PO to PR:", error);
      toast.error("An unexpected error occurred during conversion.");
    } finally {
      setConverting(false);
    }
  };

  const isAllowedToConvertToPR = (status: string) => {
    return ['APPROVED', 'ORDERED', 'DELIVERED'].includes(status) && canConvertToPR;
  };

  const getStatusBadge = (status: string) => {
    let variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" = "default";
    switch (status) {
      case 'APPROVED': variant = "success"; break;
      case 'REJECTED': variant = "destructive"; break;
      case 'PENDING_APPROVAL': variant = "warning"; break;
      case 'ORDERED': variant = "default"; break;
      case 'DELIVERED': variant = "success"; break;
      case 'CANCELLED': variant = "secondary"; break;
    }
    return <Badge variant={variant}>{status.replace("_", " ")}</Badge>;
  };

  const handlePrint = () => {
    const printContent = document.getElementById('po-print-view');
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
    doc.write(`<html><head><title>Print PO ${po?.poNumber}</title>${styles}<style>@page { size: auto; margin: 0; } body { padding: 2rem; } #po-print-view { display: block !important; }</style></head><body>${content}</body></html>`);
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

  if (!canViewPO) {
    return (
      <PageLayout>
        <ErrorDisplay title="Forbidden" message="You do not have permission to view this purchase order." />
        <div className="mt-6 text-center">
          <Link href="/po"><Button variant="link">&larr; Back to PO List</Button></Link>
        </div>
      </PageLayout>
    );
  }

  if (!po) {
    return (
      <PageLayout>
        <ErrorDisplay title="PO Not Found" message={`Could not find a Purchase Order with the ID: ${params.id}`} />
        <div className="mt-6 text-center">
          <Link href="/po"><Button variant="link">&larr; Back to PO List</Button></Link>
        </div>
      </PageLayout>
    );
  }

  const isReviewer = session?.user?.id === po.reviewedById;
  const isApprover = session?.user?.id === po.approvedById;

  return (
    <PageLayout>
      <div className="flex flex-col space-y-6 pb-20">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div>
            <div className="flex items-center gap-3">
              <BreadcrumbBackButton href="/po" text="Back to PO List" />
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight ml-2">{po.poNumber}</h1>
              {getStatusBadge(po.status)}
            </div>
            <div className="mt-2 flex items-center gap-4 text-sm text-slate-500">
              <span className="flex items-center gap-1"><FileText className="w-4 h-4" /> {po.title}</span>
              <span className="w-1 h-1 rounded-full bg-slate-300"></span>
              <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {new Date(po.createdAt!).toLocaleDateString()}</span>
              {po.iom && (
                <>
                  <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                  <span className="text-blue-600 font-medium">Ref: {po.iom.iomNumber}</span>
                </>
              )}
            </div>
          </div>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" /> Print PDF
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left Column: Main Content */}
          <div className="lg:col-span-2 space-y-6">

            {/* Three Way Match Visualizer */}
            <ThreeWayMatch
              poId={po.poNumber}
              poAmount={po.grandTotal}
              grnAmount={po.status === 'DELIVERED' || po.status === 'ORDERED' ? po.grandTotal : undefined}
              invoiceAmount={po.status === 'DELIVERED' ? po.grandTotal : undefined}
            />

            {/* Document Tabs */}
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details">PO Details</TabsTrigger>
                <TabsTrigger value="preview">Print Preview</TabsTrigger>
              </TabsList>
              <TabsContent value="details" className="mt-4 space-y-6">

                {/* Vendor & General Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base text-slate-500 font-medium uppercase tracking-wide">Vendor Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-lg font-semibold text-slate-900">{po.vendorName}</p>
                      <p className="text-sm text-slate-500">{po.vendorAddress || "No address provided"}</p>
                      {po.vendor && (
                        <div className="mt-2 pt-2 border-t border-slate-100">
                          <p className="text-sm text-slate-600">Contact: {po.vendor.contactInfo}</p>
                          <p className="text-sm text-slate-600">Email: {po.vendor.email}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base text-slate-500 font-medium uppercase tracking-wide">Order Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between items-center py-1">
                        <span className="text-slate-600">Subtotal</span>
                        <span className="font-medium text-slate-900">₹{po.totalAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center py-1">
                        <span className="text-slate-600">Tax ({po.taxRate}%)</span>
                        <span className="text-slate-900">₹{po.taxAmount.toFixed(2)}</span>
                      </div>
                      <Separator className="my-2" />
                      <div className="flex justify-between items-center py-1">
                        <span className="font-bold text-slate-900">Grand Total</span>
                        <span className="font-bold text-amber-600 text-lg">₹{po.grandTotal.toFixed(2)}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* People Involved */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Stakeholders</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-xs text-slate-500 uppercase">Requested By</p>
                      <p className="font-medium text-slate-900 truncate">{po.requestedBy?.name}</p>
                      <p className="text-xs text-slate-400 truncate">{po.requestedBy?.email}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-xs text-slate-500 uppercase">Prepared By</p>
                      <p className="font-medium text-slate-900 truncate">{po.preparedBy?.name}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-xs text-slate-500 uppercase">Reviewer</p>
                      <p className="font-medium text-slate-900 truncate">{po.reviewedBy?.name || "Pending"}</p>
                      <div className="mt-1">{getStatusBadge(po.reviewerStatus)}</div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-xs text-slate-500 uppercase">Approver</p>
                      <p className="font-medium text-slate-900 truncate">{po.approvedBy?.name || "Pending"}</p>
                      <div className="mt-1">{getStatusBadge(po.approverStatus)}</div>
                    </div>
                  </CardContent>
                </Card>

              </TabsContent>
              <TabsContent value="preview">
                <Card>
                  <CardContent className="p-0 overflow-hidden rounded-lg border border-slate-200">
                    <div className="scale-[0.8] origin-top-left w-[125%] h-auto p-4 bg-gray-50">
                      <POPrintView po={po} />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column: Actions Sidebar */}
          <div className="space-y-6">

            {/* Action Card */}
            <Card className="border-l-4 border-l-blue-600 shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">Workflow Actions</CardTitle>
                <CardDescription>Manage the lifecycle of this PO.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {isReviewer && po.reviewerStatus === 'PENDING' && (
                  <>
                    <Button onClick={() => handleAction('APPROVE')} disabled={updating} className="w-full bg-green-600 hover:bg-green-700">
                      <CheckCircle className="w-4 h-4 mr-2" /> Approve Review
                    </Button>
                    <Button onClick={() => handleAction('REJECT')} variant="destructive" disabled={updating} className="w-full">
                      <XCircle className="w-4 h-4 mr-2" /> Reject Review
                    </Button>
                  </>
                )}

                {isApprover && po.approverStatus === 'PENDING' && (
                  <>
                    <Button onClick={() => handleAction('APPROVE')} disabled={updating} className="w-full bg-green-600 hover:bg-green-700">
                      <CheckCircle className="w-4 h-4 mr-2" /> Final Approve
                    </Button>
                    <Button onClick={() => handleAction('REJECT')} variant="destructive" disabled={updating} className="w-full">
                      <XCircle className="w-4 h-4 mr-2" /> Final Reject
                    </Button>
                  </>
                )}

                {po.status === 'APPROVED' && canMarkAsOrdered && (
                  <Button onClick={() => handleAction('ORDER')} disabled={updating} className="w-full bg-purple-600 hover:bg-purple-700">
                    <ShoppingCart className="w-4 h-4 mr-2" /> Mark as Ordered
                  </Button>
                )}

                {po.status === 'ORDERED' && canMarkAsDelivered && (
                  <Button onClick={() => handleAction('DELIVER')} disabled={updating} className="w-full bg-teal-600 hover:bg-teal-700">
                    <Truck className="w-4 h-4 mr-2" /> Mark as Delivered
                  </Button>
                )}

                {po.status === 'APPROVED' && canCancel && (
                  <Button variant="outline" onClick={() => handleAction('CANCEL')} disabled={updating} className="w-full text-red-600 border-red-200 hover:bg-red-50">
                    <AlertCircle className="w-4 h-4 mr-2" /> Cancel PO
                  </Button>
                )}

                {!isReviewer && !isApprover && !canMarkAsOrdered && !canMarkAsDelivered && !canCancel && (
                  <div className="text-center py-4 text-slate-500 italic text-sm">
                    No actions available for your role.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment Processing Card */}
            {isAllowedToConvertToPR(po.status) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Payment Processing</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Payment Method</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                      className="w-full rounded-md border border-slate-300 p-2 text-sm"
                    >
                      {Object.values(PaymentMethod).map((method) => (
                        <option key={method} value={method}>{method.replace("_", " ")}</option>
                      ))}
                    </select>
                  </div>
                  <Button onClick={convertToPR} disabled={converting} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
                    {converting ? <LoadingSpinner /> : "Convert to Payment Request"}
                  </Button>
                </CardContent>
              </Card>
            )}

          </div>
        </div>
      </div>
    </PageLayout>
  );
}