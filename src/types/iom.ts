// src/types/iom.ts
export interface IOMItem {
  id?: string;
  itemName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserRef {
  id: string;
  name?: string | null;
  email: string;
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
  
  // Relation fields (added by Prisma includes)
  preparedBy?: UserRef;
  requestedBy?: UserRef;
  reviewedBy?: UserRef;
  approvedBy?: UserRef;
}

export enum IOMStatus {
  DRAFT = "DRAFT",
  SUBMITTED = "SUBMITTED",
  UNDER_REVIEW = "UNDER_REVIEW",
  PENDING_APPROVAL = "PENDING_APPROVAL",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  COMPLETED = "COMPLETED"
}