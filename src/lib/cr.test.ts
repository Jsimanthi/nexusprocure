// src/lib/cr.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCRs, createCheckRequest, updateCRStatus } from './cr';
import { prisma } from './prisma';
import { CRStatus, CreateCrData, CheckRequest, PaymentMethod } from '@/types/cr';
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

// A complete mock object to satisfy the Prisma CheckRequest type
const mockCheckRequest: CheckRequest = {
  id: 'new-cr-id',
  crNumber: 'CR-2024-001',
  poId: null,
  title: 'Test CR',
  status: CRStatus.DRAFT,
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

describe('Check Request (CR) Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAuditUser).mockReturnValue({ userId: 'mock-user-id', userName: 'Mock User' });
  });

  describe('createCheckRequest', () => {
    it('should create a CR and log the audit trail', async () => {
      const crData: CreateCrData = {
        title: 'Test CR',
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
      vi.mocked(prisma.checkRequest.create).mockResolvedValue(mockCheckRequest);

      await createCheckRequest(crData, session);

      expect(authorize).toHaveBeenCalledWith(session, 'CREATE_CR');

      expect(prisma.checkRequest.create).toHaveBeenCalled();
      expect(logAudit).toHaveBeenCalledWith("CREATE", expect.any(Object));
    });

    it('should retry creating a CR if a unique constraint violation occurs', async () => {
      const crData: CreateCrData = {
        title: 'Test Retry CR',
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

      vi.mocked(prisma.checkRequest.count).mockResolvedValue(0);
      vi.mocked(prisma.checkRequest.create)
        .mockRejectedValueOnce(uniqueConstraintError)
        .mockResolvedValue(mockCheckRequest);

      await createCheckRequest(crData, session);

      expect(prisma.checkRequest.create).toHaveBeenCalledTimes(2);
    });

    it('should throw an error if the CR total exceeds the PO total', async () => {
      const poId = 'po-123';
      const crData: CreateCrData = {
        title: 'Test CR',
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

      await expect(createCheckRequest(crData, session)).rejects.toThrow(
        'Check Request total (1500) cannot exceed Purchase Order total (1000).'
      );
    });

    it('should succeed if the CR total is less than or equal to the PO total', async () => {
      const poId = 'po-123';
      const crData: CreateCrData = {
        title: 'Test CR',
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
      vi.mocked(prisma.checkRequest.create).mockResolvedValue(mockCheckRequest);

      await expect(createCheckRequest(crData, session)).resolves.not.toThrow();
      expect(prisma.checkRequest.create).toHaveBeenCalled();
    });
  });

  describe('updateCRStatus', () => {
    const crId = 'cr-123';
    const session = mockUserSession();

    beforeEach(() => {
      const user = { id: 'user-id', name: 'Test User', email: 'test@example.com' };
      vi.mocked(prisma.checkRequest.findUnique).mockResolvedValue({
        ...mockCheckRequest,
        id: crId,
        status: CRStatus.DRAFT,
        preparedBy: user,
        preparedById: user.id,
      });
      vi.mocked(prisma.checkRequest.update).mockResolvedValue({
        ...mockCheckRequest,
        id: crId,
        status: CRStatus.APPROVED,
        preparedBy: user,
        preparedById: user.id,
      });
    });

    it('should throw an error if user does not have APPROVE_CR permission', async () => {
      const authError = new Error('Not authorized. Missing required permission: APPROVE_CR');
      vi.mocked(authorize).mockImplementation(() => {
        throw authError;
      });

      await expect(
        updateCRStatus(crId, CRStatus.APPROVED, session)
      ).rejects.toThrow(authError);

      expect(authorize).toHaveBeenCalledWith(session, 'APPROVE_CR');
      expect(prisma.checkRequest.update).not.toHaveBeenCalled();
    });

    it('should allow a user with APPROVE_CR permission to approve a CR', async () => {
      vi.mocked(authorize).mockResolvedValue(true);

      await updateCRStatus(crId, CRStatus.APPROVED, session);

      expect(authorize).toHaveBeenCalledWith(session, 'APPROVE_CR');
      expect(prisma.checkRequest.update).toHaveBeenCalled();
      expect(logAudit).toHaveBeenCalledWith("STATUS_CHANGE", expect.objectContaining({
        recordId: crId,
        changes: { from: CRStatus.DRAFT, to: CRStatus.APPROVED }
      }));
    });
  });

  describe('getCRs', () => {
    beforeEach(() => {
      vi.mocked(prisma.checkRequest.findMany).mockResolvedValue([]);
      vi.mocked(prisma.checkRequest.count).mockResolvedValue(0);
      vi.mocked(prisma.$transaction).mockImplementation(async (promises) => {
        const [findManyResult, countResult] = await Promise.all(promises);
        return [findManyResult, countResult];
      });
    });

    it('should filter by preparedById for USER role', async () => {
      const session = mockUserSession('USER');
      await getCRs(session, {});
      expect(prisma.checkRequest.findMany).toHaveBeenCalledWith(
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
      await getCRs(session, {});
      expect(prisma.checkRequest.findMany).toHaveBeenCalledWith(
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
      await getCRs(session, {});
      expect(prisma.checkRequest.findMany).toHaveBeenCalledWith(
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
      await getCRs(session, {});
      expect(prisma.checkRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            AND: [],
          },
        })
      );
    });
  });
});