"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { IOM } from "@/types/iom";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorDisplay from "@/components/ErrorDisplay";
import IOMPrintView from "@/components/IOMPrintView";

// This is a special layout for printing only. It has no other UI elements.
export default function IOMPrintPage() {
  const params = useParams();
  const [iom, setIom] = useState<IOM | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchIOM = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/iom/public/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setIom(data);
      } else {
        console.error("Failed to fetch IOM");
      }
    } catch (error) {
      console.error("Error fetching IOM:", error);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    if (params.id) {
      fetchIOM();
    }
  }, [params.id, fetchIOM]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><LoadingSpinner /></div>;
  }

  if (!iom) {
    return <ErrorDisplay title="IOM Not Found" message="The requested IOM could not be found." />;
  }

  // Directly render the print view component without any other layout
  return <IOMPrintView iom={iom} />;
}