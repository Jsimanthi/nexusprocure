import { PaymentRequest, PaymentMethod } from "@/types/pr";
import { UserRef } from "@/types/iom";
import { PurchaseOrder } from "@prisma/client";
import { formatCurrency } from "@/lib/utils";
import { useEffect, useState } from "react";
import { QRCodeSVG } from 'qrcode.react';

// Copied from PR Detail Page
type FullPaymentRequest = PaymentRequest & {
  po?: (Partial<PurchaseOrder> & {
    iom?: { iomNumber: string } | null;
  }) | null;
  preparedBy?: UserRef | null;
  requestedBy?: UserRef | null;
  reviewedBy?: UserRef | null;
  approvedBy?: UserRef | null;
};

interface PRPrintViewProps {
  pr: FullPaymentRequest;
}

// Define a type for the setting object we expect from the API
interface Setting {
  key: string;
  value: string;
}

const getPaymentMethodLabel = (method: PaymentMethod) => {
  switch (method) {
    case PaymentMethod.CHEQUE: return "Cheque";
    case PaymentMethod.BANK_TRANSFER: return "Bank Transfer";
    case PaymentMethod.CASH: return "Cash";
    case PaymentMethod.ONLINE_PAYMENT: return "Online Payment";
    default: return method;
  }
};

export default function PRPrintView({ pr }: PRPrintViewProps) {
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
    <div className="bg-white shadow-lg p-8 md:p-12" id="pr-print-view">
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
          Payment Request
        </h2>
        {/* <p className="text-md font-semibold mt-2">{pr.title}</p> */}
      </div>

      {/* Meta Info */}
      <div className="flex justify-between items-start mb-6 text-sm">
        <div>
          <p><span className="font-bold">PR #:</span> {pr.prNumber}</p>
          {pr.po && <p><span className="font-bold">Linked PO:</span> {pr.po.poNumber}</p>}
          {pr.po?.iom && <p><span className="font-bold">Linked IOM:</span> {pr.po.iom.iomNumber}</p>}
          <p><span className="font-bold">Payment To:</span> {pr.paymentTo}</p>
        </div>
        <div>
          <p><span className="font-bold">Date:</span> {new Date(pr.createdAt!).toLocaleDateString()}</p>
          <p><span className="font-bold">Payment Date:</span> {new Date(pr.paymentDate).toLocaleDateString()}</p>
        </div>
      </div>

      {/* Main Content */}
      <main className="pr-main-content space-y-6">
        {/* Payment Details */}
        <div className="border border-gray-300 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Payment Details</h3>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div><dt className="font-bold">Payment Method</dt><dd>{getPaymentMethodLabel(pr.paymentMethod)}</dd></div>
            {pr.bankAccount && <div><dt className="font-bold">Bank Account</dt><dd>{pr.bankAccount}</dd></div>}
            {pr.referenceNumber && <div><dt className="font-bold">Reference Number</dt><dd>{pr.referenceNumber}</dd></div>}
          </dl>
        </div>

        {/* Purpose */}
        <div className="border border-gray-300 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Purpose</h3>
          <p className="text-sm text-gray-900 whitespace-pre-wrap">{pr.purpose}</p>
        </div>

        {/* Financial Summary */}
        <div className="border border-gray-300 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Financial Summary</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt>Total Amount</dt><dd>{formatCurrency(pr.totalAmount)}</dd></div>
            <div className="flex justify-between"><dt>Tax Amount</dt><dd>{formatCurrency(pr.taxAmount)}</dd></div>
            <div className="flex justify-between border-t pt-2 mt-2 font-bold text-base"><dt>Grand Total</dt><dd>{formatCurrency(pr.grandTotal)}</dd></div>
          </dl>
        </div>
      </main>

      {/* Footer Signatures */}
      <footer className="mt-24 pt-8 pr-footer">
        <div className="grid grid-cols-4 gap-4 text-center text-xs items-end">
          <div>
            <p className="font-bold border-t border-gray-400 pt-2">Prepared By</p>
            <p className="mt-8">{pr.preparedBy?.name || 'N/A'}</p>
          </div>
          <div>
            <p className="font-bold border-t border-gray-400 pt-2">Reviewed By</p>
            <p className="mt-8">{pr.reviewedBy?.name || 'N/A'}</p>
          </div>
          <div>
            <p className="font-bold border-t border-gray-400 pt-2">Authorized By</p>
            <p className="mt-8">{pr.approvedBy?.name || 'N/A'}</p>
          </div>
          <div className="flex flex-col items-center justify-center">
            {pr.pdfToken && (
              <QRCodeSVG
                value={`${process.env.NEXT_PUBLIC_APP_URL}/api/pdf/pr/${pr.pdfToken}`}
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
