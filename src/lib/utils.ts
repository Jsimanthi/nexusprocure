import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// Import the official, database-generated types directly from Prisma.
// This establishes a single source of truth for the application's enums.
import { IOMStatus, POStatus, PRStatus } from "@prisma/client";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatCurrency = (amount: number, currency = 'INR') => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const getPOStatusColor = (status: POStatus) => {
  switch (status) {
    case POStatus.DRAFT: return "bg-gray-100 text-gray-800";
    case POStatus.PENDING_APPROVAL: return "bg-blue-100 text-blue-800";
    case POStatus.APPROVED: return "bg-green-100 text-green-800";
    case POStatus.REJECTED: return "bg-red-100 text-red-800";
    case POStatus.ORDERED: return "bg-purple-100 text-purple-800";
    case POStatus.DELIVERED: return "bg-teal-100 text-teal-800";
    case POStatus.CANCELLED: return "bg-red-100 text-red-800";
    default: return "bg-gray-100 text-gray-800";
  }
};

export const getIOMStatusColor = (status: IOMStatus) => {
  switch (status) {
    case IOMStatus.DRAFT: return "bg-gray-100 text-gray-800";
    case IOMStatus.SUBMITTED: return "bg-blue-100 text-blue-800";
    case IOMStatus.UNDER_REVIEW: return "bg-yellow-100 text-yellow-800";
    case IOMStatus.APPROVED: return "bg-green-100 text-green-800";
    case IOMStatus.REJECTED: return "bg-red-100 text-red-800";
    case IOMStatus.COMPLETED: return "bg-purple-100 text-purple-800";
    default: return "bg-gray-100 text-gray-800";
  }
};

export const getPRStatusColor = (status: PRStatus) => {
  switch (status) {
    case PRStatus.DRAFT: return "bg-gray-100 text-gray-800";
    case PRStatus.PENDING_APPROVAL: return "bg-blue-100 text-blue-800";
    case PRStatus.APPROVED: return "bg-green-100 text-green-800";
    case PRStatus.REJECTED: return "bg-red-100 text-red-800";
    case PRStatus.PROCESSED: return "bg-purple-100 text-purple-800";
    case PRStatus.CANCELLED: return "bg-red-100 text-red-800";
    default: return "bg-gray-100 text-gray-800";
  }
};