import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCheckRequest, updateCRStatus } from './cr';
import { prisma } from './prisma';
import { CRStatus } from '@/types/cr';
import { Session } from 'next-auth';
import { Prisma, Role } from '@prisma/client';

import { logAudit, getAuditUser } from './audit';

// Mock external dependencies
vi.mock('@/lib/prisma');
vi.mock('@/lib/email');
vi.mock('@/lib/notification');
vi.mock('@/lib/audit');

const mockUserSession = (role: Role): Session => ({
  user: { id: `user-${role.toLowerCase()}-id`, name: `${role} User`, role },
  expires: '2099-01-01T00:00:00.000Z',
});

describe('Check Request (CR) Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // @ts-ignore
    vi.mocked(getAuditUser).mockReturnValue({ userId: 'mock-user-id', userName: 'Mock User' });
  });

  describe('createCheckRequest', () => {
    it('should create a CR and log the audit trail', async () => {
      const crData = { title: 'Test CR', paymentTo: 'Vendor', paymentDate: new Date(), purpose: 'Testing', preparedById: 'user-1' };
      const session = mockUserSession(Role.USER);
      // @ts-ignore
      prisma.checkRequest.create.mockResolvedValue({ id: 'new-cr-id', ...crData });

      await createCheckRequest(crData, session);

      expect(prisma.checkRequest.create).toHaveBeenCalled();
      expect(logAudit).toHaveBeenCalledWith("CREATE", expect.any(Object));
    });

    it('should retry creating a CR if a unique constraint violation occurs', async () => {
      const crData = { title: 'Test Retry CR', paymentTo: 'Vendor', paymentDate: new Date(), purpose: 'Testing', preparedById: 'user-1' };
      const session = mockUserSession(Role.USER);
      const uniqueConstraintError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        { code: 'P2002', clientVersion: 'test' }
      );

      // @ts-ignore
      prisma.checkRequest.count.mockResolvedValue(0);
      // @ts-ignore
      prisma.checkRequest.create
        .mockRejectedValueOnce(uniqueConstraintError)
        .mockResolvedValue({ id: 'new-cr-id', ...crData });

      await createCheckRequest(crData, session);

      expect(prisma.checkRequest.create).toHaveBeenCalledTimes(2);
    });

    it('should throw an error if the CR total exceeds the PO total', async () => {
      const poId = 'po-123';
      const crData = {
        title: 'Test CR',
        poId,
        grandTotal: 1500,
        paymentTo: 'Vendor',
        paymentDate: new Date(),
        purpose: 'Testing',
        preparedById: 'user-1'
      };
      const session = mockUserSession(Role.USER);
      // @ts-ignore
      prisma.purchaseOrder.findUnique.mockResolvedValue({ grandTotal: 1000 });

      await expect(createCheckRequest(crData, session)).rejects.toThrow(
        'Check Request total (1500) cannot exceed Purchase Order total (1000).'
      );
    });

    it('should succeed if the CR total is less than or equal to the PO total', async () => {
      const poId = 'po-123';
      const crData = {
        title: 'Test CR',
        poId,
        grandTotal: 900,
        paymentTo: 'Vendor',
        paymentDate: new Date(),
        purpose: 'Testing',
        preparedById: 'user-1'
      };
      const session = mockUserSession(Role.USER);
      // @ts-ignore
      prisma.purchaseOrder.findUnique.mockResolvedValue({ grandTotal: 1000 });
      // @ts-ignore
      prisma.checkRequest.create.mockResolvedValue({ id: 'new-cr-id', ...crData });

      await expect(createCheckRequest(crData, session)).resolves.not.toThrow();
      expect(prisma.checkRequest.create).toHaveBeenCalled();
    });
  });

  describe('updateCRStatus', () => {
    const crId = 'cr-123';
    const userSession = mockUserSession(Role.USER);
    const managerSession = mockUserSession(Role.MANAGER);

    beforeEach(() => {
      // @ts-ignore
      prisma.checkRequest.findUnique.mockResolvedValue({
        id: crId,
        preparedById: 'user-prepared-id',
        crNumber: 'CR-2024-0001',
        status: CRStatus.DRAFT,
        preparedBy: { name: 'Test User', email: 'test@example.com' },
      });
      // @ts-ignore
      prisma.checkRequest.update.mockResolvedValue({});
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
