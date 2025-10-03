"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Prisma } from "@prisma/client";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorDisplay from "@/components/ErrorDisplay";
import PRPrintView from "@/components/PRPrintView";

// Create a detailed type for the PR object, including all its relations,
// using Prisma's generated types for a single source of truth.
const prWithRelations = Prisma.validator<Prisma.PaymentRequestDefaultArgs>()({
  include: {
    preparedBy: { select: { name: true, email: true } },
    reviewedBy: { select: { name: true, email: true } },
    approvedBy: { select: { name: true, email: true } },
    po: {
      select: {
        poNumber: true,
        iom: {
          select: {
            iomNumber: true,
          },
        },
      },
    },
  },
});

type PRPrintData = Prisma.PaymentRequestGetPayload<typeof prWithRelations>;

export default function PRPrintPage() {
  const params = useParams();
  const [pr, setPr] = useState<PRPrintData | null>(null);
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