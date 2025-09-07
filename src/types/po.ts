// src/types/po.ts
export interface POItem {
  id?: string;
  itemName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  taxAmount: number;
  totalPrice: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Vendor {
  id?: string;
  name: string;
  address: string;
  contactInfo: string;
  taxId?: string;
  website?: string;
  email: string;
  phone: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserRef {
  id: string;
  name?: string | null;
  email: string;
}

export interface IOMRef {
  id: string;
  iomNumber: string;
  title: string;
  status: string;
  totalAmount: number;
  preparedBy?: UserRef;
  requestedBy?: UserRef;
}

export interface PurchaseOrder {
  id?: string;
  poNumber: string;
  iomId?: string;
  vendorId?: string;
  title: string;
  status: POStatus;
  totalAmount: number;
  taxAmount: number;
  grandTotal: number;
  taxRate: number;
  
  // Company and Vendor Details
  companyName: string;
  companyAddress: string;
  companyContact: string;
  vendorName: string;
  vendorAddress: string;
  vendorContact: string;
  
  items: POItem[];
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
  iom?: IOMRef;
  vendor?: Vendor;
}

export enum POStatus {
  DRAFT = "DRAFT",
  PENDING_APPROVAL = "PENDING_APPROVAL",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  ORDERED = "ORDERED",
  DELIVERED = "DELIVERED",
  CANCELLED = "CANCELLED"
}