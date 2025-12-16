"use client";

import { CatalogGrid } from "@/components/CatalogGrid";
import LoadingSpinner from "@/components/LoadingSpinner";
import PageLayout from "@/components/PageLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CATALOG_ITEMS } from "@/lib/catalog-data";
import { createIomSchema } from "@/lib/schemas";
import { ArrowLeft, ArrowRight, ShoppingCart, Trash2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { z } from "zod";

interface IOMItem {
  itemName: string;
  description: string;
  category: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface User {
  id: string;
  name: string;
}

export default function CreateIOMPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [draftLoading, setDraftLoading] = useState(false);
  const [view, setView] = useState<"catalog" | "review">("catalog");

  const [formData, setFormData] = useState({
    title: "Request for " + new Date().toLocaleDateString(),
    from: session?.user?.name || "",
    to: "",
    subject: "",
    content: "",
    reviewerId: "",
    approverId: "",
    isUrgent: false,
  });
  const [items, setItems] = useState<IOMItem[]>([]);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [reviewers, setReviewers] = useState<User[]>([]);
  const [approvers, setApprovers] = useState<User[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const [reviewersRes, approversRes] = await Promise.all([
          fetch("/api/users/role/Approver"),
          fetch("/api/users/role/Manager"),
        ]);
        if (reviewersRes.ok) {
          const data = await reviewersRes.json();
          setReviewers(data);
        }
        if (approversRes.ok) {
          const data = await approversRes.json();
          setApprovers(data);
        }
      } catch (error) {
        console.error("Failed to fetch users:", error);
      }
    };
    fetchUsers();
  }, []);

  const handleCatalogSelect = (item: typeof CATALOG_ITEMS[0]) => {
    // Check if item already exists
    const existingIndex = items.findIndex(i => i.itemName === item.name);
    if (existingIndex > -1) {
      const newItems = [...items];
      newItems[existingIndex].quantity += 1;
      newItems[existingIndex].totalPrice = newItems[existingIndex].quantity * newItems[existingIndex].unitPrice;
      setItems(newItems);
    } else {
      setItems([
        ...items,
        {
          itemName: item.name,
          description: item.description,
          category: item.category,
          quantity: 1,
          unitPrice: item.price,
          totalPrice: item.price
        }
      ]);
    }
  };

  const addItem = () => {
    setItems([
      ...items,
      { itemName: "", description: "", category: "", quantity: 1, unitPrice: 0, totalPrice: 0 },
    ]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof IOMItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };

    if (field === "quantity" || field === "unitPrice") {
      const quantity = field === "quantity" ? Number(value) : newItems[index].quantity;
      const unitPrice = field === "unitPrice" ? Number(value) : newItems[index].unitPrice;
      newItems[index].totalPrice = quantity * unitPrice;
    }

    setItems(newItems);
  };

  const handleSave = async (isDraft: boolean) => {
    if (!session?.user?.id) {
      console.error("User session not found. Cannot create IOM.");
      return;
    }

    if (isDraft) {
      setDraftLoading(true);
    } else {
      setLoading(true);
    }
    setErrors({});

    try {
      const payload: z.infer<typeof createIomSchema> & { status?: string; isUrgent?: boolean; } = {
        title: formData.title,
        from: formData.from,
        to: formData.to,
        subject: formData.subject || `Purchase Request for ${items.length} items`,
        content: formData.content,
        isUrgent: formData.isUrgent,
        items: items.map((item) => ({
          itemName: item.itemName,
          description: item.description,
          category: item.category,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
        requestedById: session.user.id,
        reviewerId: formData.reviewerId,
        approverId: formData.approverId,
        status: isDraft ? 'DRAFT' : 'PENDING_APPROVAL',
      };

      const response = await fetch("/api/iom", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        router.push("/iom");
      } else {
        const errorData = await response.json();
        if (response.status === 400) {
          setErrors(errorData.details.fieldErrors);
          // If validation error, go back to review to show them
          setView("review");
        } else {
          console.error("Failed to create IOM:", errorData.error);
        }
      }
    } catch (error) {
      console.error("Error creating IOM:", error);
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
    <PageLayout title="Create New Request">
      <div className="flex flex-col space-y-6">
        {/* Navigation / Progress */}
        <div className="flex justify-between items-center mb-4">
          <Button variant="ghost" onClick={() => router.back()} className="text-muted-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" /> Cancel
          </Button>

          <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-lg">
            <Button
              variant={view === "catalog" ? "default" : "ghost"}
              size="sm"
              onClick={() => setView("catalog")}
              className={view === "catalog" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}
            >
              1. Shop Catalog
            </Button>
            <ArrowRight className="h-4 w-4 text-slate-300" />
            <Button
              variant={view === "review" ? "default" : "ghost"}
              size="sm"
              onClick={() => setView("review")}
              className={view === "review" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}
            >
              2. Review & Submit
            </Button>
          </div>

          <Button onClick={() => setView(view === "catalog" ? "review" : "catalog")} disabled={items.length === 0} className={view === "review" ? "invisible" : ""}>
            Review Cart ({items.length}) <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        {view === "catalog" ? (
          <div className="space-y-6 animate-in fade-in zoom-in duration-300">
            <div className="bg-indigo-600 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 opacity-10 transform translate-x-1/4 -translate-y-1/4">
                <ShoppingCart className="h-64 w-64" />
              </div>
              <div className="relative z-10">
                <h2 className="text-3xl font-bold mb-2">Internal Procurement Catalog</h2>
                <p className="text-indigo-100 max-w-xl">Browse approved items for your department. Select items to add them to your automated purchase request.</p>
              </div>
            </div>

            <h3 className="text-xl font-bold text-slate-800">Featured Categories</h3>
            <CatalogGrid onSelect={handleCatalogSelect} />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-right duration-300">
            {/* Left Col: Cart Items */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle>Request Items ({items.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {items.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      Your cart is empty. <br />
                      <Button variant="link" onClick={() => setView("catalog")} className="mt-2">Go back to catalog</Button>
                    </div>
                  ) : (
                    items.map((item, index) => (
                      <div key={index} className="flex flex-col sm:flex-row gap-4 items-start sm:items-center p-4 border rounded-lg bg-slate-50/50 hover:bg-white transition-colors">
                        <div className="flex-1 space-y-1">
                          <div className="flex justify-between">
                            <h4 className="font-semibold text-slate-800">{item.itemName || "New Item"}</h4>
                            <Button variant="ghost" size="sm" onClick={() => removeItem(index)} className="text-red-500 h-6 w-6 p-0 sm:hidden">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <p className="text-sm text-slate-500 line-clamp-1">{item.description}</p>
                          <div className="flex gap-2 mt-2">
                            <Badge variant="secondary" className="text-xs">{item.category}</Badge>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 mt-2 sm:mt-0 w-full sm:w-auto">
                          <div className="flex flex-col w-20">
                            <label className="text-[10px] text-slate-400 uppercase font-bold">Qty</label>
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateItem(index, "quantity", e.target.value)}
                              className="h-8"
                            />
                          </div>
                          <div className="flex flex-col w-24">
                            <label className="text-[10px] text-slate-400 uppercase font-bold">Price</label>
                            <Input
                              type="number"
                              min="0"
                              value={item.unitPrice}
                              onChange={(e) => updateItem(index, "unitPrice", e.target.value)}
                              className="h-8"
                            />
                          </div>
                          <div className="text-right min-w-[80px]">
                            <p className="font-bold text-slate-700">{formatCurrency(item.totalPrice)}</p>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => removeItem(index)} className="text-red-500 hidden sm:flex">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}

                  <Button onClick={addItem} variant="outline" className="w-full border-dashed">
                    <Plus className="mr-2 h-4 w-4" /> Add Custom Item manually
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Right Col: Details & Submit */}
            <div className="space-y-6">
              <Card className="border-0 shadow-lg bg-indigo-50/50 border-indigo-100">
                <CardHeader>
                  <CardTitle className="text-indigo-900">Request Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title / Project Name</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="bg-white"
                    />
                    {errors.title && <p className="text-red-500 text-xs">{errors.title[0]}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reason">Business Justification</Label>
                    <Input
                      id="reason"
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      placeholder="Why do you need this?"
                      className="bg-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Select Approver</Label>
                    <select
                      className="w-full h-10 rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      value={formData.approverId}
                      onChange={(e) => setFormData({ ...formData, approverId: e.target.value })}
                    >
                      <option value="">Select Manager...</option>
                      {approvers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                    {errors.approverId && <p className="text-red-500 text-xs">{errors.approverId[0]}</p>}
                  </div>

                  <div className="pt-4 border-t border-indigo-200">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-slate-600">Subtotal</span>
                      <span className="font-medium text-slate-800">{formatCurrency(totalAmount)}</span>
                    </div>
                    <div className="flex justify-between items-center text-lg font-bold text-indigo-700">
                      <span>Total</span>
                      <span>{formatCurrency(totalAmount)}</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-3">
                  <Button
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-lg py-6"
                    onClick={() => handleSave(false)}
                    disabled={loading || items.length === 0}
                  >
                    {loading && <LoadingSpinner />}
                    {loading ? "Ordering..." : `Place Order (${items.length})`}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleSave(true)}
                    disabled={draftLoading}
                  >
                    Save as Draft
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(amount);
}

import { Plus } from "lucide-react";
