"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { PurchaseOrder } from "@/types/po";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorDisplay from "@/components/ErrorDisplay";
import POPrintView from "@/components/POPrintView";

export default function POPrintPage() {
  const params = useParams();
  const [po, setPo] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPO = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/po/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setPo(data);
      } else {
        console.error("Failed to fetch PO");
      }
    } catch (error) {
      console.error("Error fetching PO:", error);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    if (params.id) {
      fetchPO();
    }
  }, [params.id, fetchPO]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><LoadingSpinner /></div>;
  }

  if (!po) {
    return <ErrorDisplay title="PO Not Found" message="The requested Purchase Order could not be found." />;
  }

  return <POPrintView po={po} />;
}