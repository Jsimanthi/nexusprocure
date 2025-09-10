// src/lib/cr.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCheckRequest, updateCRStatus } from './cr';
import { prisma } from './prisma';
import { CRStatus, CreateCrData, CheckRequest, PaymentMethod } from '@/types/cr';
import { Session } from 'next-auth';
import { Prisma, Role, POStatus } from '@prisma/client';

import { logAudit, getAuditUser } from './audit';

// Mock external dependencies
vi.mock('@/lib/prisma');
vi.mock('@/lib/email');
vi.mock('@/lib/notification');
vi.mock('@/lib/audit');

const mockUserSession = (role: Role): Session => ({
  user: { id: `user-${role.toLowerCase()}-id`, name: `${role} User`, role, email: `${role.toLowerCase()}@example.com` },
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
      const session = mockUserSession(Role.USER);
      vi.mocked(prisma.checkRequest.create).mockResolvedValue(mockCheckRequest);

      await createCheckRequest(crData, session);

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
      const session = mockUserSession(Role.USER);
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
      const session = mockUserSession(Role.USER);
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
      const session = mockUserSession(Role.USER);
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
    const userSession = mockUserSession(Role.USER);
    const managerSession = mockUserSession(Role.MANAGER);

    beforeEach(() => {
      const managerUser = { id: 'user-manager-id', name: 'Manager User', email: 'manager@example.com' };
      vi.mocked(prisma.checkRequest.findUnique).mockResolvedValue({
        ...mockCheckRequest,
        id: crId,
        status: CRStatus.DRAFT,
        preparedBy: managerUser,
        preparedById: managerUser.id,
      });
      vi.mocked(prisma.checkRequest.update).mockResolvedValue({
        ...mockCheckRequest,
        id: crId,
        status: CRStatus.APPROVED,
        preparedBy: managerUser,
        preparedById: managerUser.id,
      });
    });

    it('should throw an error if a USER tries to approve a CR', async () => {
      await expect(
        updateCRStatus(crId, CRStatus.APPROVED, userSession)
      ).rejects.toThrow('Not authorized to perform this action.');
      expect(logAudit).not.toHaveBeenCalled();
    });

    it('should allow a MANAGER to approve a CR and log the action', async () => {
      await updateCRStatus(crId, CRStatus.APPROVED, managerSession);

      expect(prisma.checkRequest.update).toHaveBeenCalled();
      expect(logAudit).toHaveBeenCalledWith("STATUS_CHANGE", expect.objectContaining({
        recordId: crId,
        changes: { from: CRStatus.DRAFT, to: CRStatus.APPROVED }
      }));
    });
  });
});