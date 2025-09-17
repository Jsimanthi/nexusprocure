// src/lib/po.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getPOs, createPurchaseOrder, updatePOStatus, createVendor, updateVendor, deleteVendor } from './po';
import { prisma } from './prisma';
import { PurchaseOrder, POStatus } from '@/types/po';
import { Session } from 'next-auth';
import { Prisma } from '@prisma/client';
import { createVendorSchema } from './schemas';
import { z } from 'zod';

// Define the type from the Zod schema
type CreateVendorData = z.infer<typeof createVendorSchema>;

import { authorize } from './auth-utils';

// Mock external dependencies
vi.mock('@/lib/prisma');
vi.mock('@/lib/email');
vi.mock('@/lib/notification');
vi.mock('@/lib/audit');
vi.mock('@/lib/auth-utils');
import { getAuditUser } from './audit';

const mockUserSession = (permissions: string[] = []): Session => ({
  user: {
    id: 'user-id',
    name: 'Test User',
    email: 'test@example.com',
    permissions,
  },
  expires: '2099-01-01T00:00:00.000Z',
});

describe('Purchase Order Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01'));
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
      const session = mockUserSession(['CREATE_PO']);
      vi.mocked(authorize).mockReturnValue(true);
      vi.mocked(prisma.purchaseOrder.count).mockResolvedValue(0);

      vi.mocked(prisma.purchaseOrder.create).mockResolvedValue({ id: 'po-123', ...inputData } as unknown as PurchaseOrder);

      // Act
      await createPurchaseOrder(inputData, session);

      // Assert
      expect(authorize).toHaveBeenCalledWith(session, 'CREATE_PO');
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
      const session = mockUserSession(['CREATE_PO']);
      vi.mocked(authorize).mockReturnValue(true);
      vi.mocked(prisma.purchaseOrder.count).mockResolvedValue(0);

      vi.mocked(prisma.purchaseOrder.create).mockResolvedValue({ id: 'po-124', ...inputData } as unknown as PurchaseOrder);

      // Act
      await createPurchaseOrder(inputData, session);

      // Assert
      expect(authorize).toHaveBeenCalledWith(session, 'CREATE_PO');
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
      const session = mockUserSession(['CREATE_PO']);
      vi.mocked(authorize).mockReturnValue(true);
      const uniqueConstraintError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        { code: 'P2002', clientVersion: 'test' }
      );

      vi.mocked(prisma.purchaseOrder.count).mockResolvedValue(0);
      vi.mocked(prisma.purchaseOrder.create)
        .mockRejectedValueOnce(uniqueConstraintError) // Fail first time

        .mockResolvedValue({ id: 'po-125', ...inputData } as unknown as PurchaseOrder); // Succeed second time

      // Act
      await createPurchaseOrder(inputData, session);

      // Assert
      expect(prisma.purchaseOrder.create).toHaveBeenCalledTimes(2);
    });
  });

  describe('updatePOStatus', () => {
    const poId = 'po-123';
    const approverId = 'approver-id';
    const reviewerId = 'reviewer-id';
    const approverSession = mockUserSession(['APPROVE_PO']);
    approverSession.user.id = approverId;
    const reviewerSession = mockUserSession(['REVIEW_PO']);
    reviewerSession.user.id = reviewerId;

    const basePo = {
      id: poId,
      preparedById: 'user-prepared-id',
      poNumber: 'PO-2024-0001',
      status: POStatus.PENDING_APPROVAL,
      reviewerStatus: "PENDING",
      approverStatus: "PENDING",
      approvedById: approverId,
      reviewedById: reviewerId,
      preparedBy: { id: 'user-id', name: 'Test User', email: 'test@example.com' },
    };

    beforeEach(() => {
      vi.mocked(prisma.purchaseOrder.update).mockImplementation(async (args) => {
        return {
          ...basePo,
          ...(args.data as object),
        } as unknown as PurchaseOrder;
      });
    });

    it('should throw an error if user is not the designated reviewer or approver', async () => {
      const unrelatedUserSession = mockUserSession(['REVIEW_PO', 'APPROVE_PO']);
      unrelatedUserSession.user.id = 'unrelated-user';
      vi.mocked(prisma.purchaseOrder.findUnique).mockResolvedValue(basePo as PurchaseOrder);

      await expect(
        updatePOStatus(poId, "APPROVE", unrelatedUserSession)
      ).rejects.toThrow("Not authorized to perform this action on this PO.");
    });

    it('should allow reviewer to approve and update reviewerStatus', async () => {
      vi.mocked(authorize).mockReturnValue(true);
      vi.mocked(prisma.purchaseOrder.findUnique).mockResolvedValue(basePo as PurchaseOrder);

      vi.mocked(prisma.purchaseOrder.update).mockResolvedValueOnce({ ...basePo, reviewerStatus: "APPROVED" } as PurchaseOrder);
      vi.mocked(prisma.purchaseOrder.update).mockResolvedValueOnce({ ...basePo, reviewerStatus: "APPROVED", status: POStatus.PENDING_APPROVAL } as PurchaseOrder);

      await updatePOStatus(poId, "APPROVE", reviewerSession);

      expect(authorize).toHaveBeenCalledWith(reviewerSession, 'REVIEW_PO');
      expect(prisma.purchaseOrder.update).toHaveBeenCalledWith({
        where: { id: poId },
        data: { reviewerStatus: "APPROVED" },
      });
    });

    it('should allow approver to approve and update approverStatus, leading to final APPROVAL', async () => {
      vi.mocked(authorize).mockReturnValue(true);
      const poPendingManagerApproval = { ...basePo, reviewerStatus: 'APPROVED' };
      vi.mocked(prisma.purchaseOrder.findUnique).mockResolvedValue(poPendingManagerApproval as PurchaseOrder);

      vi.mocked(prisma.purchaseOrder.update).mockResolvedValueOnce({ ...poPendingManagerApproval, approverStatus: 'APPROVED' } as PurchaseOrder);
      vi.mocked(prisma.purchaseOrder.update).mockResolvedValueOnce({ ...poPendingManagerApproval, approverStatus: 'APPROVED', status: POStatus.APPROVED } as PurchaseOrder);

      await updatePOStatus(poId, "APPROVE", approverSession);

      expect(authorize).toHaveBeenCalledWith(approverSession, 'APPROVE_PO');
      expect(prisma.purchaseOrder.update).toHaveBeenCalledWith({
        where: { id: poId },
        data: { approverStatus: "APPROVED" },
      });
      expect(prisma.purchaseOrder.update).toHaveBeenCalledWith({
        where: { id: poId },
        data: { status: POStatus.APPROVED },
        include: expect.any(Object),
      });
    });

    it('should set final status to REJECTED if reviewer rejects', async () => {
      vi.mocked(authorize).mockReturnValue(true);
      vi.mocked(prisma.purchaseOrder.findUnique).mockResolvedValue(basePo as PurchaseOrder);

      vi.mocked(prisma.purchaseOrder.update).mockResolvedValueOnce({ ...basePo, reviewerStatus: 'REJECTED' } as PurchaseOrder);
      vi.mocked(prisma.purchaseOrder.update).mockResolvedValueOnce({ ...basePo, reviewerStatus: 'REJECTED', status: POStatus.REJECTED } as PurchaseOrder);

      await updatePOStatus(poId, "REJECT", reviewerSession);

      expect(authorize).toHaveBeenCalledWith(reviewerSession, 'REVIEW_PO');
      expect(prisma.purchaseOrder.update).toHaveBeenCalledWith({
        where: { id: poId },
        data: { status: POStatus.REJECTED },
        include: expect.any(Object),
      });
    });
  });

  describe('Vendor Functions', () => {
    const session = mockUserSession(['MANAGE_VENDORS']);
    const vendorData: CreateVendorData = { name: 'New Vendor', address: '123 Vendor St', contactInfo: 'info', email: 'v@e.com', phone: '123', currency: 'USD' };
    const vendorId = 'vendor-123';

    it('should prevent creating a vendor if user lacks permission', async () => {
      const authError = new Error('Not authorized');
      const sessionWithoutPerm = mockUserSession([]);
      vi.mocked(authorize).mockImplementation(() => {
        throw authError;
      });
      await expect(createVendor(vendorData, sessionWithoutPerm)).rejects.toThrow(authError);
      expect(authorize).toHaveBeenCalledWith(sessionWithoutPerm, 'MANAGE_VENDORS');
    });

    it('should allow creating a vendor if user has permission', async () => {
      vi.mocked(authorize).mockReturnValue(true);
      await expect(createVendor(vendorData, session)).resolves.not.toThrow();
      expect(authorize).toHaveBeenCalledWith(session, 'MANAGE_VENDORS');
    });

    it('should prevent updating a vendor if user lacks permission', async () => {
      const authError = new Error('Not authorized');
      const sessionWithoutPerm = mockUserSession([]);
      vi.mocked(authorize).mockImplementation(() => {
        throw authError;
      });
      await expect(updateVendor(vendorId, vendorData, sessionWithoutPerm)).rejects.toThrow(
        authError
      );
      expect(authorize).toHaveBeenCalledWith(sessionWithoutPerm, 'MANAGE_VENDORS');
    });

    it('should allow updating a vendor if user has permission', async () => {
      vi.mocked(authorize).mockReturnValue(true);
      await expect(updateVendor(vendorId, vendorData, session)).resolves.not.toThrow();
      expect(authorize).toHaveBeenCalledWith(session, 'MANAGE_VENDORS');
    });

    it('should prevent deleting a vendor if user lacks permission', async () => {
      const authError = new Error('Not authorized');
      const sessionWithoutPerm = mockUserSession([]);
      vi.mocked(authorize).mockImplementation(() => {
        throw authError;
      });
      await expect(deleteVendor(vendorId, sessionWithoutPerm)).rejects.toThrow(authError);
      expect(authorize).toHaveBeenCalledWith(sessionWithoutPerm, 'MANAGE_VENDORS');
    });

    it('should allow deleting a vendor if user has permission', async () => {
      vi.mocked(authorize).mockReturnValue(true);
      await expect(deleteVendor(vendorId, session)).resolves.not.toThrow();
      expect(authorize).toHaveBeenCalledWith(session, 'MANAGE_VENDORS');
    });
  });

  describe('getPOs', () => {
    beforeEach(() => {
      vi.mocked(prisma.purchaseOrder.findMany).mockResolvedValue([]);
      vi.mocked(prisma.purchaseOrder.count).mockResolvedValue(0);
      vi.mocked(prisma.$transaction).mockImplementation(async (promises: [Prisma.PrismaPromise<PurchaseOrder[]>, Prisma.PrismaPromise<number>]) => {
        const [findManyResult, countResult] = await Promise.all(promises);
        return [findManyResult, countResult];
      });
    });

    it('should filter by user involvement if user lacks READ_ALL_POS permission', async () => {
      const session = mockUserSession(['SOME_OTHER_PERMISSION']);
      await getPOs(session, {});
      expect(prisma.purchaseOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            AND: expect.arrayContaining([
              {
                OR: [
                  { preparedById: session.user.id },
                  { requestedById: session.user.id },
                  { reviewedById: session.user.id },
                  { approvedById: session.user.id },
                ],
              },
            ]),
          },
        })
      );
    });

    it('should not apply user-based filters if user has READ_ALL_POS permission', async () => {
      const session = mockUserSession(['READ_ALL_POS']);
      await getPOs(session, {});
      expect(prisma.purchaseOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            AND: [],
          },
        })
      );
    });
  });
});