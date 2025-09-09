import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createPurchaseOrder, updatePOStatus, createVendor, updateVendor, deleteVendor } from './po';
import { prisma } from './prisma';
import { POStatus } from '@/types/po';
import { Session } from 'next-auth';
import { Prisma, Role } from '@prisma/client';

// Mock external dependencies
vi.mock('@/lib/prisma');
vi.mock('@/lib/email');
vi.mock('@/lib/notification');
vi.mock('@/lib/audit');
import { getAuditUser } from './audit';

const mockUserSession = (role: Role): Session => ({
  user: { id: `user-${role.toLowerCase()}-id`, name: `${role} User`, role },
  expires: '2099-01-01T00:00:00.000Z',
});

describe('Purchase Order Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01'));
    // @ts-ignore
    vi.mocked(getAuditUser).mockReturnValue({ userId: 'mock-user-id', userName: 'Mock User' });
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
      const session = mockUserSession(Role.USER);

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
      const session = mockUserSession(Role.USER);

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

    it('should retry creating a PO if a unique constraint violation occurs', async () => {
      // Arrange
      const inputData = {
        title: 'Test Retry PO',
        companyName: 'Test Company',
        companyAddress: '123 Test St',
        companyContact: 'Test Contact',
        vendorName: 'Test Vendor',
        vendorAddress: '456 Vendor Ave',
        vendorContact: 'Vendor Contact',
        taxRate: 10,
        items: [],
        preparedById: 'user-prepared-id',
        requestedById: 'user-requested-id',
        attachments: [],
      };
      const session = mockUserSession(Role.USER);
      const uniqueConstraintError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        { code: 'P2002', clientVersion: 'test' }
      );

      // @ts-ignore
      prisma.purchaseOrder.count.mockResolvedValue(0);
      // @ts-ignore
      prisma.purchaseOrder.create
        .mockRejectedValueOnce(uniqueConstraintError) // Fail first time
        .mockResolvedValue({ id: 'po-125', ...inputData }); // Succeed second time

      // Act
      await createPurchaseOrder(inputData, session);

      // Assert
      expect(prisma.purchaseOrder.create).toHaveBeenCalledTimes(2);
    });
  });

  describe('updatePOStatus', () => {
    const poId = 'po-123';
    const userSession = mockUserSession(Role.USER);
    const managerSession = mockUserSession(Role.MANAGER);
    const adminSession = mockUserSession(Role.ADMIN);

    beforeEach(() => {
      // @ts-ignore
      prisma.purchaseOrder.findUnique.mockResolvedValue({
        id: poId,
        preparedById: 'user-prepared-id',
        poNumber: 'PO-2024-0001',
        status: POStatus.DRAFT,
        preparedBy: { name: 'Test User', email: 'test@example.com' },
      });
      // @ts-ignore
      prisma.purchaseOrder.update.mockResolvedValue({});
    });

    it('should throw an error if a USER tries to approve a PO', async () => {
      await expect(
        updatePOStatus(poId, POStatus.APPROVED, userSession)
      ).rejects.toThrow('Not authorized to perform this action.');
    });

    it('should allow a MANAGER to approve a PO', async () => {
      await expect(
        updatePOStatus(poId, POStatus.APPROVED, managerSession)
      ).resolves.not.toThrow();
      expect(prisma.purchaseOrder.update).toHaveBeenCalled();
    });

    it('should allow an ADMIN to approve a PO', async () => {
      await expect(
        updatePOStatus(poId, POStatus.APPROVED, adminSession)
      ).resolves.not.toThrow();
      expect(prisma.purchaseOrder.update).toHaveBeenCalled();
    });
  });

  describe('Vendor Functions', () => {
    const userSession = mockUserSession(Role.USER);
    const managerSession = mockUserSession(Role.MANAGER);
    const adminSession = mockUserSession(Role.ADMIN);
    const vendorData = { name: 'New Vendor', address: '123 Vendor St', contactInfo: 'info', email: 'v@e.com', phone: '123' };
    const vendorId = 'vendor-123';

    it('should prevent USER from creating a vendor', async () => {
      await expect(createVendor(vendorData, userSession)).rejects.toThrow('Not authorized to perform this action.');
    });

    it('should prevent MANAGER from creating a vendor', async () => {
      await expect(createVendor(vendorData, managerSession)).rejects.toThrow('Not authorized to perform this action.');
    });

    it('should allow ADMIN to create a vendor', async () => {
      await expect(createVendor(vendorData, adminSession)).resolves.not.toThrow();
    });

    it('should prevent USER from updating a vendor', async () => {
      await expect(updateVendor(vendorId, vendorData, userSession)).rejects.toThrow('Not authorized to perform this action.');
    });

    it('should allow ADMIN to update a vendor', async () => {
      await expect(updateVendor(vendorId, vendorData, adminSession)).resolves.not.toThrow();
    });

    it('should prevent MANAGER from deleting a vendor', async () => {
      await expect(deleteVendor(vendorId, managerSession)).rejects.toThrow('Not authorized to perform this action.');
    });

    it('should allow ADMIN to delete a vendor', async () => {
      await expect(deleteVendor(vendorId, adminSession)).resolves.not.toThrow();
    });
  });
});
