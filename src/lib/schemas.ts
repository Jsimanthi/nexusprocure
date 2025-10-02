import { z } from 'zod';
import { PaymentMethod } from '@/types/pr';

export const getIOMsSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).default(10),
  search: z.string().optional(),
  status: z.preprocess(
    (val) => (typeof val === 'string' ? (val === '' ? [] : [val]) : val),
    z.array(z.string()).optional().default([])
  ),
});

export const createPoItemSchema = z.object({
  itemName: z.string().min(1, 'Item name is required.'),
  description: z.string().optional(),
  category: z.string().optional(),
  quantity: z.number().int().positive('Quantity must be a positive integer.'),
  unitPrice: z.number().nonnegative('Unit price cannot be negative.'),
  taxRate: z.number().nonnegative('Tax rate cannot be negative.').max(100, 'Tax rate cannot exceed 100.'),
});

export const attachmentSchema = z.object({
  url: z.string().url(),
  filename: z.string(),
  filetype: z.string(),
  size: z.number(),
});

export const createPoSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
  iomId: z.string().cuid().optional(),
  vendorId: z.string().cuid().optional(),
  companyName: z.string().min(1, 'Company name is required.'),
  companyAddress: z.string().min(1, 'Company address is required.'),
  companyContact: z.string().min(1, 'Company contact is required.'),
  vendorName: z.string().min(1, 'Vendor name is required.'),
  vendorAddress: z.string().min(1, 'Vendor address is required.'),
  vendorContact: z.string().min(1, 'Vendor contact is required.'),
  taxRate: z.number().nonnegative('Tax rate cannot be negative.').max(100, 'Tax rate cannot exceed 100.'),
  items: z.array(createPoItemSchema).min(1, 'At least one item is required.'),
  requestedById: z.string().cuid().optional(),
  attachments: z.array(attachmentSchema).optional(),
  reviewerId: z.string().cuid('Invalid reviewer.'),
  approverId: z.string().cuid('Invalid approver.'),
});

const currencyEnum = z.enum(['INR', 'USD', 'EUR', 'GBP', 'JPY']);

export const createVendorSchema = z.object({
  name: z.string().min(1, 'Name is required.'),
  address: z.string().min(1, 'Address is required.'),
  contactInfo: z.string().min(1, 'Contact info is required.'),
  taxId: z.string().optional(),
  website: z.string().url('Invalid URL.').optional(),
  email: z.string().email('Invalid email address.'),
  phone: z.string().min(1, 'Phone number is required.'),
  currency: currencyEnum.default('INR'),
});

export const updateVendorSchema = createVendorSchema.partial();

export const createIomItemSchema = z.object({
  itemName: z.string().min(1, 'Item name is required.'),
  description: z.string().optional(),
  category: z.string().optional(),
  quantity: z.number().int().positive('Quantity must be a positive integer.'),
  unitPrice: z.number().nonnegative('Unit price cannot be negative.'),
});

export const createIomSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
  from: z.string().min(1, 'From is required.'),
  to: z.string().min(1, 'To is required.'),
  subject: z.string().min(1, 'Subject is required.'),
  content: z.string().optional(),
  isUrgent: z.boolean().optional(),
  items: z.array(createIomItemSchema).optional(),
  requestedById: z.string().cuid(),
  reviewerId: z.string().cuid('Invalid reviewer.'),
  approverId: z.string().cuid('Invalid approver.'),
});

export const updateIomSchema = createIomSchema.partial();

export const createPrSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
  poId: z.string().cuid().optional(),
  paymentTo: z.string().min(1, 'Payment to is required.'),
  paymentDate: z.coerce.date(),
  purpose: z.string().min(1, 'Purpose is required.'),
  paymentMethod: z.nativeEnum(PaymentMethod),
  bankAccount: z.string().optional(),
  referenceNumber: z.string().optional(),
  totalAmount: z.number().nonnegative(),
  taxAmount: z.number().nonnegative(),
  grandTotal: z.number().nonnegative(),
  requestedById: z.string().cuid(),
  reviewerId: z.string().cuid('Invalid reviewer.'),
  approverId: z.string().cuid('Invalid approver.'),
});

export const updatePrSchema = createPrSchema.partial();

export const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required.'),
  email: z.string().email('Invalid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters long.'),
  roleId: z.string().cuid('Invalid role.'),
});
