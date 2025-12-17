"use client";

import { BreadcrumbBackButton } from "@/components/BreadcrumbBackButton";
import LoadingSpinner from "@/components/LoadingSpinner";
import PageLayout from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  FileText,
  Plus,
  Receipt,
  Save,
  Send,
  Trash2,
  Users
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

interface User {
  id: string;
  name: string;
}

interface IOMItemInput {
  itemName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export default function CreateIOMPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [draftLoading, setDraftLoading] = useState(false);

  const [reviewers, setReviewers] = useState<User[]>([]);
  const [approvers, setApprovers] = useState<User[]>([]);

  const [formData, setFormData] = useState({
    title: "",
    subject: "",
    to: "",
    from: "",
    content: "",
    isUrgent: false,
    reviewerId: "",
    approverId: "",
  });

  const [items, setItems] = useState<IOMItemInput[]>([
    { itemName: "", description: "", quantity: 1, unitPrice: 0, totalPrice: 0 }
  ]);

  const [errors, setErrors] = useState<Record<string, string[]>>({});

  useEffect(() => {
    fetchUsers();
    if (session?.user?.name) {
      setFormData(prev => ({ ...prev, from: session.user?.name || "" }));
    }
  }, [session]);

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

  const addItem = () => {
    setItems([...items, { itemName: "", description: "", quantity: 1, unitPrice: 0, totalPrice: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    } else {
      toast.error("At least one item is required");
    }
  };

  const updateItem = (index: number, field: keyof IOMItemInput, value: string | number) => {
    const newItems = [...items];
    // @ts-ignore - dynamic key assignment
    newItems[index] = { ...newItems[index], [field]: value };

    if (field === 'quantity' || field === 'unitPrice') {
      const quantity = field === 'quantity' ? Number(value) : newItems[index].quantity;
      const unitPrice = field === 'unitPrice' ? Number(value) : newItems[index].unitPrice;
      newItems[index].totalPrice = quantity * unitPrice;
    }
    setItems(newItems);
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
      const response = await fetch("/api/iom", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          items: items.map(item => ({
            itemName: item.itemName,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice
          })),
          preparedById: session.user.id,
          requestedById: session.user.id, // Assuming creator is requester for now
          status: isDraft ? 'DRAFT' : 'PENDING_APPROVAL',
        }),
      });

      if (response.ok) {
        toast.success(isDraft ? "IOM saved as draft" : "IOM submitted for approval");
        router.push("/iom");
      } else {
        const errorData = await response.json();
        if (response.status === 400 && errorData.error === 'Validation failed') {
          // If backend sends specific field errors, map them here. 
          // Currently using generic toast for simplicity as I assume generic error structure.
          toast.error("Please fill in all required fields.");
        } else {
          console.error("Failed to create IOM", errorData);
          toast.error(`Error: ${errorData.error || "Failed to create IOM"}`);
        }
      }
    } catch (error) {
      console.error("Error creating IOM:", error);
      toast.error("An unexpected error occurred");
    } finally {
      if (isDraft) {
        setDraftLoading(false);
      } else {
        setLoading(false);
      }
    }
  };

  const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);

  return (
    <PageLayout>
      <div className="max-w-7xl mx-auto space-y-6 pb-24">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <BreadcrumbBackButton href="/iom" text="Back to IOM List" className="mb-2 w-fit" />
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Create New Memo</h1>
            <p className="text-slate-500 mt-1">Draft a new Inter-Office Memo for internal requests.</p>
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
              Submit Memo
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
                    <CardDescription>Basic information about this memo.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <Separator />
              <CardContent className="pt-6 grid gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Title <span className="text-red-500">*</span></Label>
                    <Input
                      placeholder="e.g. Q4 Office Supplies"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Subject <span className="text-red-500">*</span></Label>
                    <Input
                      placeholder="e.g. Stationeries Request"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>From</Label>
                    <Input
                      value={formData.from}
                      onChange={(e) => setFormData({ ...formData, from: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>To</Label>
                    <Input
                      placeholder="e.g. Procurement Dep."
                      value={formData.to}
                      onChange={(e) => setFormData({ ...formData, to: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Memo Content / Description</Label>
                  <Textarea
                    placeholder="Enter additional details..."
                    className="h-24 resize-none"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="urgent-mode"
                    checked={formData.isUrgent}
                    onCheckedChange={(checked: boolean) => setFormData({ ...formData, isUrgent: checked })}
                  />
                  <Label htmlFor="urgent-mode">Mark as Urgent</Label>
                </div>
              </CardContent>
            </Card>

            {/* Items Card */}
            <Card className="border-0 shadow-sm ring-1 ring-slate-200">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 rounded-lg">
                    <Receipt className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Items Request</CardTitle>
                    <CardDescription>List the items you need to request.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <Separator />
              <CardContent className="pt-6">

                {/* Items Table */}
                <div className="border rounded-lg overflow-hidden bg-slate-50/50">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40%]">Item & Description</TableHead>
                        <TableHead className="w-[15%]">Qty</TableHead>
                        <TableHead className="w-[20%]">Est. Cost</TableHead>
                        <TableHead className="w-[20%]">Total</TableHead>
                        <TableHead className="w-[5%]"></TableHead>
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
                              className="h-14 text-xs resize-none"
                              value={item.description}
                              onChange={(e) => updateItem(index, 'description', e.target.value)}
                            />
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
                          </TableCell>
                          <TableCell className="align-top">
                            <div className="py-2.5 font-medium text-slate-700">
                              ₹{item.totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
                      <Plus className="w-4 h-4 mr-2" /> Add Item
                    </Button>
                  </div>
                </div>
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
                  <CardTitle className="text-base text-slate-700">Estimated Total</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <span className="text-base font-bold text-slate-800">Total Amount</span>
                  <span className="text-2xl font-bold text-indigo-600">₹{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  * Total is an estimate based on unit prices.
                </p>
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
                  <div className="relative">
                    <select
                      value={formData.reviewerId}
                      onChange={(e) => setFormData({ ...formData, reviewerId: e.target.value })}
                      className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm appearance-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
                    >
                      <option value="">Select Reviewer...</option>
                      {reviewers.map((reviewer) => (
                        <option key={reviewer.id} value={reviewer.id}>{reviewer.name}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-700">
                      <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Assign Approver</Label>
                  <div className="relative">
                    <select
                      value={formData.approverId}
                      onChange={(e) => setFormData({ ...formData, approverId: e.target.value })}
                      className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm appearance-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
                    >
                      <option value="">Select Approver...</option>
                      {approvers.map((approver) => (
                        <option key={approver.id} value={approver.id}>{approver.name}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-700">
                      <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
