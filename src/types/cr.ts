// src/types/cr.ts
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

export interface CheckRequest {
  id?: string;
  crNumber: string;
  poId?: string;
  title: string;
  status: CRStatus;
  totalAmount: number;
  taxAmount: number;
  grandTotal: number;
  
  // Payment Details
  paymentTo: string;
  paymentDate: Date;
  purpose: string;
  paymentMethod: PaymentMethod;
  bankAccount?: string;
  referenceNumber?: string;
  
  preparedById: string;
  requestedById: string;
  reviewedById?: string;
  approvedById?: string;
  createdAt?: Date;
  updatedAt?: Date;
  
  // Relation fields
  preparedBy?: UserRef;
  requestedBy?: UserRef;
  reviewedBy?: UserRef;
  approvedBy?: UserRef;
  po?: PORef;
}

export enum CRStatus {
  DRAFT = "DRAFT",
  PENDING_APPROVAL = "PENDING_APPROVAL",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  PROCESSED = "PROCESSED",
  CANCELLED = "CANCELLED"
}

export enum PaymentMethod {
  CHEQUE = "CHEQUE",
  BANK_TRANSFER = "BANK_TRANSFER",
  CASH = "CASH",
  ONLINE_PAYMENT = "ONLINE_PAYMENT"
}