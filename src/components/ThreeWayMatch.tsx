"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, FileText, Package, Receipt } from "lucide-react";

interface MatchItem {
    type: "PO" | "GRN" | "INVOICE";
    id: string;
    status: "MATCH" | "MISMATCH" | "PENDING";
    amount: number;
    date: string;
}

interface ThreeWayMatchProps {
    poId: string;
    poAmount: number;
    // In a real app, these would come from the database. 
    // For this demo, we can optionally pass them or use mock data if missing.
    grnAmount?: number;
    invoiceAmount?: number;
}

export function ThreeWayMatch({ poId, poAmount, grnAmount, invoiceAmount }: ThreeWayMatchProps) {
    // Demo Logic: If amounts are passed, check match. If not, simulate "Pending" or "Match".
    const grnStatus = grnAmount === undefined ? "PENDING" : (grnAmount === poAmount ? "MATCH" : "MISMATCH");
    const invoiceStatus = invoiceAmount === undefined ? "PENDING" : (invoiceAmount === poAmount ? "MATCH" : "MISMATCH");

    // Overall Status
    const isFullyMatched = grnStatus === "MATCH" && invoiceStatus === "MATCH";

    return (
        <Card className="border-0 shadow-md bg-gradient-to-br from-slate-50 to-white">
            <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                    <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
                        <div className="p-2 bg-indigo-100 rounded-lg">
                            <FileText className="h-5 w-5 text-indigo-600" />
                        </div>
                        3-Way Matching
                    </CardTitle>
                    <Badge variant={isFullyMatched ? "success" : "secondary"}>
                        {isFullyMatched ? "Fully Matched" : "In Progress"}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-4 relative">

                    {/* Connecting Lines (Desktop) */}
                    <div className="hidden md:block absolute top-[50%] left-0 w-full h-1 bg-slate-200 -z-10 translate-y-[-50%]" />

                    {/* PO Node */}
                    <MatchNode
                        icon={FileText}
                        title="Purchase Order"
                        id={poId}
                        amount={poAmount}
                        status="MATCH"
                        date="Oct 24, 2024"
                    />

                    {/* GRN Node */}
                    <MatchNode
                        icon={Package}
                        title="Goods Received"
                        id={grnAmount ? "GRN-2024-001" : "Pending"}
                        amount={grnAmount}
                        status={grnStatus}
                        date={grnAmount ? "Oct 26, 2024" : "-"}
                    />

                    {/* Invoice Node */}
                    <MatchNode
                        icon={Receipt}
                        title="Vendor Invoice"
                        id={invoiceAmount ? "INV-9982" : "Pending"}
                        amount={invoiceAmount}
                        status={invoiceStatus}
                        date={invoiceAmount ? "Oct 28, 2024" : "-"}
                    />

                </div>

                {/* Status Message */}
                {!isFullyMatched && (
                    <div className="mt-6 p-3 bg-yellow-50 border border-yellow-200 rounded-md flex gap-3 items-start">
                        <AlertCircle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-semibold text-yellow-800">Matching Pending or Inspection Required</p>
                            <p className="text-xs text-yellow-700">
                                {grnStatus !== "MATCH" && "Goods have not been fully received or quantity mismatch. "}
                                {invoiceStatus !== "MATCH" && "Invoice amount differs from PO amount."}
                            </p>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function MatchNode({ icon: Icon, title, id, amount, status, date }: { icon: any, title: string, id: string, amount?: number, status: string, date: string }) {
    const isPending = status === "PENDING";
    const isMismatch = status === "MISMATCH";

    return (
        <div className={`relative flex flex-col items-center p-4 bg-white rounded-xl border-2 w-full md:w-48 transition-all ${isMismatch ? "border-red-200 shadow-red-100" :
                isPending ? "border-slate-200 border-dashed" :
                    "border-green-200 shadow-green-100"
            } shadow-sm`}>
            <div className={`h-12 w-12 rounded-full flex items-center justify-center mb-3 ${isMismatch ? "bg-red-100 text-red-600" :
                    isPending ? "bg-slate-100 text-slate-400" :
                        "bg-green-100 text-green-600"
                }`}>
                <Icon className="h-6 w-6" />
            </div>

            <h4 className="font-semibold text-sm text-slate-900">{title}</h4>
            <p className="text-xs text-slate-500 mb-2">{id}</p>

            {amount !== undefined ? (
                <span className={`text-lg font-bold ${isMismatch ? "text-red-600" : "text-slate-800"}`}>
                    ${amount.toLocaleString()}
                </span>
            ) : (
                <span className="text-sm font-medium text-slate-400 italic">...</span>
            )}

            <span className="text-[10px] text-slate-400 mt-1">{date}</span>

            {/* Status indicator badge */}
            <div className={`absolute -top-3 px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wide ${isMismatch ? "bg-red-50 text-red-600 border-red-200" :
                    isPending ? "bg-slate-50 text-slate-500 border-slate-200" :
                        "bg-green-50 text-green-600 border-green-200"
                }`}>
                {status}
            </div>
        </div>
    )
}
