// src/lib/iom.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getIOMs, createIOM, updateIOMStatus, deleteIOM } from './iom';
import { prisma } from './prisma';
import { IOMStatus } from '@/types/iom';
import { Session } from 'next-auth';
import { Prisma } from '@prisma/client';

import { logAudit, getAuditUser } from './audit';

import { authorize } from './auth-utils';

// Mock external dependencies
vi.mock('@/lib/prisma');
vi.mock('@/lib/email');
vi.mock('@/lib/notification');
vi.mock('@/lib/audit');
vi.mock('@/lib/auth-utils');

const mockUserSession = (permissions: string[] = []): Session => ({
  user: {
    id: 'user-id',
    name: 'Test User',
    email: 'test@example.com',
    permissions,
  },
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
      const session = mockUserSession(['CREATE_IOM']);
      vi.mocked(authorize).mockReturnValue(true);
      // @ts-expect-error - We're providing a partial mock object
      vi.mocked(prisma.iOM.create).mockResolvedValue({ id: 'new-iom-id', ...iomData });

      await createIOM(iomData, session);

      expect(authorize).toHaveBeenCalledWith(session, 'CREATE_IOM');

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
      const session = mockUserSession(['CREATE_IOM']);
      vi.mocked(authorize).mockReturnValue(true);
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
    const session = mockUserSession(['APPROVE_IOM', 'REVIEW_IOM']);

    beforeEach(() => {
      const user = { id: 'user-id', name: 'Test User', email: 'test@example.com' };
      // @ts-expect-error - We're providing a partial mock object
      vi.mocked(prisma.iOM.findUnique).mockResolvedValue({
        id: iomId,
        preparedById: 'user-prepared-id',
        iomNumber: 'IOM-2024-0001',
        status: IOMStatus.DRAFT,
        preparedBy: user,
      });
      // @ts-expect-error - We're providing a partial mock object
      vi.mocked(prisma.iOM.update).mockResolvedValue({});
    });

    it('should throw an error if user lacks APPROVE_IOM permission', async () => {
      const authError = new Error('Not authorized');
      vi.mocked(authorize).mockImplementation(() => {
        throw authError;
      });
      await expect(
        updateIOMStatus(iomId, IOMStatus.APPROVED, session)
      ).rejects.toThrow(authError);
      expect(authorize).toHaveBeenCalledWith(session, 'APPROVE_IOM');
    });

    it('should allow a user with APPROVE_IOM permission to approve', async () => {
      vi.mocked(authorize).mockReturnValue(true);
      // Set initial state to PENDING_APPROVAL for this test
      vi.mocked(prisma.iOM.findUnique).mockResolvedValue({
        id: iomId,
        preparedById: 'user-prepared-id',
        iomNumber: 'IOM-2024-0001',
        status: IOMStatus.PENDING_APPROVAL,
        preparedBy: { id: 'user-id', name: 'Test User', email: 'test@example.com' },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      await updateIOMStatus(iomId, IOMStatus.APPROVED, session);

      expect(authorize).toHaveBeenCalledWith(session, 'APPROVE_IOM');
      expect(prisma.iOM.update).toHaveBeenCalled();
      expect(logAudit).toHaveBeenCalledWith("UPDATE", expect.objectContaining({
        recordId: iomId,
        changes: {
          from: { status: IOMStatus.PENDING_APPROVAL },
          to: { status: IOMStatus.APPROVED, approverId: undefined }
        }
      }));
    });

    it('should move to PENDING_APPROVAL when reviewer submits for approval', async () => {
      vi.mocked(authorize).mockReturnValue(true);
      const approverId = 'manager-id';
      await updateIOMStatus(iomId, IOMStatus.PENDING_APPROVAL, session, approverId);

      expect(authorize).toHaveBeenCalledWith(session, 'REVIEW_IOM');
      expect(prisma.iOM.update).toHaveBeenCalledWith(expect.objectContaining({
        data: {
          status: IOMStatus.PENDING_APPROVAL,
          approvedById: approverId
        }
      }));
      expect(logAudit).toHaveBeenCalledWith("UPDATE", expect.objectContaining({
        recordId: iomId,
        changes: {
          from: { status: IOMStatus.DRAFT },
          to: { status: IOMStatus.PENDING_APPROVAL, approverId }
        }
      }));
    });
  });

  describe('deleteIOM', () => {
    it('should delete an IOM if user has DELETE_IOM permission', async () => {
      const iomId = 'iom-to-delete';
      const session = mockUserSession(['DELETE_IOM']);
      vi.mocked(authorize).mockReturnValue(true);
      // @ts-expect-error - We're providing a partial mock object
      vi.mocked(prisma.iOM.findUnique).mockResolvedValue({ id: iomId, title: 'IOM to Delete' });

      await deleteIOM(iomId, session);

      expect(authorize).toHaveBeenCalledWith(session, 'DELETE_IOM');
      expect(prisma.iOM.delete).toHaveBeenCalledWith({ where: { id: iomId } });
      expect(logAudit).toHaveBeenCalledWith("DELETE", expect.any(Object));
    });
  });

  describe('getIOMs', () => {
    beforeEach(() => {
      vi.mocked(prisma.iOM.findMany).mockResolvedValue([]);
      vi.mocked(prisma.iOM.count).mockResolvedValue(0);
      vi.mocked(prisma.$transaction).mockImplementation(async (promises) => {
        const [findManyResult, countResult] = await Promise.all(promises);
        return [findManyResult, countResult];
      });
    });

    it('should filter by user involvement if user lacks READ_ALL_IOMS permission', async () => {
      const session = mockUserSession(['SOME_OTHER_PERMISSION']);
      await getIOMs({ session });
      expect(prisma.iOM.findMany).toHaveBeenCalledWith(
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

    it('should not apply user-based filters if user has READ_ALL_IOMS permission', async () => {
      const session = mockUserSession(['READ_ALL_IOMS']);
      await getIOMs({ session });
      expect(prisma.iOM.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            AND: [],
          },
        })
      );
    });
  });
});