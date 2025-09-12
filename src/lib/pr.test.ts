// src/lib/cr.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getPRs, createPaymentRequest, updatePRStatus } from './pr';
import { prisma } from './prisma';
import { PRStatus, CreatePrData, PaymentRequest, PaymentMethod } from '@/types/pr';
import { Session } from 'next-auth';
import { Prisma, Role, POStatus } from '@prisma/client';

import { logAudit, getAuditUser } from './audit';

import { authorize } from './auth-utils';

// Mock external dependencies
vi.mock('@/lib/prisma');
vi.mock('@/lib/email');
vi.mock('@/lib/notification');
vi.mock('@/lib/audit');
vi.mock('@/lib/auth-utils');

const mockUserSession = (roleName = 'USER'): Session => ({
  user: {
    id: 'user-id',
    name: 'Test User',
    email: 'test@example.com',
    role: { id: 'role-id', name: roleName },
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
  preparedById: 'user-1',
  requestedById: 'user-1',
  reviewedById: null,
  approvedById: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// A complete mock object for the Purchase Order
const mockPurchaseOrder = {
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
  notes: null,
  vendorId: 'vendor-1',
  vendorName: 'Test Vendor',
  vendorContact: 'contact@example.com',
  preparedById: 'user-1',
  requestedById: 'user-1',
  reviewedById: null,
  approvedById: null,
  companyId: 'company-1',
  companyName: 'Test Company',
  companyAddress: '123 Main St',
  companyContact: 'company@example.com',
  vendorAddress: '456 Vendor St',
  createdAt: new Date(),
  updatedAt: new Date(),
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
        requestedById: 'user-1'
      };
      const session = mockUserSession();
      vi.mocked(authorize).mockResolvedValue(true);
      vi.mocked(prisma.paymentRequest.create).mockResolvedValue(mockPaymentRequest);

      await createPaymentRequest(prData, session);

      expect(authorize).toHaveBeenCalledWith(session, 'CREATE_PR');

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
        requestedById: 'user-1'
      };
      const session = mockUserSession();
      vi.mocked(authorize).mockResolvedValue(true);
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
        requestedById: 'user-1'
      };
      const session = mockUserSession();
      vi.mocked(authorize).mockResolvedValue(true);
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
        requestedById: 'user-1'
      };
      const session = mockUserSession();
      vi.mocked(authorize).mockResolvedValue(true);
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
    const session = mockUserSession();

    beforeEach(() => {
      const user = { id: 'user-id', name: 'Test User', email: 'test@example.com' };
      vi.mocked(prisma.paymentRequest.findUnique).mockResolvedValue({
        ...mockPaymentRequest,
        id: prId,
        status: PRStatus.DRAFT,
        preparedBy: user,
        preparedById: user.id,
      });
      vi.mocked(prisma.paymentRequest.update).mockResolvedValue({
        ...mockPaymentRequest,
        id: prId,
        status: PRStatus.APPROVED,
        preparedBy: user,
        preparedById: user.id,
      });
    });

    it('should throw an error if user does not have APPROVE_PR permission', async () => {
      const authError = new Error('Not authorized. Missing required permission: APPROVE_PR');
      vi.mocked(authorize).mockImplementation(() => {
        throw authError;
      });

      await expect(
        updatePRStatus(prId, PRStatus.APPROVED, session)
      ).rejects.toThrow(authError);

      expect(authorize).toHaveBeenCalledWith(session, 'APPROVE_PR');
      expect(prisma.paymentRequest.update).not.toHaveBeenCalled();
    });

    it('should allow a user with APPROVE_PR permission to approve a PR', async () => {
      vi.mocked(authorize).mockResolvedValue(true);
      vi.mocked(prisma.paymentRequest.findUnique).mockResolvedValue({
        ...mockPaymentRequest,
        id: prId,
        status: PRStatus.PENDING_APPROVAL,
        preparedBy: { id: 'user-id', name: 'Test User', email: 'test@example.com' },
      });

      await updatePRStatus(prId, PRStatus.APPROVED, session);

      expect(authorize).toHaveBeenCalledWith(session, 'APPROVE_PR');
      expect(prisma.paymentRequest.update).toHaveBeenCalled();
      expect(logAudit).toHaveBeenCalledWith("UPDATE", expect.objectContaining({
        recordId: prId,
        changes: {
          from: { status: PRStatus.PENDING_APPROVAL },
          to: { status: PRStatus.APPROVED, approverId: undefined }
        }
      }));
    });

    it('should move to PENDING_APPROVAL when reviewer submits for approval', async () => {
      vi.mocked(authorize).mockResolvedValue(true);
      const approverId = 'manager-id';
      await updatePRStatus(prId, PRStatus.PENDING_APPROVAL, session, approverId);

      expect(authorize).toHaveBeenCalledWith(session, 'UPDATE_PR');
      expect(prisma.paymentRequest.update).toHaveBeenCalledWith(expect.objectContaining({
        data: {
          status: PRStatus.PENDING_APPROVAL,
          approvedById: approverId
        }
      }));
    });
  });

  describe('getPRs', () => {
    beforeEach(() => {
      vi.mocked(prisma.paymentRequest.findMany).mockResolvedValue([]);
      vi.mocked(prisma.paymentRequest.count).mockResolvedValue(0);
      vi.mocked(prisma.$transaction).mockImplementation(async (promises) => {
        const [findManyResult, countResult] = await Promise.all(promises);
        return [findManyResult, countResult];
      });
    });

    it('should filter by preparedById for USER role', async () => {
      const session = mockUserSession('USER');
      await getPRs(session, {});
      expect(prisma.paymentRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            AND: expect.arrayContaining([
              expect.objectContaining({ preparedById: session.user.id }),
            ]),
          },
        })
      );
    });

    it('should filter by reviewedById for REVIEWER role', async () => {
      const session = mockUserSession('REVIEWER');
      await getPRs(session, {});
      expect(prisma.paymentRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            AND: expect.arrayContaining([
              { OR: [{ reviewedById: session.user.id }, { preparedById: session.user.id }] },
            ]),
          },
        })
      );
    });

    it('should filter by approvedById for MANAGER role', async () => {
      const session = mockUserSession('MANAGER');
      await getPRs(session, {});
      expect(prisma.paymentRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            AND: expect.arrayContaining([
              { OR: [{ approvedById: session.user.id }, { preparedById: session.user.id }] },
            ]),
          },
        })
      );
    });

    it('should not apply any user-based filters for ADMIN role', async () => {
      const session = mockUserSession('ADMIN');
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