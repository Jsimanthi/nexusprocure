"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { PaymentRequest } from "@/types/pr";
import { UserRef } from "@/types/iom";
import { PurchaseOrder } from "@prisma/client";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorDisplay from "@/components/ErrorDisplay";
import PRPrintView from "@/components/PRPrintView";

type FullPaymentRequest = PaymentRequest & {
  po?: Partial<PurchaseOrder> | null;
  preparedBy?: UserRef | null;
  requestedBy?: UserRef | null;
  reviewedBy?: UserRef | null;
  approvedBy?: UserRef | null;
};

export default function PRPrintPage() {
  const params = useParams();
  const [pr, setPr] = useState<FullPaymentRequest | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPR = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/pr/public/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setPr(data);
      } else {
        console.error("Failed to fetch PR");
      }
    } catch (error) {
      console.error("Error fetching PR:", error);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    if (params.id) {
      fetchPR();
    }
  }, [params.id, fetchPR]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><LoadingSpinner /></div>;
  }

  if (!pr) {
    return <ErrorDisplay title="PR Not Found" message="The requested Payment Request could not be found." />;
  }

  return <PRPrintView pr={pr} />;
}