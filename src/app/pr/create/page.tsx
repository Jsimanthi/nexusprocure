// src/app/pr/create/page.tsx
"use client";

import { BreadcrumbBackButton } from "@/components/BreadcrumbBackButton";
import LoadingSpinner from "@/components/LoadingSpinner";
import PageLayout from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { PurchaseOrder } from "@/types/po";
import { PaymentMethod } from "@/types/pr";
import {
  Banknote,
  CreditCard,
  Globe,
  Landmark,
  Receipt,
  Save,
  Send,
  Users,
  Wallet
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";

interface FormData {
  title: string;
  poId: string;
  paymentTo: string;
  paymentDate: string;
  purpose: string;
  paymentMethod: PaymentMethod;
  bankAccount: string;
  referenceNumber: string;
  totalAmount: number;
  taxAmount: number;
  grandTotal: number;
  requestedById?: string;
  reviewerId: string;
  approverId: string;
}

interface User {
  id: string;
  name: string;
}

export default function CreatePRPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [draftLoading, setDraftLoading] = useState(false);
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [selectedPo, setSelectedPo] = useState<PurchaseOrder | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string[]>>>({});
  const firstInputRef = useRef<HTMLInputElement>(null);
  const [reviewers, setReviewers] = useState<User[]>([]);
  const [approvers, setApprovers] = useState<User[]>([]);

  const [formData, setFormData] = useState<FormData>({
    title: "",
    poId: "",
    paymentTo: "",
    paymentDate: new Date().toISOString().split('T')[0],
    purpose: "",
    paymentMethod: PaymentMethod.CHEQUE,
    bankAccount: "",
    referenceNumber: "",
    totalAmount: 0,
    taxAmount: 0,
    grandTotal: 0,
    reviewerId: "",
    approverId: "",
  });

  useEffect(() => {
    fetchPOs();
    fetchUsers();
    const userId = session?.user?.id;
    if (userId) {
      setFormData(prev => ({ ...prev, requestedById: userId }));
    }
    firstInputRef.current?.focus();
  }, [session]);

  const fetchPOs = async () => {
    try {
      const response = await fetch("/api/pr/po");
      if (response.ok) {
        const data = await response.json();
        setPos(data);
      }
    } catch (error) {
      console.error("Error fetching POs:", error);
    }
  };

  const fetchUsers = async () => {
    try {
      const [reviewersRes, approversRes] = await Promise.all([
        fetch("/api/users/role/Approver"),
        fetch("/api/users/role/Manager"),
      ]);
      if (reviewersRes.ok) setReviewers(await reviewersRes.json());
      if (approversRes.ok) setApprovers(await approversRes.json());
    } catch (error) {
      console.error("Failed to fetch users:", error);
    }
  };

  const handlePoChange = (poId: string) => {
    const po = pos.find(p => p.id === poId);
    if (po) {
      setSelectedPo(po);
      setFormData(prev => ({
        ...prev,
        poId: po.id ?? "",
        title: `Payment forPO #${po.poNumber} `,
        paymentTo: po.vendorName,
        totalAmount: po.totalAmount,
        taxAmount: po.taxAmount,
        grandTotal: po.grandTotal,
        requestedById: po.requestedById,
      }));
      toast.success("Loaded PO details");
    } else {
      setSelectedPo(null);
      setFormData(prev => ({
        ...prev,
        poId: "",
        totalAmount: 0,
        taxAmount: 0,
        grandTotal: 0,
        requestedById: session?.user?.id,
      }));
    }
  };

  const handleSave = async (isDraft: boolean) => {
    if (isDraft) {
      setDraftLoading(true);
    } else {
      setLoading(true);
    }
    setErrors({});

    const requestedById = formData.requestedById || session?.user?.id;
    if (!requestedById) {
      toast.error("You must be logged in to create a Payment Request.");
      setLoading(false);
      setDraftLoading(false);
      return;
    }

    try {
      // Prepare data for API - convert empty poId to undefined
      const submitData = {
        ...formData,
        poId: formData.poId || undefined,
        requestedById,
        reviewerId: formData.reviewerId,
        approverId: formData.approverId,
        status: isDraft ? 'DRAFT' : 'PENDING_APPROVAL',
      };

      const response = await fetch("/api/pr", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      });

      if (response.ok) {
        toast.success(`Payment Request ${isDraft ? 'saved as draft' : 'submitted'} successfully!`);
        router.push("/pr");
      } else {
        const errorData = await response.json();
        if (response.status === 400 && errorData.details?.fieldErrors) {
          setErrors(errorData.details.fieldErrors);
          toast.error("Please correct the errors in the form.");
        } else {
          toast.error(`Error: ${errorData.error || "Failed to create PR"} `);
        }
      }
    } catch (error) {
      console.error("Error creating PR:", error);
      toast.error("An unexpected error occurred.");
    } finally {
      if (isDraft) {
        setDraftLoading(false);
      } else {
        setLoading(false);
      }
    }
  };

  const getPaymentIcon = (method: PaymentMethod) => {
    switch (method) {
      case PaymentMethod.BANK_TRANSFER: return <Landmark className="w-4 h-4" />;
      case PaymentMethod.CASH: return <Banknote className="w-4 h-4" />;
      case PaymentMethod.ONLINE_PAYMENT: return <Globe className="w-4 h-4" />;
      default: return <Receipt className="w-4 h-4" />;
    }
  };

  return (
    <PageLayout>
      <div className="max-w-6xl mx-auto space-y-6 pb-24">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <BreadcrumbBackButton href="/pr" text="Back to Payments" className="mb-2 w-fit" />
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Request Payment</h1>
            <p className="text-slate-500 mt-1">Initiate a payment request for approved orders or direct expenses.</p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => handleSave(true)}
              disabled={draftLoading || loading}
              className="border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              {draftLoading ? <LoadingSpinner /> : <Save className="w-4 h-4 mr-2" />}
              Save Draft
            </Button>
            <Button
              onClick={() => handleSave(false)}
              disabled={draftLoading || loading}
              className="bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-200"
            >
              {loading ? <LoadingSpinner /> : <Send className="w-4 h-4 mr-2" />}
              Submit Request
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Form Details */}
          <div className="lg:col-span-2 space-y-6">

            {/* General Information Card */}
            <Card className="border-0 shadow-sm ring-1 ring-slate-200">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-50 rounded-lg">
                    <Wallet className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Payment Details</CardTitle>
                    <CardDescription>Purpose and beneficiary information.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <Separator />
              <CardContent className="pt-6 grid gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Link Purchase Order (Optional)</Label>
                    <select
                      value={formData.poId}
                      onChange={(e) => handlePoChange(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-amber-500"
                    >
                      <option value="">-- Direct Payment --</option>
                      {pos.map((po) => (
                        <option key={po.id} value={po.id}>
                          {po.poNumber} - {po.title}
                        </option>
                      ))}
                    </select>
                    {selectedPo && (
                      <div className="text-xs text-green-600 font-medium flex items-center mt-1">
                        <span className="w-2 h-2 rounded-full bg-green-500 mr-1.5 animate-pulse"></span>
                        Linked: {selectedPo.vendorName}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>PR Title <span className="text-red-500">*</span></Label>
                    <Input
                      ref={firstInputRef}
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g. Q4 Marketing Services Payment"
                      className={errors.title ? "border-red-300 focus-visible:ring-red-500" : ""}
                    />
                    {errors.title && <p className="text-red-500 text-xs">{errors.title[0]}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Purpose/Description <span className="text-red-500">*</span></Label>
                  <Textarea
                    value={formData.purpose}
                    onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                    placeholder="Detailed explanation for this payment request..."
                    className="resize-none"
                  />
                  {errors.purpose && <p className="text-red-500 text-xs">{errors.purpose[0]}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Payment To (Beneficiary) <span className="text-red-500">*</span></Label>
                    <Input
                      value={formData.paymentTo}
                      onChange={(e) => setFormData({ ...formData, paymentTo: e.target.value })}
                      className={errors.paymentTo ? "border-red-300 focus-visible:ring-red-500" : ""}
                    />
                    {errors.paymentTo && <p className="text-red-500 text-xs">{errors.paymentTo[0]}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Requested Payment Date <span className="text-red-500">*</span></Label>
                    <Input
                      type="date"
                      value={formData.paymentDate}
                      onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                      className={errors.paymentDate ? "border-red-300 focus-visible:ring-red-500" : ""}
                    />
                    {errors.paymentDate && <p className="text-red-500 text-xs">{errors.paymentDate[0]}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Method Card */}
            <Card className="border-0 shadow-sm ring-1 ring-slate-200">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 rounded-lg">
                    <CreditCard className="w-5 h-5 text-slate-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Payment Method</CardTitle>
                    <CardDescription>How should the payment be processed?</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <Separator />
              <CardContent className="pt-6 grid gap-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label>Method</Label>
                    <select
                      value={formData.paymentMethod}
                      onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as PaymentMethod })}
                      className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-slate-500"
                    >
                      <option value={PaymentMethod.CHEQUE}>Cheque</option>
                      <option value={PaymentMethod.BANK_TRANSFER}>Bank Transfer</option>
                      <option value={PaymentMethod.CASH}>Cash</option>
                      <option value={PaymentMethod.ONLINE_PAYMENT}>Online Payment</option>
                    </select>
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <Label>
                      {formData.paymentMethod === PaymentMethod.BANK_TRANSFER ? 'Bank Account No.' :
                        formData.paymentMethod === PaymentMethod.CHEQUE ? 'Cheque Name' : 'Reference Details'}
                    </Label>
                    <Input
                      value={formData.bankAccount}
                      onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })}
                      placeholder="Optional account/reference details"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Reference Number (Invoice/Bill No.)</Label>
                  <Input
                    value={formData.referenceNumber}
                    onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                    placeholder="e.g. INV-2023-001"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Financials & Workflow */}
          <div className="space-y-6">

            {/* Amount Summary Card */}
            <Card className="border-0 shadow-sm ring-1 ring-slate-200 bg-slate-50/50">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-slate-500" />
                  <CardTitle className="text-base text-slate-700">Financial Summary</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Net Amount</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400 text-sm">₹</span>
                    <Input
                      type="number"
                      step="0.01"
                      className="pl-6 bg-white"
                      value={formData.totalAmount}
                      onChange={(e) => setFormData({ ...formData, totalAmount: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Tax Amount</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400 text-sm">₹</span>
                    <Input
                      type="number"
                      step="0.01"
                      className="pl-6 bg-white"
                      value={formData.taxAmount}
                      onChange={(e) => setFormData({ ...formData, taxAmount: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label className="text-base font-bold text-slate-900">Grand Total</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400 text-sm font-bold">₹</span>
                    <Input
                      type="number"
                      step="0.01"
                      className="pl-6 font-bold text-lg text-amber-700 border-amber-200 bg-amber-50"
                      value={formData.grandTotal}
                      onChange={(e) => setFormData({ ...formData, grandTotal: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Workflow Card */}
            <Card className="border-0 shadow-sm ring-1 ring-slate-200">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <Users className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Workflow</CardTitle>
                    <CardDescription>Assign approval chain.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <Separator />
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label>Assign Reviewer</Label>
                  <select
                    value={formData.reviewerId}
                    onChange={(e) => setFormData({ ...formData, reviewerId: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-purple-500"
                  >
                    <option value="">Select Reviewer...</option>
                    {reviewers.map((reviewer) => (
                      <option key={reviewer.id} value={reviewer.id}>{reviewer.name}</option>
                    ))}
                  </select>
                  {errors.reviewerId && <p className="text-red-500 text-xs">{errors.reviewerId[0]}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Assign Approver</Label>
                  <select
                    value={formData.approverId}
                    onChange={(e) => setFormData({ ...formData, approverId: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-purple-500"
                  >
                    <option value="">Select Approver...</option>
                    {approvers.map((approver) => (
                      <option key={approver.id} value={approver.id}>{approver.name}</option>
                    ))}
                  </select>
                  {errors.approverId && <p className="text-red-500 text-xs">{errors.approverId[0]}</p>}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}