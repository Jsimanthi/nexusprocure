// src/app/po/create/page.tsx

"use client";

import { BreadcrumbBackButton } from "@/components/BreadcrumbBackButton";
import FileUpload, { UploadedFileResult } from "@/components/FileUpload";
import LoadingSpinner from "@/components/LoadingSpinner";
import PageLayout from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { PROCUREMENT_CATEGORIES } from "@/lib/constants";
import {
  Building2,
  FileText,
  Plus,
  Receipt,
  Save,
  Send,
  ShoppingCart,
  Trash2,
  Upload,
  Users
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

interface User {
  id: string;
  name: string;
}

interface POItem {
  itemName: string;
  description: string;
  category: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  taxAmount: number;
  totalPrice: number;
}

interface Vendor {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  contactInfo: string;
}

interface IOM {
  id: string;
  iomNumber: string;
  title: string;
  status: string;
  totalAmount: number;
  items: Array<{
    itemName: string;
    description: string;
    category?: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
}

export default function CreatePOPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [draftLoading, setDraftLoading] = useState(false);
  const [attachments, setAttachments] = useState<UploadedFileResult[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [ioms, setIoms] = useState<IOM[]>([]);
  const [selectedIom, setSelectedIom] = useState<IOM | null>(null);
  const [reviewers, setReviewers] = useState<User[]>([]);
  const [approvers, setApprovers] = useState<User[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    iomId: "",
    vendorId: "",
    companyName: "Your Company Name",
    companyAddress: "Your Company Address",
    companyContact: "Your Contact Info",
    vendorName: "",
    vendorAddress: "",
    vendorContact: "",
    taxRate: 18,
    reviewerId: "",
    approverId: "",
  });
  const [items, setItems] = useState<POItem[]>([
    { itemName: "", description: "", category: "", quantity: 1, unitPrice: 0, taxRate: 18, taxAmount: 0, totalPrice: 0 }
  ]);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const handleIomChange = useCallback((iomId: string) => {
    const iom = ioms.find(i => i.id === iomId);
    if (iom) {
      setSelectedIom(iom);
      setFormData(prev => ({
        ...prev,
        iomId: iom.id,
        title: `PO for ${iom.title}`
      }));

      const poItems = iom.items.map(item => ({
        itemName: item.itemName,
        description: item.description || '',
        category: item.category || '',
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRate: formData.taxRate,
        taxAmount: (item.quantity * item.unitPrice) * (formData.taxRate / 100),
        totalPrice: (item.quantity * item.unitPrice) + ((item.quantity * item.unitPrice) * (formData.taxRate / 100))
      }));
      setItems(poItems);
      toast.success(`Loaded items from ${iom.iomNumber}`);
    } else {
      setSelectedIom(null);
      setFormData(prev => ({ ...prev, iomId: "", title: "" }));
    }
  }, [ioms, formData.taxRate]);

  useEffect(() => {
    fetchVendors();
    fetchApprovedIOMs();
    fetchUsers();
  }, []);

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

  const fetchVendors = async () => {
    try {
      const response = await fetch("/api/vendors");
      if (response.ok) {
        const data = await response.json();
        setVendors(data.data);
      }
    } catch (error) {
      console.error("Error fetching vendors:", error);
    }
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const iomId = urlParams.get('iomId');
    if (iomId && ioms.length > 0) {
      handleIomChange(iomId);
    }
  }, [ioms, handleIomChange]); // Added ioms dependency to ensure it runs after loading

  const fetchApprovedIOMs = async () => {
    try {
      const response = await fetch("/api/po/iom");
      if (response.ok) {
        const data = await response.json();
        setIoms(data);
      }
    } catch (error) {
      console.error("Error fetching IOMs:", error);
    }
  };

  const addItem = () => {
    setItems([...items, { itemName: "", description: "", category: "", quantity: 1, unitPrice: 0, taxRate: 18, taxAmount: 0, totalPrice: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    } else {
      toast.error("At least one item is required");
    }
  };

  const updateItem = (index: number, field: keyof POItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };

    if (field === 'quantity' || field === 'unitPrice' || field === 'taxRate') {
      const quantity = field === 'quantity' ? Number(value) : newItems[index].quantity;
      const unitPrice = field === 'unitPrice' ? Number(value) : newItems[index].unitPrice;
      const taxRate = field === 'taxRate' ? Number(value) : newItems[index].taxRate;
      const itemTotal = quantity * unitPrice;
      const taxAmount = itemTotal * (taxRate / 100);
      const totalPrice = itemTotal + taxAmount;
      newItems[index].taxAmount = taxAmount;
      newItems[index].totalPrice = totalPrice;
    }
    setItems(newItems);
  };

  const handleVendorChange = (vendorId: string) => {
    const vendor = vendors.find(v => v.id === vendorId);
    if (vendor) {
      setFormData(prev => ({
        ...prev,
        vendorId: vendor.id,
        vendorName: vendor.name,
        vendorAddress: vendor.address,
        vendorContact: vendor.contactInfo
      }));
      toast.success(`Selected vendor: ${vendor.name}`);
    }
  };

  const handleTaxRateChange = (newTaxRate: number) => {
    setFormData(prev => ({ ...prev, taxRate: newTaxRate }));
    const updatedItems = items.map(item => {
      const itemTotal = item.quantity * item.unitPrice;
      const taxAmount = itemTotal * (newTaxRate / 100);
      const totalPrice = itemTotal + taxAmount;
      return {
        ...item,
        taxRate: newTaxRate,
        taxAmount,
        totalPrice
      };
    });
    setItems(updatedItems);
  };

  const handleSave = async (isDraft: boolean) => {
    if (!session?.user?.id) {
      toast.error("User session not found. Please log in.");
      return;
    }

    if (isDraft) {
      setDraftLoading(true);
    } else {
      setLoading(true);
    }
    setErrors({});

    try {
      const response = await fetch("/api/po", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          iomId: formData.iomId || undefined,
          items: items.map(item => ({
            itemName: item.itemName,
            description: item.description,
            category: item.category,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            taxRate: item.taxRate,
          })),
          attachments: attachments.map(att => ({
            url: att.url,
            filename: att.pathname,
            filetype: att.contentType,
            size: att.size,
          })),
          requestedById: session.user.id,
          reviewerId: formData.reviewerId,
          approverId: formData.approverId,
          status: isDraft ? 'DRAFT' : 'PENDING_APPROVAL',
        }),
      });
      if (response.ok) {
        toast.success(isDraft ? "PO saved as draft" : "PO submitted for approval");
        router.push("/po");
      } else {
        const errorData = await response.json();
        if (response.status === 400) {
          setErrors(errorData.details.fieldErrors);
          toast.error("Please fix the validation errors");
        } else {
          console.error("Failed to create PO", errorData);
          toast.error(`Error: ${errorData.error}`);
        }
      }
    } catch (error) {
      console.error("Error creating PO:", error);
      toast.error("An unexpected error occurred");
    } finally {
      if (isDraft) {
        setDraftLoading(false);
      } else {
        setLoading(false);
      }
    }
  };

  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const totalTax = items.reduce((sum, item) => sum + item.taxAmount, 0);
  const grandTotal = subtotal + totalTax;

  return (
    <PageLayout>
      <div className="max-w-7xl mx-auto space-y-6 pb-24">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <BreadcrumbBackButton href="/po" text="Back to P.O. List" className="mb-2 w-fit" />
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Create New Order</h1>
            <p className="text-slate-500 mt-1">Draft a new purchase order for supplier procurement.</p>
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
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-200"
            >
              {loading ? <LoadingSpinner /> : <Send className="w-4 h-4 mr-2" />}
              Submit Order
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
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">General Details</CardTitle>
                    <CardDescription>Basic information about this order.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <Separator />
              <CardContent className="pt-6 grid gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Source IOM Document</Label>
                    <div className="relative">
                      <select
                        value={formData.iomId}
                        onChange={(e) => handleIomChange(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="">-- Direct PO (No IOM) --</option>
                        {ioms.map((iom) => (
                          <option key={iom.id} value={iom.id}>
                            {iom.iomNumber} - {iom.title}
                          </option>
                        ))}
                      </select>
                    </div>
                    {selectedIom && (
                      <div className="text-xs text-green-600 font-medium flex items-center mt-1">
                        <span className="w-2 h-2 rounded-full bg-green-500 mr-1.5 animate-pulse"></span>
                        Linked to {selectedIom.iomNumber} (₹{selectedIom.totalAmount.toLocaleString()})
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Purchase Order Title <span className="text-red-500">*</span></Label>
                    <Input
                      placeholder="e.g. IT Equipment Q4 Upgrade"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className={errors.title ? "border-red-300 focus-visible:ring-red-500" : ""}
                    />
                    {errors.title && <p className="text-red-500 text-xs">{errors.title[0]}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Vendor & Items Card */}
            <Card className="border-0 shadow-sm ring-1 ring-slate-200">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 rounded-lg">
                    <ShoppingCart className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Items & Vendor</CardTitle>
                    <CardDescription>Select supplier and list items to procure.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <Separator />
              <CardContent className="pt-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Select Vendor</Label>
                    <select
                      value={formData.vendorId}
                      onChange={(e) => handleVendorChange(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                    >
                      <option value="">Select a vendor...</option>
                      {vendors.map((vendor) => (
                        <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Global Tax Rate (%)</Label>
                    <Input
                      type="number"
                      value={formData.taxRate}
                      onChange={(e) => handleTaxRateChange(Number(e.target.value))}
                      max={100}
                      min={0}
                    />
                  </div>
                </div>

                {/* Items Table */}
                <div className="border rounded-lg overflow-hidden bg-slate-50/50">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[30%]">Item Details</TableHead>
                        <TableHead className="w-[20%]">Category</TableHead>
                        <TableHead className="w-[15%]">Qty</TableHead>
                        <TableHead className="w-[20%]">Price/Unit</TableHead>
                        <TableHead className="w-[10%]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item, index) => (
                        <TableRow key={index} className="group bg-white">
                          <TableCell className="align-top">
                            <Input
                              placeholder="Item Name"
                              className="mb-2 font-medium"
                              value={item.itemName}
                              onChange={(e) => updateItem(index, 'itemName', e.target.value)}
                            />
                            <Textarea
                              placeholder="Description"
                              className="h-16 text-xs resize-none"
                              value={item.description}
                              onChange={(e) => updateItem(index, 'description', e.target.value)}
                            />
                          </TableCell>
                          <TableCell className="align-top">
                            <select
                              value={item.category}
                              onChange={(e) => updateItem(index, "category", e.target.value)}
                              className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-blue-500"
                            >
                              <option value="">Select...</option>
                              {PROCUREMENT_CATEGORIES.map((cat) => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </select>
                            <div className="mt-2 text-xs text-slate-500">
                              Tax: {item.taxRate}%
                            </div>
                          </TableCell>
                          <TableCell className="align-top">
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                            />
                          </TableCell>
                          <TableCell className="align-top">
                            <div className="relative">
                              <span className="absolute left-3 top-2.5 text-slate-400 text-sm">₹</span>
                              <Input
                                type="number"
                                className="pl-6"
                                min="0"
                                step="0.01"
                                value={item.unitPrice}
                                onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                              />
                            </div>
                            <div className="mt-2 text-right font-medium text-slate-700">
                              ₹{item.totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                          </TableCell>
                          <TableCell className="align-top text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeItem(index)}
                              className="text-slate-400 hover:text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="p-3 bg-slate-100 border-t flex justify-center">
                    <Button variant="outline" size="sm" onClick={addItem} className="bg-white hover:bg-slate-50 text-slate-700">
                      <Plus className="w-4 h-4 mr-2" /> Add Next Item
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Attachments Card */}
            <Card className="border-0 shadow-sm ring-1 ring-slate-200">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-50 rounded-lg">
                    <Upload className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Attachments</CardTitle>
                    <CardDescription>Upload supporting documents (PDF, Images).</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <Separator />
              <CardContent className="pt-6">
                <FileUpload onUploadComplete={setAttachments} />
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Workflow & Summary */}
          <div className="space-y-6">

            {/* Order Summary Card */}
            <Card className="border-0 shadow-sm ring-1 ring-slate-200 bg-slate-50/50">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-slate-500" />
                  <CardTitle className="text-base text-slate-700">Order Summary</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="font-medium text-slate-900">₹{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Total Tax ({formData.taxRate}%)</span>
                  <span className="font-medium text-slate-900">₹{totalTax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between items-center">
                  <span className="text-base font-bold text-slate-800">Grand Total</span>
                  <span className="text-xl font-bold text-indigo-600">₹{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
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

            {/* Company & Vendor Details (Read Only / Auto Filled) */}
            <Card className="border-0 shadow-sm ring-1 ring-slate-200">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 rounded-lg">
                    <Building2 className="w-5 h-5 text-slate-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Entity Details</CardTitle>
                    <CardDescription>Billing and shipping info.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <Separator />
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500 uppercase tracking-wider">Bill To (Us)</Label>
                  <Input value={formData.companyName} onChange={(e) => setFormData({ ...formData, companyName: e.target.value })} className="bg-slate-50" />
                  <Input value={formData.companyAddress} onChange={(e) => setFormData({ ...formData, companyAddress: e.target.value })} className="bg-slate-50 mt-2" />
                </div>
                <Separator />
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500 uppercase tracking-wider">Ship To (Vendor)</Label>
                  <Input value={formData.vendorName} readOnly placeholder="Vendor Name" className="bg-slate-50 text-slate-500" />
                  <Textarea value={formData.vendorAddress} readOnly placeholder="Vendor Address" className="bg-slate-50 text-slate-500 mt-2 resize-none h-20" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}