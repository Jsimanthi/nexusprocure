// src/lib/iom.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createIOM, updateIOMStatus, deleteIOM } from './iom';
import { prisma } from './prisma';
import { IOMStatus } from '@/types/iom';
import { Session } from 'next-auth';
import { Prisma, Role } from '@prisma/client';

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

describe('IOM Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAuditUser).mockReturnValue({ userId: 'mock-user-id', userName: 'Mock User' });
  });

  describe('createIOM', () => {
    it('should create an IOM and log the audit trail', async () => {
      const iomData = {
        title: 'Test IOM',
        from: 'Dept A',
        to: 'Dept B',
        subject: 'Test',
        preparedById: 'user-1',
        requestedById: 'user-1',
        items: []
      };
      const session = mockUserSession(Role.USER);
      // @ts-expect-error - We're providing a partial mock object
      vi.mocked(prisma.iOM.create).mockResolvedValue({ id: 'new-iom-id', ...iomData });

      await createIOM(iomData, session);

      expect(prisma.iOM.create).toHaveBeenCalled();
      expect(logAudit).toHaveBeenCalledWith("CREATE", expect.any(Object));
    });

    it('should retry creating an IOM if a unique constraint violation occurs', async () => {
      const iomData = {
        title: 'Test Retry IOM',
        from: 'Dept A',
        to: 'Dept B',
        subject: 'Test',
        preparedById: 'user-1',
        requestedById: 'user-1',
        items: []
      };
      const session = mockUserSession(Role.USER);
      const uniqueConstraintError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        { code: 'P2002', clientVersion: 'test' }
      );

      vi.mocked(prisma.iOM.count).mockResolvedValue(0);
      vi.mocked(prisma.iOM.create)
        .mockRejectedValueOnce(uniqueConstraintError)
        // @ts-expect-error - We're providing a partial mock object
        .mockResolvedValue({ id: 'new-iom-id', ...iomData });

      await createIOM(iomData, session);

      expect(prisma.iOM.create).toHaveBeenCalledTimes(2);
    });
  });

  describe('updateIOMStatus', () => {
    const iomId = 'iom-123';
    const userSession = mockUserSession(Role.USER);
    const managerSession = mockUserSession(Role.MANAGER);
    const adminSession = mockUserSession(Role.ADMIN);

    beforeEach(() => {
      // @ts-expect-error - We're providing a partial mock object
      vi.mocked(prisma.iOM.findUnique).mockResolvedValue({
        id: iomId,
        preparedById: 'user-prepared-id',
        iomNumber: 'IOM-2024-0001',
        status: IOMStatus.DRAFT,
      });
      // @ts-expect-error - We're providing a partial mock object
      vi.mocked(prisma.iOM.update).mockResolvedValue({});
    });

    it('should throw an error if a USER tries to approve an IOM', async () => {
      await expect(
        updateIOMStatus(iomId, IOMStatus.APPROVED, userSession)
      ).rejects.toThrow('Not authorized to perform this action.');
      expect(logAudit).not.toHaveBeenCalled();
    });

    it('should allow a MANAGER to approve an IOM and log the action', async () => {
      await updateIOMStatus(iomId, IOMStatus.APPROVED, managerSession);

      expect(prisma.iOM.update).toHaveBeenCalled();
      expect(logAudit).toHaveBeenCalledWith("STATUS_CHANGE", expect.objectContaining({
        recordId: iomId,
        changes: { from: IOMStatus.DRAFT, to: IOMStatus.APPROVED }
      }));
    });

    it('should allow an ADMIN to approve an IOM', async () => {
      await updateIOMStatus(iomId, IOMStatus.APPROVED, adminSession);
      expect(logAudit).toHaveBeenCalled();
    });
  });

  describe('deleteIOM', () => {
    it('should delete an IOM and log the audit trail', async () => {
      const iomId = 'iom-to-delete';
      const session = mockUserSession(Role.MANAGER);
      // @ts-expect-error - We're providing a partial mock object
      vi.mocked(prisma.iOM.findUnique).mockResolvedValue({ id: iomId, title: 'IOM to Delete' });

      await deleteIOM(iomId, session);

      expect(prisma.iOM.delete).toHaveBeenCalledWith({ where: { id: iomId } });
      expect(logAudit).toHaveBeenCalledWith("DELETE", expect.any(Object));
    });
  });
});