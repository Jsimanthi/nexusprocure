"use client"

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { FileSpreadsheet, FileText, Loader2, Save, Upload } from "lucide-react";
import { useState } from 'react';
import { toast } from "react-hot-toast";

type IngestedPO = {
    vendorName: string;
    items: {
        name: string;
        quantity: number;
        unitPrice: number;
        total: number;
    }[];
    totalAmount: number;
}

type IngestedIOM = {
    iomNumber: string;
    date: string;
    from: string;
    to: string;
    subject: string;
    justification: string;
    totalAmount: number;
}

export default function ImportPage() {
    const [isUploading, setIsUploading] = useState(false)
    const [poData, setPoData] = useState<IngestedPO[] | null>(null)
    const [iomData, setIomData] = useState<IngestedIOM | null>(null)

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'excel' | 'word') => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsUploading(true)
        setPoData(null)
        setIomData(null)

        const formData = new FormData()
        formData.append('file', file)
        formData.append('type', type)

        try {
            const res = await fetch('/api/ingest', { method: 'POST', body: formData })
            const json = await res.json()

            if (!res.ok) throw new Error(json.error || "Upload failed")

            toast.success("File analyzed successfully!")

            if (type === 'excel') {
                setPoData(json.data)
            } else {
                setIomData(json.data)
            }

        } catch (error) {
            console.error(error)
            toast.error("Failed to process file")
        } finally {
            setIsUploading(false)
        }
    }

    const handlePOChange = (index: number, field: keyof IngestedPO, value: any) => {
        if (!poData) return;
        const newData = [...poData];
        newData[index] = { ...newData[index], [field]: value };
        setPoData(newData);
    }

    const handleItemChange = (poIndex: number, itemIndex: number, field: string, value: any) => {
        if (!poData) return;
        const newData = [...poData];
        const items = [...newData[poIndex].items];

        // Update the specific field
        items[itemIndex] = { ...items[itemIndex], [field]: value };

        // Auto-calculate line total if quantity or price changes
        if (field === 'quantity' || field === 'unitPrice') {
            const q = field === 'quantity' ? value : items[itemIndex].quantity;
            const p = field === 'unitPrice' ? value : items[itemIndex].unitPrice;
            items[itemIndex].total = q * p;
        }

        newData[poIndex].items = items;

        // Auto-calculate PO Total
        const newTotal = items.reduce((sum, item) => sum + (item.total || 0), 0);
        newData[poIndex].totalAmount = newTotal;

        setPoData(newData);
    }

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
            <div>
                <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
                    Data Ingestion
                </h2>
                <p className="text-muted-foreground mt-2">
                    Bulk import your existing Purchase Orders and IOMs using AI extraction.
                </p>
            </div>

            {/* Upload Section (Hidden if data is loaded to focus on preview, or kept for reset?) -> Kept for now */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* Excel Import Card */}
                <Card className="border-0 shadow-lg bg-white/80 dark:bg-black/40 backdrop-blur-xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileSpreadsheet className="h-6 w-6 text-green-600" />
                            Bulk PO Import
                        </CardTitle>
                        <CardDescription>Upload your Excel (.xlsx, .xlsm) sheet with multiple POs.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors relative">
                            <input
                                type="file"
                                accept=".xlsx, .xlsm"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                onChange={(e) => handleFileUpload(e, 'excel')}
                                disabled={isUploading}
                            />
                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                {isUploading ? <Loader2 className="h-10 w-10 animate-spin text-green-500" /> : <Upload className="h-10 w-10 text-gray-400" />}
                                <p>{isUploading ? "Analyzing Tables..." : "Drag Excel file here or click to browse"}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Word Import Card */}
                <Card className="border-0 shadow-lg bg-white/80 dark:bg-black/40 backdrop-blur-xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-6 w-6 text-blue-600" />
                            IOM Reader
                        </CardTitle>
                        <CardDescription>Upload a Word (.docx) Justification Note.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors relative">
                            <input
                                type="file"
                                accept=".docx"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                onChange={(e) => handleFileUpload(e, 'word')}
                                disabled={isUploading}
                            />
                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                {isUploading ? <Loader2 className="h-10 w-10 animate-spin text-blue-500" /> : <Upload className="h-10 w-10 text-gray-400" />}
                                <p>{isUploading ? "Reading Document..." : "Drag Word file here or click to browse"}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* PO Data Preview */}
            {poData && poData.length > 0 && (
                <Card className="animate-in slide-in-from-bottom duration-500 border-green-200 dark:border-green-900 bg-green-50/50 dark:bg-green-950/20">
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span>Parsed Purchase Orders ({poData.length})</span>
                            <Button onClick={() => toast.success("Feature coming: Save to DB!")} className="gap-2">
                                <Save className="h-4 w-4" /> Save All to Database
                            </Button>
                        </CardTitle>
                        <CardDescription>Review the extracted data before importing.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border bg-white dark:bg-black">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Vendor</TableHead>
                                        <TableHead>Line Items</TableHead>
                                        <TableHead className="text-right">Total Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {poData.map((po, i) => (
                                        <TableRow key={i}>
                                            <TableCell className="w-[200px]">
                                                <Input
                                                    value={po.vendorName}
                                                    onChange={(e) => handlePOChange(i, 'vendorName', e.target.value)}
                                                    className="h-8"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <div className="space-y-2">
                                                    {po.items.map((item, j) => (
                                                        <div key={j} className="flex items-center gap-2">
                                                            <Input
                                                                type="number"
                                                                value={item.quantity}
                                                                className="h-7 w-16 text-center"
                                                                onChange={(e) => handleItemChange(i, j, 'quantity', parseFloat(e.target.value) || 0)}
                                                            />
                                                            <span className="text-xs text-muted-foreground">x</span>
                                                            <Input
                                                                value={item.name}
                                                                className="h-7 flex-1"
                                                                onChange={(e) => handleItemChange(i, j, 'name', e.target.value)}
                                                            />
                                                            <span className="text-xs text-muted-foreground">@</span>
                                                            <div className="relative w-24">
                                                                <span className="absolute left-2 top-1.5 text-xs">₹</span>
                                                                <Input
                                                                    type="number"
                                                                    value={item.unitPrice}
                                                                    className="h-7 pl-5"
                                                                    onChange={(e) => handleItemChange(i, j, 'unitPrice', parseFloat(e.target.value) || 0)}
                                                                />
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {po.items.length === 0 && <span className="text-yellow-600 text-xs">No items detected</span>}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-bold w-[150px]">
                                                <div className="relative">
                                                    <span className="absolute left-3 top-2.5 text-xs">₹</span>
                                                    <Input
                                                        type="number"
                                                        value={po.totalAmount}
                                                        onChange={(e) => handlePOChange(i, 'totalAmount', parseFloat(e.target.value) || 0)}
                                                        className="text-right font-bold pl-6"
                                                    />
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* IOM Data Preview */}
            {iomData && (
                <Card className="animate-in slide-in-from-bottom duration-500 border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20">
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span>Parsed IOM Draft</span>
                            <Button onClick={() => toast.success("Feature coming: Create IOM!")} className="gap-2">
                                <Save className="h-4 w-4" /> Create IOM
                            </Button>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-lg border bg-white dark:bg-black">
                                <Label className="text-xs text-muted-foreground uppercase mb-1">IOM Number</Label>
                                <Input
                                    value={iomData.iomNumber}
                                    onChange={(e) => setIomData({ ...iomData, iomNumber: e.target.value })}
                                    className="font-medium"
                                />
                            </div>
                            <div className="p-4 rounded-lg border bg-white dark:bg-black">
                                <Label className="text-xs text-muted-foreground uppercase mb-1">Date</Label>
                                <Input
                                    value={iomData.date}
                                    onChange={(e) => setIomData({ ...iomData, date: e.target.value })}
                                    className="font-medium"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-lg border bg-white dark:bg-black">
                                <Label className="text-xs text-muted-foreground uppercase mb-1">From</Label>
                                <Textarea
                                    value={iomData.from}
                                    onChange={(e) => setIomData({ ...iomData, from: e.target.value })}
                                    className="font-medium text-sm min-h-[60px]"
                                />
                            </div>
                            <div className="p-4 rounded-lg border bg-white dark:bg-black">
                                <Label className="text-xs text-muted-foreground uppercase mb-1">To</Label>
                                <Textarea
                                    value={iomData.to}
                                    onChange={(e) => setIomData({ ...iomData, to: e.target.value })}
                                    className="font-medium text-sm min-h-[60px]"
                                />
                            </div>
                        </div>

                        <div className="p-4 rounded-lg border bg-white dark:bg-black">
                            <Label className="text-xs text-muted-foreground uppercase mb-1">Subject</Label>
                            <Input
                                value={iomData.subject}
                                onChange={(e) => setIomData({ ...iomData, subject: e.target.value })}
                                className="font-bold"
                            />
                        </div>

                        <div className="p-4 rounded-lg border bg-white dark:bg-black">
                            <Label className="text-xs text-muted-foreground uppercase mb-1">Total Amount (₹)</Label>
                            <Input
                                type="number"
                                value={iomData.totalAmount}
                                onChange={(e) => setIomData({ ...iomData, totalAmount: parseFloat(e.target.value) || 0 })}
                                className="font-medium text-xl text-green-600"
                            />
                        </div>

                        <div className="p-4 rounded-lg border bg-white dark:bg-black">
                            <Label className="text-xs text-muted-foreground uppercase mb-1">Justification / Body</Label>
                            <Textarea
                                value={iomData.justification}
                                onChange={(e) => setIomData({ ...iomData, justification: e.target.value })}
                                className="whitespace-pre-wrap text-sm text-muted-foreground min-h-[150px]"
                            />
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
