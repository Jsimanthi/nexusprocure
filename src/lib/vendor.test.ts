import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from './prisma';
import { updateVendorPerformanceMetrics } from './vendor';
import { PurchaseOrder } from '@prisma/client';

vi.mock('./prisma');

describe('Vendor Performance Metrics', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should reset metrics to zero if a vendor has no completed orders', async () => {
    vi.mocked(prisma.purchaseOrder.findMany).mockResolvedValue([]);

    await updateVendorPerformanceMetrics('vendor-1');

    expect(prisma.vendor.update).toHaveBeenCalledWith({
      where: { id: 'vendor-1' },
      data: {
        onTimeDeliveryRate: 0,
        averageQualityScore: 0,
      },
    });
  });

  it('should correctly calculate on-time delivery rate', async () => {
    const mockPOs: PurchaseOrder[] = [
      // On-time
      { id: 'po-1', vendorId: 'vendor-1', expectedDeliveryDate: new Date('2023-01-10'), fulfilledAt: new Date('2023-01-10'), status: 'DELIVERED', qualityScore: null, deliveryNotes: null, poNumber: '', title: '', companyName: '', companyAddress: '', companyContact: '', vendorName: '', vendorAddress: '', vendorContact: '', totalAmount: 0, taxAmount: 0, grandTotal: 0, taxRate: 0, currency: 'INR', exchangeRate: 1, reviewerStatus: 'PENDING', approverStatus: 'PENDING', preparedById: '', requestedById: '', reviewedById: null, approvedById: null, createdAt: new Date(), updatedAt: new Date(), iomId: null, pdfToken: null },
      // Late
      { id: 'po-2', vendorId: 'vendor-1', expectedDeliveryDate: new Date('2023-01-10'), fulfilledAt: new Date('2023-01-11'), status: 'DELIVERED', qualityScore: null, deliveryNotes: null, poNumber: '', title: '', companyName: '', companyAddress: '', companyContact: '', vendorName: '', vendorAddress: '', vendorContact: '', totalAmount: 0, taxAmount: 0, grandTotal: 0, taxRate: 0, currency: 'INR', exchangeRate: 1, reviewerStatus: 'PENDING', approverStatus: 'PENDING', preparedById: '', requestedById: '', reviewedById: null, approvedById: null, createdAt: new Date(), updatedAt: new Date(), iomId: null, pdfToken: null },
      // On-time
      { id: 'po-3', vendorId: 'vendor-1', expectedDeliveryDate: new Date('2023-01-15'), fulfilledAt: new Date('2023-01-14'), status: 'COMPLETED', qualityScore: null, deliveryNotes: null, poNumber: '', title: '', companyName: '', companyAddress: '', companyContact: '', vendorName: '', vendorAddress: '', vendorContact: '', totalAmount: 0, taxAmount: 0, grandTotal: 0, taxRate: 0, currency: 'INR', exchangeRate: 1, reviewerStatus: 'PENDING', approverStatus: 'PENDING', preparedById: '', requestedById: '', reviewedById: null, approvedById: null, createdAt: new Date(), updatedAt: new Date(), iomId: null, pdfToken: null },
      // No expected date, should be ignored
      { id: 'po-4', vendorId: 'vendor-1', expectedDeliveryDate: null, fulfilledAt: new Date('2023-01-14'), status: 'DELIVERED', qualityScore: null, deliveryNotes: null, poNumber: '', title: '', companyName: '', companyAddress: '', companyContact: '', vendorName: '', vendorAddress: '', vendorContact: '', totalAmount: 0, taxAmount: 0, grandTotal: 0, taxRate: 0, currency: 'INR', exchangeRate: 1, reviewerStatus: 'PENDING', approverStatus: 'PENDING', preparedById: '', requestedById: '', reviewedById: null, approvedById: null, createdAt: new Date(), updatedAt: new Date(), iomId: null, pdfToken: null },
    ];
    vi.mocked(prisma.purchaseOrder.findMany).mockResolvedValue(mockPOs);

    await updateVendorPerformanceMetrics('vendor-1');

    expect(prisma.vendor.update).toHaveBeenCalledWith({
      where: { id: 'vendor-1' },
      data: {
        onTimeDeliveryRate: (2 / 3) * 100, // 2 out of 3 had valid dates
        averageQualityScore: 0, // No scores provided
      },
    });
  });

  it('should correctly calculate average quality score', async () => {
    const mockPOs: PurchaseOrder[] = [
      { id: 'po-1', vendorId: 'vendor-1', qualityScore: 5, expectedDeliveryDate: null, fulfilledAt: null, status: 'DELIVERED', deliveryNotes: null, poNumber: '', title: '', companyName: '', companyAddress: '', companyContact: '', vendorName: '', vendorAddress: '', vendorContact: '', totalAmount: 0, taxAmount: 0, grandTotal: 0, taxRate: 0, currency: 'INR', exchangeRate: 1, reviewerStatus: 'PENDING', approverStatus: 'PENDING', preparedById: '', requestedById: '', reviewedById: null, approvedById: null, createdAt: new Date(), updatedAt: new Date(), iomId: null, pdfToken: null },
      { id: 'po-2', vendorId: 'vendor-1', qualityScore: 3, expectedDeliveryDate: null, fulfilledAt: null, status: 'DELIVERED', deliveryNotes: null, poNumber: '', title: '', companyName: '', companyAddress: '', companyContact: '', vendorName: '', vendorAddress: '', vendorContact: '', totalAmount: 0, taxAmount: 0, grandTotal: 0, taxRate: 0, currency: 'INR', exchangeRate: 1, reviewerStatus: 'PENDING', approverStatus: 'PENDING', preparedById: '', requestedById: '', reviewedById: null, approvedById: null, createdAt: new Date(), updatedAt: new Date(), iomId: null, pdfToken: null },
      // No score, should be ignored
      { id: 'po-3', vendorId: 'vendor-1', qualityScore: null, expectedDeliveryDate: null, fulfilledAt: null, status: 'COMPLETED', deliveryNotes: null, poNumber: '', title: '', companyName: '', companyAddress: '', companyContact: '', vendorName: '', vendorAddress: '', vendorContact: '', totalAmount: 0, taxAmount: 0, grandTotal: 0, taxRate: 0, currency: 'INR', exchangeRate: 1, reviewerStatus: 'PENDING', approverStatus: 'PENDING', preparedById: '', requestedById: '', reviewedById: null, approvedById: null, createdAt: new Date(), updatedAt: new Date(), iomId: null, pdfToken: null },
      // Score of 0, should be ignored
      { id: 'po-4', vendorId: 'vendor-1', qualityScore: 0, expectedDeliveryDate: null, fulfilledAt: null, status: 'DELIVERED', deliveryNotes: null, poNumber: '', title: '', companyName: '', companyAddress: '', companyContact: '', vendorName: '', vendorAddress: '', vendorContact: '', totalAmount: 0, taxAmount: 0, grandTotal: 0, taxRate: 0, currency: 'INR', exchangeRate: 1, reviewerStatus: 'PENDING', approverStatus: 'PENDING', preparedById: '', requestedById: '', reviewedById: null, approvedById: null, createdAt: new Date(), updatedAt: new Date(), iomId: null, pdfToken: null },
    ];
    vi.mocked(prisma.purchaseOrder.findMany).mockResolvedValue(mockPOs);

    await updateVendorPerformanceMetrics('vendor-1');

    expect(prisma.vendor.update).toHaveBeenCalledWith({
      where: { id: 'vendor-1' },
      data: {
        onTimeDeliveryRate: 0, // No delivery dates provided
        averageQualityScore: 4, // (5 + 3) / 2
      },
    });
  });
});