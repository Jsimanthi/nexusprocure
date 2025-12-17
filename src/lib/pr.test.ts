// src/lib/pr.test.ts
import { Permission, Role } from '@/types/auth'; // Import Enums
import { CreatePrData, PaymentMethod, PaymentRequest, PRStatus } from '@/types/pr';
import { POStatus, Prisma, PurchaseOrder } from '@prisma/client';
import { Session } from 'next-auth';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPaymentRequest, getPRs, updatePRStatus } from './pr';
import { prisma } from './prisma';

import { getAuditUser, logAudit } from './audit';

import { authorize } from './auth-utils';

// Mock external dependencies
vi.mock('@/lib/prisma');
vi.mock('@/lib/email');
vi.mock('@/lib/notification');
vi.mock('@/lib/audit');
vi.mock('@/lib/auth-utils');

const mockUserSession = (permissions: Permission[] = []): Session => ({
  user: {
    id: 'user-id',
    name: 'Test User',
    email: 'test@example.com',
    permissions,
    role: { id: 'role-1', name: Role.MANAGER },
  },
  expires: '2099-01-01T00:00:00.000Z',
});

// A complete mock object to satisfy the Prisma PaymentRequest type
const mockPaymentRequest: PaymentRequest = {
  id: 'new-pr-id',
  prNumber: 'PR-2024-001',
  poId: null,
  title: 'Test PR',
  status: PRStatus.DRAFT,
  totalAmount: 100,
  taxAmount: 10,
  grandTotal: 110,
  currency: 'USD',
  exchangeRate: 1,
  paymentTo: 'Vendor',
  paymentDate: new Date(),
  purpose: 'Testing',
  paymentMethod: PaymentMethod.CASH,
  bankAccount: null,
  referenceNumber: null,
  pdfToken: null,
  reviewerStatus: 'PENDING',
  approverStatus: 'PENDING',
  preparedById: 'user-1',
  requestedById: 'user-1',
  reviewedById: null,
  approvedById: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// A complete mock object for the Purchase Order
const mockPurchaseOrder: PurchaseOrder = {
  id: 'po-123',
  poNumber: 'PO-2024-001',
  iomId: null,
  title: 'Test PO',
  status: POStatus.DRAFT,
  totalAmount: 900,
  taxRate: 0,
  taxAmount: 0,
  grandTotal: 1000,
  currency: 'USD',
  exchangeRate: 1,
  vendorId: 'vendor-1',
  vendorName: 'Test Vendor',
  vendorContact: 'contact@example.com',
  preparedById: 'user-1',
  requestedById: 'user-1',
  reviewedById: null,
  approvedById: null,
  companyName: 'Test Company',
  companyAddress: '123 Main St',
  companyContact: 'company@example.com',
  vendorAddress: '456 Vendor St',
  expectedDeliveryDate: null,
  fulfilledAt: null,
  qualityScore: null,
  deliveryNotes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  pdfToken: null,
  reviewerStatus: 'PENDING',
  approverStatus: 'PENDING',
};

describe('Payment Request (PR) Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAuditUser).mockReturnValue({ userId: 'mock-user-id', userName: 'Mock User' });
  });

  describe('createPaymentRequest', () => {
    it('should create a PR and log the audit trail', async () => {
      const prData: CreatePrData = {
        title: 'Test PR',
        paymentTo: 'Vendor',
        paymentDate: new Date(),
        purpose: 'Testing',
        paymentMethod: PaymentMethod.CASH,
        totalAmount: 100,
        taxAmount: 10,
        grandTotal: 110,
        preparedById: 'user-1',
        requestedById: 'user-1',
        reviewerId: 'reviewer-1',
        approverId: 'approver-1'
      };

      const session = mockUserSession([Permission.CREATE_PR]);
      vi.mocked(authorize).mockReturnValue(true);
      vi.mocked(prisma.paymentRequest.create).mockResolvedValue(mockPaymentRequest);

      await createPaymentRequest(prData, session);

      expect(authorize).toHaveBeenCalledWith(session, Permission.CREATE_PR);

      expect(prisma.paymentRequest.create).toHaveBeenCalled();
      expect(logAudit).toHaveBeenCalledWith("CREATE", expect.any(Object));
    });

    it('should retry creating a PR if a unique constraint violation occurs', async () => {
      const prData: CreatePrData = {
        title: 'Test Retry PR',
        paymentTo: 'Vendor',
        paymentDate: new Date(),
        purpose: 'Testing',
        paymentMethod: PaymentMethod.CASH,
        totalAmount: 100,
        taxAmount: 10,
        grandTotal: 110,
        preparedById: 'user-1',
        requestedById: 'user-1',
        reviewerId: 'reviewer-1',
        approverId: 'approver-1'
      };

      const session = mockUserSession([Permission.CREATE_PR]);
      vi.mocked(authorize).mockReturnValue(true);
      const uniqueConstraintError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        { code: 'P2002', clientVersion: 'test', meta: {} }
      );

      vi.mocked(prisma.paymentRequest.count).mockResolvedValue(0);
      vi.mocked(prisma.paymentRequest.create)
        .mockRejectedValueOnce(uniqueConstraintError)
        .mockResolvedValue(mockPaymentRequest);

      await createPaymentRequest(prData, session);

      expect(prisma.paymentRequest.create).toHaveBeenCalledTimes(2);
    });

    it('should throw an error if the PR total exceeds the PO total', async () => {
      const poId = 'po-123';
      const prData: CreatePrData = {
        title: 'Test PR',
        poId,
        grandTotal: 1500,
        paymentTo: 'Vendor',
        paymentDate: new Date(),
        purpose: 'Testing',
        paymentMethod: PaymentMethod.CASH,
        totalAmount: 1400,
        taxAmount: 100,
        preparedById: 'user-1',
        requestedById: 'user-1',
        reviewerId: 'reviewer-1',
        approverId: 'approver-1'
      };

      const session = mockUserSession([Permission.CREATE_PR]);
      vi.mocked(authorize).mockReturnValue(true);
      vi.mocked(prisma.purchaseOrder.findUnique).mockResolvedValue({
        ...mockPurchaseOrder,
        id: 'po-123',
        grandTotal: 1000,
      });

      await expect(createPaymentRequest(prData, session)).rejects.toThrow(
        'Payment Request total (1500) cannot exceed Purchase Order total (1000).'
      );
    });

    it('should succeed if the PR total is less than or equal to the PO total', async () => {
      const poId = 'po-123';
      const prData: CreatePrData = {
        title: 'Test PR',
        poId,
        grandTotal: 900,
        paymentTo: 'Vendor',
        paymentDate: new Date(),
        purpose: 'Testing',
        paymentMethod: PaymentMethod.CASH,
        totalAmount: 850,
        taxAmount: 50,
        preparedById: 'user-1',
        requestedById: 'user-1',
        reviewerId: 'reviewer-1',
        approverId: 'approver-1'
      };

      const session = mockUserSession([Permission.CREATE_PR]);
      vi.mocked(authorize).mockReturnValue(true);
      vi.mocked(prisma.purchaseOrder.findUnique).mockResolvedValue({
        ...mockPurchaseOrder,
        id: 'po-123',
        grandTotal: 1000
      });
      vi.mocked(prisma.paymentRequest.create).mockResolvedValue(mockPaymentRequest);

      await expect(createPaymentRequest(prData, session)).resolves.not.toThrow();
      expect(prisma.paymentRequest.create).toHaveBeenCalled();
    });
  });

  describe('updatePRStatus', () => {
    const prId = 'pr-123';
    const approverId = 'approver-id';
    const reviewerId = 'reviewer-id';
    const approverSession = mockUserSession([Permission.APPROVE_PR]);
    approverSession.user!.id = approverId;
    const reviewerSession = mockUserSession([Permission.REVIEW_PR]);
    reviewerSession.user!.id = reviewerId;

    const basePr = {
      ...mockPaymentRequest,
      id: prId,
      status: PRStatus.PENDING_APPROVAL,
      reviewerStatus: "PENDING",
      approverStatus: "PENDING",
      approvedById: approverId,
      reviewedById: reviewerId,
      preparedBy: { id: 'user-id', name: 'Test User', email: 'test@example.com' },
    };

    beforeEach(() => {
      vi.mocked(prisma.paymentRequest.update).mockResolvedValue({
        ...basePr,
        po: null,
        attachments: [],
        preparedBy: { id: 'user-id', name: 'Test User', email: 'test@example.com' },
        requestedBy: { id: 'user-id', name: 'Test User', email: 'test@example.com' },
        reviewedBy: null,
        approvedBy: null,
      } as any);
    });

    it('should throw an error if user is not the designated reviewer or approver', async () => {
      const unrelatedUserSession = mockUserSession([Permission.REVIEW_PR, Permission.APPROVE_PR]);
      unrelatedUserSession.user!.id = 'unrelated-user';
      vi.mocked(prisma.paymentRequest.findUnique).mockResolvedValue(basePr as PaymentRequest);

      await expect(
        updatePRStatus(prId, "APPROVE", unrelatedUserSession)
      ).rejects.toThrow("Not authorized to perform this action on this PR.");
    });

    it('should allow reviewer to approve and update reviewerStatus', async () => {
      vi.mocked(authorize).mockReturnValue(true);
      vi.mocked(prisma.paymentRequest.findUnique).mockResolvedValue(basePr as PaymentRequest);

      vi.mocked(prisma.paymentRequest.update).mockResolvedValueOnce({ ...basePr, reviewerStatus: "APPROVED" } as PaymentRequest);
      vi.mocked(prisma.paymentRequest.update).mockResolvedValueOnce({ ...basePr, reviewerStatus: "APPROVED", status: PRStatus.PENDING_APPROVAL } as PaymentRequest);

      await updatePRStatus(prId, "APPROVE", reviewerSession);

      expect(authorize).toHaveBeenCalledWith(reviewerSession, Permission.REVIEW_PR);
      expect(prisma.paymentRequest.update).toHaveBeenCalledWith({
        where: { id: prId },
        data: { reviewerStatus: "APPROVED" },
      });
    });

    it('should allow approver to approve and update approverStatus, leading to final APPROVAL', async () => {
      vi.mocked(authorize).mockReturnValue(true);
      const prPendingManagerApproval = { ...basePr, reviewerStatus: 'APPROVED' };
      vi.mocked(prisma.paymentRequest.findUnique).mockResolvedValue(prPendingManagerApproval as PaymentRequest);

      vi.mocked(prisma.paymentRequest.update).mockResolvedValueOnce({ ...prPendingManagerApproval, approverStatus: 'APPROVED' } as PaymentRequest);
      vi.mocked(prisma.paymentRequest.update).mockResolvedValueOnce({ ...prPendingManagerApproval, approverStatus: 'APPROVED', status: PRStatus.APPROVED } as PaymentRequest);

      await updatePRStatus(prId, "APPROVE", approverSession);

      expect(authorize).toHaveBeenCalledWith(approverSession, Permission.APPROVE_PR);
      expect(prisma.paymentRequest.update).toHaveBeenCalledWith({
        where: { id: prId },
        data: { approverStatus: "APPROVED" },
      });
      expect(prisma.paymentRequest.update).toHaveBeenCalledWith({
        where: { id: prId },
        data: { status: PRStatus.APPROVED },
        include: expect.any(Object),
      });
    });

    it('should set final status to REJECTED if reviewer rejects', async () => {
      vi.mocked(authorize).mockReturnValue(true);
      vi.mocked(prisma.paymentRequest.findUnique).mockResolvedValue(basePr as PaymentRequest);

      vi.mocked(prisma.paymentRequest.update).mockResolvedValueOnce({ ...basePr, reviewerStatus: 'REJECTED' } as PaymentRequest);
      vi.mocked(prisma.paymentRequest.update).mockResolvedValueOnce({ ...basePr, reviewerStatus: 'REJECTED', status: PRStatus.REJECTED } as PaymentRequest);

      await updatePRStatus(prId, "REJECT", reviewerSession);

      expect(authorize).toHaveBeenCalledWith(reviewerSession, Permission.REVIEW_PR);
      expect(prisma.paymentRequest.update).toHaveBeenCalledWith({
        where: { id: prId },
        data: { status: PRStatus.REJECTED },
        include: expect.any(Object),
      });
    });
  });

  describe('getPRs', () => {
    beforeEach(() => {
      vi.mocked(prisma.paymentRequest.findMany).mockResolvedValue([]);
      vi.mocked(prisma.paymentRequest.count).mockResolvedValue(0);
      vi.mocked(prisma.$transaction).mockResolvedValue([[], 0]);
    });

    it('should filter by user involvement if user lacks READ_ALL_PRS permission', async () => {
      const session = mockUserSession([Permission.CREATE_PR]); // Arbitrary permission
      await getPRs(session, {});
      expect(prisma.paymentRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            AND: expect.arrayContaining([
              {
                OR: [
                  { preparedById: session.user!.id },
                  { requestedById: session.user!.id },
                  { reviewedById: session.user!.id },
                  { approvedById: session.user!.id },
                ],
              },
            ]),
          },
        })
      );
    });

    it('should not apply user-based filters if user has READ_ALL_PRS permission', async () => {
      const session = mockUserSession([Permission.READ_ALL_PRS]);
      await getPRs(session, {});
      expect(prisma.paymentRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            AND: [],
          },
        })
      );
    });
  });
});