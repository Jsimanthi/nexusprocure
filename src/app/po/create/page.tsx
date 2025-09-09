// src/app/po/create/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import FileUpload from "@/components/FileUpload";
import type { PutBlobResult } from '@vercel/blob';
import PageLayout from "@/components/PageLayout";

interface POItem {
    itemName: string;
    description: string;
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
        quantity: number;
        unitPrice: number;
        totalPrice: number;
    }>;
}

export default function CreatePOPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [attachments, setAttachments] = useState<PutBlobResult[]>([]);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [ioms, setIoms] = useState<IOM[]>([]);
    const [selectedIom, setSelectedIom] = useState<IOM | null>(null);
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
    });
    const [items, setItems] = useState<POItem[]>([
        { itemName: "", description: "", quantity: 1, unitPrice: 0, taxRate: 18, taxAmount: 0, totalPrice: 0 }
    ]);

    useEffect(() => {
        fetchVendors();
        fetchApprovedIOMs();
    }, []);

    const fetchVendors = async () => {
        try {
            const response = await fetch("/api/vendors");
            if (response.ok) {
                const data = await response.json();
                setVendors(data);
            }
        } catch (error) {
            console.error("Error fetching vendors:", error);
        }
    };

    useEffect(() => {
        // Check for IOM ID in URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const iomId = urlParams.get('iomId');

        if (iomId) {
            // Auto-select the IOM if provided in URL
            handleIomChange(iomId);
        }
    }, []);

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
        setItems([...items, { itemName: "", description: "", quantity: 1, unitPrice: 0, taxRate: 18, taxAmount: 0, totalPrice: 0 }]);
    };

    const removeItem = (index: number) => {
        if (items.length > 1) {
            setItems(items.filter((_, i) => i !== index));
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

    const handleIomChange = (iomId: string) => {
        const iom = ioms.find(i => i.id === iomId);
        if (iom) {
            setSelectedIom(iom);
            setFormData(prev => ({
                ...prev,
                iomId: iom.id,
                title: `PO for ${iom.title}`
            }));

            // Auto-fill items from IOM
            const poItems = iom.items.map(item => ({
                itemName: item.itemName,
                description: item.description || '',
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                taxRate: formData.taxRate,
                taxAmount: (item.quantity * item.unitPrice) * (formData.taxRate / 100),
                totalPrice: (item.quantity * item.unitPrice) + ((item.quantity * item.unitPrice) * (formData.taxRate / 100))
            }));

            setItems(poItems);
        } else {
            setSelectedIom(null);
            setFormData(prev => ({ ...prev, iomId: "", title: "" }));
        }
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
        }
    };

    const handleTaxRateChange = (newTaxRate: number) => {
        setFormData(prev => ({ ...prev, taxRate: newTaxRate }));

        // Recalculate taxes for all items
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await fetch("/api/po", {
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
                        taxRate: item.taxRate,
                    })),
                    attachments: attachments.map(att => ({
                        url: att.url,
                        filename: att.pathname,
                        filetype: att.contentType,
                        size: att.size,
                    })),
                }),
            });

            if (response.ok) {
                router.push("/po");
            } else {
                const errorData = await response.json();
                console.error("Failed to create PO", errorData);
                alert(`Error: ${errorData.error}. Details: ${JSON.stringify(errorData.details)}`);
            }
        } catch (error) {
            console.error("Error creating PO:", error);
        } finally {
            setLoading(false);
        }
    };

    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const totalTax = items.reduce((sum, item) => sum + item.taxAmount, 0);
    const grandTotal = subtotal + totalTax;

    return (
    <PageLayout title="Create Purchase Order">
      <div className="mb-6">
        <Link href="/po" className="text-blue-600 hover:text-blue-800">
          &larr; Back to PO List
        </Link>
      </div>
      <form onSubmit={handleSubmit} className="bg-white shadow-sm rounded-lg p-6 space-y-6">
                    {/* IOM Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Select Approved IOM (Optional)</label>
                        <select
                            value={formData.iomId}
                            onChange={(e) => handleIomChange(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        >
                            <option value="">Select an approved IOM (optional)</option>
                            {ioms.map((iom) => (
                                <option key={iom.id} value={iom.id}>
                                    {iom.iomNumber} - {iom.title} (₹{iom.totalAmount.toFixed(2)})
                                </option>
                            ))}
                        </select>
                        {selectedIom && (
                            <p className="mt-2 text-sm text-green-600">
                                Selected IOM: {selectedIom.iomNumber} - {selectedIom.items.length} items loaded
                            </p>
                        )}
                    </div>

                    {/* Basic PO Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">PO Title *</label>
                            <input
                                type="text"
                                required
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                placeholder="e.g., Laptops for Development Team"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Tax Rate (%) *</label>
                            <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="100"
                                required
                                value={formData.taxRate}
                                onChange={(e) => handleTaxRateChange(Number(e.target.value))}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    {/* Vendor Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Select Vendor</label>
                        <select
                            value={formData.vendorId}
                            onChange={(e) => handleVendorChange(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        >
                            <option value="">Select a vendor</option>
                            {vendors.map((vendor) => (
                                <option key={vendor.id} value={vendor.id}>
                                    {vendor.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Company Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Company Details</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Company Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.companyName}
                                        onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Company Address *</label>
                                    <textarea
                                        rows={3}
                                        required
                                        value={formData.companyAddress}
                                        onChange={(e) => setFormData({ ...formData, companyAddress: e.target.value })}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Contact Info *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.companyContact}
                                        onChange={(e) => setFormData({ ...formData, companyContact: e.target.value })}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Vendor Details</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Vendor Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.vendorName}
                                        onChange={(e) => setFormData({ ...formData, vendorName: e.target.value })}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Vendor Address *</label>
                                    <textarea
                                        rows={3}
                                        required
                                        value={formData.vendorAddress}
                                        onChange={(e) => setFormData({ ...formData, vendorAddress: e.target.value })}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Contact Info *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.vendorContact}
                                        onChange={(e) => setFormData({ ...formData, vendorContact: e.target.value })}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Items Section */}
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-medium text-gray-900">
                                Items {selectedIom && `(From IOM: ${selectedIom.iomNumber})`}
                            </h3>
                            <button
                                type="button"
                                onClick={addItem}
                                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md text-sm"
                            >
                                Add Item
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

                                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Item Name *</label>
                                        <input
                                            type="text"
                                            required
                                            value={item.itemName}
                                            onChange={(e) => updateItem(index, 'itemName', e.target.value)}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Description</label>
                                        <input
                                            type="text"
                                            value={item.description}
                                            onChange={(e) => updateItem(index, 'description', e.target.value)}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Qty</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={item.quantity}
                                            onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Unit Price (₹)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={item.unitPrice}
                                            onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Tax Rate (%)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            min="0"
                                            max="100"
                                            value={item.taxRate}
                                            onChange={(e) => updateItem(index, 'taxRate', parseFloat(e.target.value) || 0)}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>
                                <div className="mt-2 text-right">
                                    <span className="text-sm font-medium">
                                        Total: ₹{item.totalPrice.toFixed(2)} (Tax: ₹{item.taxAmount.toFixed(2)})
                                    </span>
                                </div>
                            </div>
                        ))}

                        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <span className="text-sm font-medium">Subtotal:</span>
                                    <span className="text-sm ml-2">₹{subtotal.toFixed(2)}</span>
                                </div>
                                <div>
                                    <span className="text-sm font-medium">Total Tax:</span>
                                    <span className="text-sm ml-2">₹{totalTax.toFixed(2)}</span>
                                </div>
                                <div>
                                    <span className="text-lg font-semibold">Grand Total:</span>
                                    <span className="text-lg font-bold ml-2">₹{grandTotal.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Attachments Section */}
                    <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Attachments</h3>
                        <FileUpload onUploadComplete={setAttachments} />
                    </div>

                    <div className="flex justify-end space-x-4">
                        <Link
                            href="/po"
                            className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-md"
                        >
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2 rounded-md"
                        >
                            {loading ? "Creating..." : "Create PO"}
                        </button>
                    </div>
                </form>
    </PageLayout>
    );
}