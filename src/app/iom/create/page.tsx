// src/app/iom/create/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PageLayout from "@/components/PageLayout";
import { useSession } from "next-auth/react";
import { z } from "zod";
import { createIomSchema } from "@/lib/schemas";
import LoadingSpinner from "@/components/LoadingSpinner";

interface IOMItem {
  itemName: string;
  description: string;
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
  const [formData, setFormData] = useState({
    title: "",
    from: "",
    to: "",
    subject: "",
    content: "",
    reviewerId: "",
    approverId: "",
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

  const addItem = () => {
    setItems([
      ...items,
      { itemName: "", description: "", quantity: 1, unitPrice: 0, totalPrice: 0 },
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
      const payload: z.infer<typeof createIomSchema> & { status?: string } = {
        title: formData.title,
        from: formData.from,
        to: formData.to,
        subject: formData.subject,
        content: formData.content,
        items: items.map((item) => ({
          itemName: item.itemName,
          description: item.description,
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
    <PageLayout title="Create New IOM">
      <div className="mb-6">
        <Link href="/iom" className="text-blue-600 hover:text-blue-800">
          &larr; Back to IOM List
        </Link>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); handleSave(false); }} className="bg-white shadow-sm rounded-lg p-6 space-y-6">
        {/* Basic IOM Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Title *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              autoFocus
            />
            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title[0]}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Subject *</label>
            <input
              type="text"
              required
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
            {errors.subject && <p className="text-red-500 text-xs mt-1">{errors.subject[0]}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">From *</label>
            <input
              type="text"
              required
              value={formData.from}
              onChange={(e) => setFormData({ ...formData, from: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
            {errors.from && <p className="text-red-500 text-xs mt-1">{errors.from[0]}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">To *</label>
            <input
              type="text"
              required
              value={formData.to}
              onChange={(e) => setFormData({ ...formData, to: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
            {errors.to && <p className="text-red-500 text-xs mt-1">{errors.to[0]}</p>}
          </div>
        </div>

        {/* Approval Workflow Section */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Approval Workflow</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Reviewer</label>
              <select
                value={formData.reviewerId}
                onChange={(e) => setFormData({ ...formData, reviewerId: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">Select a reviewer</option>
                {reviewers.map((reviewer) => (
                  <option key={reviewer.id} value={reviewer.id}>
                    {reviewer.name}
                  </option>
                ))}
              </select>
              {errors.reviewerId && <p className="text-red-500 text-xs mt-1">{errors.reviewerId[0]}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Approver (Manager)</label>
              <select
                value={formData.approverId}
                onChange={(e) => setFormData({ ...formData, approverId: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">Select an approver</option>
                {approvers.map((approver) => (
                  <option key={approver.id} value={approver.id}>
                    {approver.name}
                  </option>
                ))}
              </select>
              {errors.approverId && <p className="text-red-500 text-xs mt-1">{errors.approverId[0]}</p>}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Content</label>
          <textarea
            rows={3}
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        {/* Items Section */}
        <div className="border-t pt-6">
          {items.length === 0 ? (
            <button
              type="button"
              onClick={addItem}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 border-2 border-dashed border-gray-300 px-4 py-3 rounded-md text-sm font-medium"
            >
              + Add Item Section (for purchases)
            </button>
          ) : (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Items</h3>
                <button
                  type="button"
                  onClick={addItem}
                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md text-sm"
                >
                  Add Another Item
                </button>
              </div>

              {items.map((item, index) => (
                <div key={index} className="border rounded-lg p-4 mb-4 relative">
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="absolute top-2 right-2 text-red-600 hover:text-red-800"
                  >
                    ×
                  </button>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Item Name</label>
                      <input
                        type="text"
                        value={item.itemName}
                        onChange={(e) => updateItem(index, "itemName", e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Description</label>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateItem(index, "description", e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Quantity</label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, "quantity", parseInt(e.target.value) || 1)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Unit Price (₹)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.unitPrice}
                        onChange={(e) =>
                          updateItem(index, "unitPrice", parseFloat(e.target.value) || 0)
                        }
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="mt-2 text-right">
                    <span className="text-sm font-medium">Total: ₹{item.totalPrice.toFixed(2)}</span>
                  </div>
                </div>
              ))}

              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Grand Total:</span>
                  <span className="text-xl font-bold">₹{totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-4">
          <Link
            href="/iom"
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md"
          >
            Cancel
          </Link>
          <button
            type="button"
            onClick={() => handleSave(true)}
            disabled={draftLoading || loading}
            className="bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white px-6 py-2 rounded-md flex items-center justify-center"
          >
            {draftLoading && <LoadingSpinner />}
            {draftLoading ? "Saving..." : "Save as Draft"}
          </button>
          <button
            type="submit"
            disabled={draftLoading || loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2 rounded-md flex items-center justify-center"
          >
            {loading && <LoadingSpinner />}
            {loading ? "Submitting..." : "Submit for Approval"}
          </button>
        </div>
      </form>
    </PageLayout>
  );
}