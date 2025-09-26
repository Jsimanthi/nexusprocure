// src/types/pr.ts
import { PaymentRequest as PrismaPaymentRequest, PRStatus, PaymentMethod } from "@prisma/client";

export type PaymentRequest = PrismaPaymentRequest & {
  pdfToken?: string | null;
};

// This type is used to create a new Payment Request
// It includes all required fields but omits automatically generated ones like `id` and `createdAt`
export interface CreatePrData {
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
  preparedById: string;
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

// Re-exporting the types and enums from Prisma for use in other files.
// This allows them to be used as both types and values.
export { PRStatus, PaymentMethod };
