"use client";

import { IOM } from "@/types/iom";
import { useEffect, useState } from "react";

interface IOMPrintViewProps {
  iom: IOM;
}

// Define a type for the setting object we expect from the API
interface Setting {
  key: string;
  value: string;
}

export default function IOMPrintView({ iom }: IOMPrintViewProps) {
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
          // Fallback text if the setting is not found or API fails
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

  const hasItems = iom.items && iom.items.length > 0;

  return (
    <div className="bg-white shadow-lg p-8 md:p-12" id="iom-print-view">
      {/* Header */}
      <header className="text-center mb-8">
        <img src="/logo.png" alt="Company Logo" className="mx-auto h-12 w-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-800">Sri Bhagyalakshmi Enterprises</h1>
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
          Inter Office Memo
        </h2>
      </div>

      {/* Meta Info */}
      <div className="flex justify-between items-start mb-6 text-sm">
        <div>
          <p><span className="font-bold">From:</span> {iom.from}</p>
          <p><span className="font-bold">To:</span> {iom.to}</p>
          <p><span className="font-bold">SUB:</span> {iom.subject}</p>
        </div>
        <div>
          {iom.createdAt && <p><span className="font-bold">Date:</span> {new Date(iom.createdAt).toLocaleDateString()}</p>}
        </div>
      </div>

      {/* Body */}
      <main className="text-sm text-gray-800 leading-relaxed mb-8 iom-main-content">
        <p className="mb-4">Dear Sir,</p>
        <div className="whitespace-pre-wrap">
          {iom.content || (hasItems ? "Please find the item details below for your approval." : "No content provided.")}
        </div>
        <p className="mt-6">
          {hasItems ? "Kindly approve the same." : "Thank you for your prompt attention to this urgent issue."}
        </p>
        <p className="mt-4">Sincerely,</p>
      </main>

      {/* Items Table */}
      {hasItems && (
        <section className="mb-8">
          <table className="w-full border-collapse border border-gray-400 text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 p-2 text-left">S.No</th>
                <th className="border border-gray-300 p-2 text-left">Description</th>
                <th className="border border-gray-300 p-2 text-center">Qty</th>
                <th className="border border-gray-300 p-2 text-right">Unit Price</th>
                <th className="border border-gray-300 p-2 text-right">Total Amount</th>
              </tr>
            </thead>
            <tbody>
              {iom.items.map((item, index) => (
                <tr key={item.id}>
                  <td className="border border-gray-300 p-2">{index + 1}</td>
                  <td className="border border-gray-300 p-2">{item.itemName} - {item.description}</td>
                  <td className="border border-gray-300 p-2 text-center">{item.quantity}</td>
                  <td className="border border-gray-300 p-2 text-right">₹{item.unitPrice.toFixed(2)}</td>
                  <td className="border border-gray-300 p-2 text-right">₹{item.totalPrice.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-bold">
                <td colSpan={4} className="border border-gray-300 p-2 text-right">Total Amt.</td>
                <td className="border border-gray-300 p-2 text-right">₹{iom.totalAmount.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </section>
      )}

      {/* Footer Signatures */}
      <footer className="mt-24 pt-8 iom-footer">
        <div className="grid grid-cols-3 gap-4 text-center text-xs">
          <div>
            <p className="font-bold border-t border-gray-400 pt-2">Prepared By</p>
            <p className="mt-8">{iom.preparedBy?.name || 'N/A'}</p>
          </div>
          <div>
            <p className="font-bold border-t border-gray-400 pt-2">Reviewed By</p>
            <p className="mt-8">{iom.reviewedBy?.name || 'N/A'}</p>
          </div>
          <div>
            <p className="font-bold border-t border-gray-400 pt-2">Authorized By</p>
            <p className="mt-8">{iom.approvedBy?.name || 'N/A'}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
