import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCheckRequest, updateCRStatus } from './cr';
import { prisma } from './prisma';
import { CRStatus } from '@/types/cr';
import { Role } from '@/types/auth';
import { Session } from 'next-auth';

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
