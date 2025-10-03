"use client";

import { Prisma } from "@prisma/client";
import { formatCurrency } from "@/lib/utils";
import { useEffect, useState } from "react";
import { QRCodeSVG } from 'qrcode.react';

interface POPrintViewProps {
  po: POPrintData;
}

// Define a type for the setting object we expect from the API
interface Setting {
  key: string;
  value: string;
}

// Create a detailed type for the PO object, including all its relations,
// using Prisma's generated types for a single source of truth.
const poWithRelations = Prisma.validator<Prisma.PurchaseOrderDefaultArgs>()({
  include: {
    items: true,
    preparedBy: { select: { name: true, email: true } },
    reviewedBy: { select: { name: true, email: true } },
    approvedBy: { select: { name: true, email: true } },
    iom: {
      select: {
        iomNumber: true,
      },
    },
  },
});

type POPrintData = Prisma.PurchaseOrderGetPayload<typeof poWithRelations>;

export default function POPrintView({ po }: POPrintViewProps) {
  const [headerText, setHeaderText] = useState("");
  const [loadingHeader, setLoadingHeader] = useState(true);

  useEffect(() => {
    const fetchHeaderSetting = async () => {
      try {
        const response = await fetch('/api/settings/iomHeaderText');
        if (response.ok) {
          const setting: Setting = await response.json();
          setHeaderText(setting.value);
        } else {
          setHeaderText("Sri Bhagyalakshmi Enterprises\nDefault Header");
        }
      } catch (error) {
        console.error("Failed to fetch header setting:", error);
        setHeaderText("Sri Bhagyalakshmi Enterprises\nError Loading Header");
      } finally {
        setLoadingHeader(false);
      }
    };

    fetchHeaderSetting();
  }, []);

  return (
    <div className="bg-white shadow-lg p-8 md:p-12" id="po-print-view">
      {/* Header */}
      <header className="text-center mb-8">
        <img src="/logo.png" alt="Company Logo" className="mx-auto h-12 w-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-800">
          {loadingHeader ? 'Loading...' : headerText.split('\n')[0]}
        </h1>
        {loadingHeader ? (
          <p>Loading header...</p>
        ) : (
          <div className="text-xs text-gray-600 mt-2">
            {headerText.split('\n').slice(1).map((line, index) => (
              <p key={index}>{line.replace(/\|/g, ' | ')}</p>
            ))}
          </div>
        )}
      </header>

      {/* Title */}
      <div className="text-center my-8">
        <h2 className="text-lg font-bold underline uppercase tracking-wider">
          Purchase Order
        </h2>
        {/* <p className="text-md font-semibold mt-2">{po.title}</p> */}
      </div>

      {/* Meta Info */}
      <div className="grid grid-cols-2 gap-x-12 mb-8 text-sm">
        <div className="border border-gray-300 p-4 rounded-lg">
          <h3 className="font-bold mb-2">Vendor</h3>
          <p>{po.vendorName}</p>
          <p className="whitespace-pre-wrap">{po.vendorAddress}</p>
          <p>{po.vendorContact}</p>
        </div>
        <div className="text-right">
          <p><span className="font-bold">PO #:</span> {po.poNumber}</p>
          {po.iom && <p><span className="font-bold">IOM Ref:</span> {po.iom.iomNumber}</p>}
          <p><span className="font-bold">Date:</span> {new Date(po.createdAt!).toLocaleDateString()}</p>
          
        </div>
      </div>

      {/* Items Table */}
      <section className="mb-8 po-main-content">
        <table className="w-full border-collapse border border-gray-400 text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 p-2 text-left">S.No</th>
              <th className="border border-gray-300 p-2 text-left">Description</th>
              <th className="border border-gray-300 p-2 text-center">Qty</th>
              <th className="border border-gray-300 p-2 text-right">Unit Price</th>
              <th className="border border-gray-300 p-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {po.items.map((item, index) => (
              <tr key={item.id}>
                <td className="border border-gray-300 p-2">{index + 1}</td>
                <td className="border border-gray-300 p-2">{item.itemName} - {item.description}</td>
                <td className="border border-gray-300 p-2 text-center">{item.quantity}</td>
                <td className="border border-gray-300 p-2 text-right">{formatCurrency(item.unitPrice)}</td>
                <td className="border border-gray-300 p-2 text-right">{formatCurrency(item.totalPrice)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="font-bold">
            <tr>
              <td colSpan={4} className="border border-gray-300 p-2 text-right">Subtotal</td>
              <td className="border border-gray-300 p-2 text-right">{formatCurrency(po.totalAmount)}</td>
            </tr>
            <tr>
              <td colSpan={4} className="border border-gray-300 p-2 text-right">Tax ({po.taxRate}%)</td>
              <td className="border border-gray-300 p-2 text-right">{formatCurrency(po.taxAmount)}</td>
            </tr>
            <tr>
              <td colSpan={4} className="border border-gray-300 p-2 text-right text-lg">Grand Total</td>
              <td className="border border-gray-300 p-2 text-right text-lg">{formatCurrency(po.grandTotal)}</td>
            </tr>
          </tfoot>
        </table>
      </section>

      {/* Footer Signatures */}
      <footer className="mt-24 pt-8 po-footer">
        <div className="grid grid-cols-4 gap-4 text-center text-xs items-end">
          <div>
            <p className="font-bold border-t border-gray-400 pt-2">Prepared By</p>
            <p className="mt-8">{po.preparedBy?.name || 'N/A'}</p>
          </div>
          <div>
            <p className="font-bold border-t border-gray-400 pt-2">Reviewed By</p>
            <p className="mt-8">{po.reviewedBy?.name || 'N/A'}</p>
          </div>
          <div>
            <p className="font-bold border-t border-gray-400 pt-2">Authorized By</p>
            <p className="mt-8">{po.approvedBy?.name || 'N/A'}</p>
          </div>
          <div className="flex flex-col items-center justify-center">
            {po.pdfToken && (
              <QRCodeSVG
                value={`${process.env.NEXT_PUBLIC_APP_URL}/api/pdf/po/${po.pdfToken}`}
                size={80}
                level={"H"}
                includeMargin={true}
              />
            )}
            <p className="mt-2">Scan for PDF</p>
          </div>
        </div>
      </footer>
    </div>
  );
}