import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createPurchaseOrder } from './po';
import { prisma } from './prisma';
import { POStatus } from '@/types/po';

// Mock external dependencies
vi.mock('@/lib/prisma');
vi.mock('@/lib/email');
vi.mock('@/lib/notification');

describe('Purchase Order Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('createPurchaseOrder', () => {
    it('should create a PO without attachments', async () => {
      // Arrange
      const inputData = {
        title: 'Test PO',
        companyName: 'Test Company',
        companyAddress: '123 Test St',
        companyContact: 'Test Contact',
        vendorName: 'Test Vendor',
        vendorAddress: '456 Vendor Ave',
        vendorContact: 'Vendor Contact',
        taxRate: 10,
        items: [{ itemName: 'Item 1', quantity: 2, unitPrice: 100, taxRate: 5 }],
        preparedById: 'user-prepared-id',
        requestedById: 'user-requested-id',
        attachments: [], // Explicitly empty
      };
      const session = { user: { id: 'user-prepared-id', name: 'Test User' } } as any;

      // @ts-ignore
      prisma.purchaseOrder.count.mockResolvedValue(0);
      // @ts-ignore
      prisma.purchaseOrder.create.mockResolvedValue({ id: 'po-123', ...inputData });

      // Act
      await createPurchaseOrder(inputData, session);

      // Assert
      expect(prisma.purchaseOrder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.not.objectContaining({ attachments: expect.any(Object) }),
        })
      );
    });

    it('should create a PO with attachments', async () => {
      // Arrange
      const inputData = {
        title: 'Test PO with Attachments',
        companyName: 'Test Company',
        companyAddress: '123 Test St',
        companyContact: 'Test Contact',
        vendorName: 'Test Vendor',
        vendorAddress: '456 Vendor Ave',
        vendorContact: 'Vendor Contact',
        taxRate: 10,
        items: [{ itemName: 'Item 1', quantity: 1, unitPrice: 100, taxRate: 10 }],
        preparedById: 'user-prepared-id',
        requestedById: 'user-requested-id',
        attachments: [
          { url: 'http://example.com/file1.pdf', filename: 'file1.pdf', filetype: 'application/pdf', size: 12345 },
        ],
      };
      const session = { user: { id: 'user-prepared-id', name: 'Test User' } } as any;

      // @ts-ignore
      prisma.purchaseOrder.count.mockResolvedValue(0);
      // @ts-ignore
      prisma.purchaseOrder.create.mockResolvedValue({ id: 'po-124', ...inputData });

      // Act
      await createPurchaseOrder(inputData, session);

      // Assert
      expect(prisma.purchaseOrder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            attachments: {
              create: [
                { url: 'http://example.com/file1.pdf', filename: 'file1.pdf', filetype: 'application/pdf', size: 12345 },
              ],
            },
          }),
        })
      );
    });
  });
});
