// src/types/iom.ts
export interface IOMItem {
  id?: string;
  itemName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface IOM {
  id?: string;
  iomNumber: string;
  title: string;
  from: string;
  to: string;
  subject: string;
  content?: string;
  status: IOMStatus;
  totalAmount: number;
  items: IOMItem[];
  preparedById: string;
  requestedById: string;
  reviewedById?: string;
  approvedById?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export enum IOMStatus {
  DRAFT = "DRAFT",
  SUBMITTED = "SUBMITTED",
  UNDER_REVIEW = "UNDER_REVIEW",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  COMPLETED = "COMPLETED"
}