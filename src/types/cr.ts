// src/types/cr.ts
import { CheckRequest, CRStatus, PaymentMethod } from "@prisma/client";

// This type is used to create a new Check Request
// It includes all required fields but omits automatically generated ones like `id` and `createdAt`
export interface CreateCrData {
  title: string;
  poId?: string;
  paymentTo: string;
  paymentDate: Date;
  purpose: string;
  paymentMethod: PaymentMethod;
  totalAmount: number;
  taxAmount: number;
  grandTotal: number;
  requestedById: string;
  bankAccount?: string;
  referenceNumber?: string;
  preparedById: string; // Add this field
}

export interface UserRef {
  id: string;
  name?: string | null;
  email: string;
}

export interface PORef {
  id: string;
  poNumber: string;
  title: string;
  status: string;
  grandTotal: number;
  vendorName: string;
}

// Re-export the types and enums from Prisma
export type { CheckRequest, CRStatus, PaymentMethod };