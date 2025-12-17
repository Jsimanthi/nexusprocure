// src/app/iom/[id]/page.tsx
"use client";

import { BreadcrumbBackButton } from "@/components/BreadcrumbBackButton";
import ErrorDisplay from "@/components/ErrorDisplay";
import IOMPrintView from "@/components/IOMPrintView";
import LoadingSpinner from "@/components/LoadingSpinner";
import PageLayout from "@/components/PageLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useHasPermission } from "@/hooks/useHasPermission";
import { Permission } from "@/types/auth";
import { IOM } from "@/types/iom";
import { Calendar, CheckCircle, FileInput, FileText, Printer, XCircle } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";

export default function IOMDetailPage() {
  const params = useParams();
  const { data: session } = useSession();
  const [iom, setIom] = useState<IOM | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const canCreatePO = useHasPermission(Permission.CREATE_PO);
  // Add permission check to view IOM
  const canViewIOM = useHasPermission(Permission.READ_IOM);

  const fetchIOM = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/iom/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setIom(data);
      } else {
        toast.error("Failed to fetch IOM details");
      }
    } catch (error) {
      console.error("Error fetching IOM:", error);
      toast.error("Network error when fetching IOM");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    if (!canViewIOM) {
      setLoading(false);
      return;
    }
    if (params.id) {
      fetchIOM();
    }
  }, [params.id, canViewIOM, fetchIOM]);

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
        toast.success(`IOM status updated to ${action}`);
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

  const getStatusBadge = (status: string) => {
    let variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" = "default";
    switch (status) {
      case 'APPROVED': variant = "success"; break;
      case 'REJECTED': variant = "destructive"; break;
      case 'PENDING_APPROVAL': variant = "warning"; break;
      case 'SUBMITTED': variant = "default"; break;
      case 'DRAFT': variant = "secondary"; break;
    }
    return <Badge variant={variant}>{status.replace("_", " ")}</Badge>;
  };

  const handlePrint = () => {
    const printContent = document.getElementById('iom-print-view');
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
    doc.write(`<html><head><title>Print IOM ${iom?.iomNumber}</title>${styles}<style>@page { size: auto; margin: 0; } body { padding: 2rem; } #iom-print-view { display: block !important; }</style></head><body>${content}</body></html>`);
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

  if (!canViewIOM) {
    return (
      <PageLayout>
        <ErrorDisplay title="Forbidden" message="You do not have permission to view this IOM." />
        <div className="mt-6 text-center">
          <Link href="/iom"><Button variant="link">&larr; Back to IOM List</Button></Link>
        </div>
      </PageLayout>
    );
  }

  if (!iom) {
    return (
      <PageLayout>
        <ErrorDisplay title="IOM Not Found" message={`Could not find an IOM with the ID: ${params.id}`} />
        <div className="mt-6 text-center">
          <Link href="/iom"><Button variant="link">&larr; Back to IOM List</Button></Link>
        </div>
      </PageLayout>
    );
  }

  const isReviewer = session?.user?.id === iom.reviewedById;
  const isApprover = session?.user?.id === iom.approvedById;

  return (
    <PageLayout>
      <div className="flex flex-col space-y-6 pb-20">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div>
            <div className="flex items-center gap-3">
              <BreadcrumbBackButton href="/iom" text="Back to IOM List" />
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight ml-2">{iom.iomNumber}</h1>
              {getStatusBadge(iom.status)}
            </div>
            <div className="mt-2 flex items-center gap-4 text-sm text-slate-500">
              <span className="flex items-center gap-1"><FileText className="w-4 h-4" /> {iom.title}</span>
              <span className="w-1 h-1 rounded-full bg-slate-300"></span>
              <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {new Date(iom.createdAt!).toLocaleDateString()}</span>
            </div>
          </div>

          <Button variant="outline" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" /> Print PDF
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left Column: Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details">IOM Details</TabsTrigger>
                <TabsTrigger value="preview">Print Preview</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="mt-4 space-y-6">

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base text-slate-500 font-medium uppercase tracking-wide">Category & Description</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-slate-50 rounded-lg">
                        <span className="text-xs text-slate-500 uppercase">Subject</span>
                        <p className="font-medium text-slate-900 mt-1">{iom.subject}</p>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-lg">
                        <span className="text-xs text-slate-500 uppercase">Items Count</span>
                        <p className="font-medium text-slate-900 mt-1">{iom.items.length}</p>
                      </div>
                    </div>
                    <Separator />
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 italic text-slate-600 text-sm">
                      {/* Using title as description if no description field exists yet, otherwise add description field to IOM type */}
                      "{iom.title}"
                    </div>
                  </CardContent>
                </Card>

                {/* Stakeholders */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Stakeholders</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-xs text-slate-500 uppercase">Requested By</p>
                      <p className="font-medium text-slate-900 truncate">{iom.requestedBy?.name}</p>
                      <p className="text-xs text-slate-400 truncate">{iom.requestedBy?.email}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-xs text-slate-500 uppercase">Prepared By</p>
                      <p className="font-medium text-slate-900 truncate">{iom.preparedBy?.name}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-xs text-slate-500 uppercase">Reviewer</p>
                      <p className="font-medium text-slate-900 truncate">{iom.reviewedBy?.name || "Pending"}</p>
                      <div className="mt-1">{getStatusBadge(iom.reviewerStatus)}</div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-xs text-slate-500 uppercase">Approver</p>
                      <p className="font-medium text-slate-900 truncate">{iom.approvedBy?.name || "Pending"}</p>
                      <div className="mt-1">{getStatusBadge(iom.approverStatus)}</div>
                    </div>
                  </CardContent>
                </Card>

              </TabsContent>

              <TabsContent value="preview">
                <Card>
                  <CardContent className="p-0 overflow-hidden rounded-lg border border-slate-200">
                    <div className="scale-[0.8] origin-top-left w-[125%] h-auto p-4 bg-gray-50">
                      <IOMPrintView iom={iom} />
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
                <CardDescription>Manage the lifecycle of this IOM.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">

                {isReviewer && iom.reviewerStatus === 'PENDING' && (
                  <>
                    <Button onClick={() => handleAction('APPROVE')} disabled={updating} className="w-full bg-green-600 hover:bg-green-700">
                      <CheckCircle className="w-4 h-4 mr-2" /> Approve Review
                    </Button>
                    <Button onClick={() => handleAction('REJECT')} variant="destructive" disabled={updating} className="w-full">
                      <XCircle className="w-4 h-4 mr-2" /> Reject Review
                    </Button>
                  </>
                )}

                {isApprover && iom.approverStatus === 'PENDING' && (
                  <>
                    <Button onClick={() => handleAction('APPROVE')} disabled={updating} className="w-full bg-green-600 hover:bg-green-700">
                      <CheckCircle className="w-4 h-4 mr-2" /> Final Approve
                    </Button>
                    <Button onClick={() => handleAction('REJECT')} variant="destructive" disabled={updating} className="w-full">
                      <XCircle className="w-4 h-4 mr-2" /> Final Reject
                    </Button>
                  </>
                )}

                {iom.status === "APPROVED" && canCreatePO && (
                  <Link href={`/po/create?iomId=${iom.id}`} className="w-full">
                    <Button className="w-full bg-purple-600 hover:bg-purple-700">
                      <FileInput className="w-4 h-4 mr-2" /> Convert to PO
                    </Button>
                  </Link>
                )}

                {iom.status !== 'DRAFT' && !isReviewer && !isApprover && iom.status !== 'APPROVED' && (
                  <div className="text-center py-4 text-slate-500 italic text-sm">
                    No actions available for your role.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-slate-500 uppercase">IOM Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Subject</span>
                  <span className="font-medium">{iom.subject}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Total Items</span>
                  <span className="font-medium">{iom.items.length}</span>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </PageLayout>
  );
}