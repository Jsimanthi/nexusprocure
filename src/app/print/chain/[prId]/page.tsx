"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorDisplay from '@/components/ErrorDisplay';
import { PaymentRequest } from '@/types/pr';
import { PurchaseOrder } from '@/types/po';
import { IOM } from '@/types/iom';
import PRPrintView from '@/components/PRPrintView';
import POPrintView from '@/components/POPrintView';
import IOMPrintView from '@/components/IOMPrintView';

// Define a type for the full data chain
type FullChainData = PaymentRequest & {
  po?: (PurchaseOrder & {
    iom?: IOM;
  }) | null;
};

export default function PrintChainPage() {
  const params = useParams();
  const prId = params.prId as string;
  const [data, setData] = useState<FullChainData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (prId) {
      const fetchData = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const response = await fetch(`/api/pr/${prId}`);
          if (!response.ok) {
            throw new Error('Failed to fetch document chain data.');
          }
          const result: FullChainData = await response.json();
          setData(result);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
          setIsLoading(false);
        }
      };
      fetchData();
    }
  }, [prId]);

  useEffect(() => {
    if (data && !isLoading && !error) {
      // Automatically trigger the print dialog once data is loaded
      window.print();
    }
  }, [data, isLoading, error]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <LoadingSpinner />
        <p className="ml-2">Loading documents...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <ErrorDisplay title="Error Loading Document Chain" message={error} />
      </div>
    );
  }

  if (!data) {
    return <div className="p-8 text-center">No data found for this document chain.</div>;
  }

  return (
    <div className="print-container bg-white">
      {/* Render each document's print view in order */}
      <section className="printable-section">
        <PRPrintView pr={data} />
      </section>

      {data.po && (
        <section className="printable-section">
          <POPrintView po={data.po} />
        </section>
      )}

      {data.po?.iom && (
        <section className="printable-section">
          <IOMPrintView iom={data.po.iom} />
        </section>
      )}

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-container, .print-container * {
            visibility: visible;
          }
          .print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .printable-section {
            page-break-after: always;
          }
        }
      `}</style>
    </div>
  );
}