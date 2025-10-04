// src/lib/iom.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getIOMs, createIOM, updateIOMStatus, deleteIOM } from './iom';
import { prisma } from './prisma';
import { Session } from 'next-auth';
import { Prisma, IOM, IOMStatus, ActionStatus } from '@prisma/client';
import { createIomSchema } from './schemas';
import { z } from 'zod';

import { logAudit, getAuditUser } from './audit';
import { authorize } from './auth-utils';

type CreateIomData = z.infer<typeof createIomSchema>;

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

const iomSelectClause = {
  id: true,
  iomNumber: true,
  pdfToken: true,
  title: true,
  from: true,
  to: true,
  subject: true,
  content: true,
  isUrgent: true,
  status: true,
  totalAmount: true,
  reviewerStatus: true,
  approverStatus: true,
  preparedById: true,
  requestedById: true,
  reviewedById: true,
  approvedById: true,
  departmentId: true,
  createdAt: true,
  updatedAt: true,
  items: true,
  preparedBy: { select: { name: true, email: true } },
  requestedBy: { select: { name: true, email: true } },
  reviewedBy: { select: { name: true, email: true } },
  approvedBy: { select: { name: true, email: true } },
  attachments: true,
  department: true,
};

const iomValidator = Prisma.validator<Prisma.IOMDefaultArgs>()({
  select: iomSelectClause,
});

type MockIOM = Prisma.IOMGetPayload<typeof iomValidator>;

const fullMockIom: MockIOM = {
    id: 'iom-123',
    iomNumber: 'IOM-2024-0001',
    pdfToken: 'mock-pdf-token',
    title: 'Mock IOM Title',
    from: 'Mock From',
    to: 'Mock To',
    subject: 'Mock Subject',
    content: 'Mock content',
    isUrgent: false,
    status: IOMStatus.PENDING_APPROVAL,
    totalAmount: 1000,
    reviewerStatus: ActionStatus.PENDING,
    approverStatus: ActionStatus.PENDING,
    preparedById: 'user-prepared-id',
    requestedById: 'user-requested-id',
    reviewedById: 'reviewer-id',
    approvedById: 'approver-id',
    departmentId: 'dept-123',
    createdAt: new Date(),
    updatedAt: new Date(),
    items: [],
    attachments: [],
    department: { id: 'dept-123', name: 'IT' , createdAt: new Date(), updatedAt: new Date()},
    preparedBy: { name: 'Test User', email: 'test@example.com' },
    requestedBy: { name: 'Test User', email: 'test@example.com' },
    reviewedBy: { name: 'Reviewer User', email: 'reviewer@example.com' },
    approvedBy: { name: 'Approver User', email: 'approver@example.com' },
};


describe('IOM Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAuditUser).mockReturnValue({ userId: 'mock-user-id', userName: 'Mock User' });
  });

  describe('createIOM', () => {
    it('should create an IOM and log the audit trail', async () => {
      const iomData: CreateIomData & { preparedById: string } = {
        title: 'Test IOM',
        from: 'Dept A',
        to: 'Dept B',
        subject: 'Test',
        preparedById: 'user-1',
        requestedById: 'user-1',
        reviewerId: 'user-2',
        approverId: 'user-3',
        items: []
      };
      const session = mockUserSession(['CREATE_IOM']);
      vi.mocked(authorize).mockReturnValue(true);

      vi.mocked(prisma.iOM.create).mockResolvedValue(fullMockIom);

      await createIOM(iomData, session);

      expect(authorize).toHaveBeenCalledWith(session, 'CREATE_IOM');
      expect(prisma.iOM.create).toHaveBeenCalled();
      expect(logAudit).toHaveBeenCalledWith("CREATE", expect.any(Object));
    });

    it('should retry creating an IOM if a unique constraint violation occurs', async () => {
      const iomData: CreateIomData & { preparedById: string } = {
        title: 'Test Retry IOM',
        from: 'Dept A',
        to: 'Dept B',
        subject: 'Test',
        preparedById: 'user-1',
        requestedById: 'user-1',
        reviewerId: 'user-2',
        approverId: 'user-3',
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
        .mockResolvedValue(fullMockIom);

      await createIOM(iomData, session);

      expect(prisma.iOM.create).toHaveBeenCalledTimes(2);
    });

    it('should correctly create an IOM when the items array is not provided (undefined)', async () => {
        const iomData = {
            title: 'Test IOM without items',
            from: 'Dept C',
            to: 'Dept D',
            subject: 'No Items Test',
            preparedById: 'user-2',
            requestedById: 'user-2',
            reviewerId: 'user-3',
            approverId: 'user-4',
        };
        const session = mockUserSession(['CREATE_IOM']);
        vi.mocked(authorize).mockReturnValue(true);

        const createdIomMock: MockIOM = {
            ...fullMockIom,
            id: 'new-iom-id-no-items',
            items: [],
        };
        vi.mocked(prisma.iOM.create).mockResolvedValue(createdIomMock);

        await createIOM(iomData, session);

        expect(authorize).toHaveBeenCalledWith(session, 'CREATE_IOM');

        expect(prisma.iOM.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    items: {
                        create: [],
                    },
                    totalAmount: 0,
                }),
            })
        );
        expect(logAudit).toHaveBeenCalledWith("CREATE", expect.any(Object));
    });
  });

  describe('updateIOMStatus', () => {
    const iomId = 'iom-123';
    const approverId = 'approver-id';
    const reviewerId = 'reviewer-id';
    const approverSession = mockUserSession(['APPROVE_IOM']);
    approverSession.user.id = approverId;
    const reviewerSession = mockUserSession(['REVIEW_IOM']);
    reviewerSession.user.id = reviewerId;

    const baseIom: MockIOM = {
        ...fullMockIom,
        id: iomId,
        status: IOMStatus.PENDING_APPROVAL,
        reviewerStatus: ActionStatus.PENDING,
        approverStatus: ActionStatus.PENDING,
        approvedById: approverId,
        reviewedById: reviewerId,
    };

    beforeEach(() => {
      vi.mocked(prisma.iOM.update).mockImplementation(async (args: { data: any; }) => {
        return {
          ...baseIom,
          ...args.data,
        } as MockIOM;
      });
    });

    it('should throw an error if user is not the designated reviewer or approver', async () => {
      const unrelatedUserSession = mockUserSession(['REVIEW_IOM', 'APPROVE_IOM']);
      unrelatedUserSession.user.id = 'unrelated-user';
      vi.mocked(prisma.iOM.findUnique).mockResolvedValue(baseIom);

      await expect(
        updateIOMStatus(iomId, "APPROVE", unrelatedUserSession)
      ).rejects.toThrow("Not authorized to perform this action on this IOM.");
    });

    it('should allow reviewer to approve and update reviewerStatus', async () => {
      vi.mocked(authorize).mockReturnValue(true);
      vi.mocked(prisma.iOM.findUnique).mockResolvedValue(baseIom);

      await updateIOMStatus(iomId, "APPROVE", reviewerSession);

      expect(authorize).toHaveBeenCalledWith(reviewerSession, 'REVIEW_IOM');
      expect(prisma.iOM.update).toHaveBeenCalledWith({
        where: { id: iomId },
        data: { reviewerStatus: "APPROVED" },
      });
    });

    it('should allow approver to approve and update approverStatus, leading to final APPROVAL', async () => {
      vi.mocked(authorize).mockReturnValue(true);
      const iomPendingManagerApproval = { ...baseIom, reviewerStatus: ActionStatus.APPROVED };
      vi.mocked(prisma.iOM.findUnique).mockResolvedValue(iomPendingManagerApproval);

      await updateIOMStatus(iomId, "APPROVE", approverSession);

      expect(authorize).toHaveBeenCalledWith(approverSession, 'APPROVE_IOM');
      expect(prisma.iOM.update).toHaveBeenCalledWith({
        where: { id: iomId },
        data: { approverStatus: "APPROVED" },
      });
      expect(prisma.iOM.update).toHaveBeenCalledWith({
        where: { id: iomId },
        data: { status: IOMStatus.APPROVED },
        select: iomSelectClause,
      });
    });

    it('should set final status to REJECTED if reviewer rejects', async () => {
      vi.mocked(authorize).mockReturnValue(true);
      vi.mocked(prisma.iOM.findUnique).mockResolvedValue(baseIom);

      await updateIOMStatus(iomId, "REJECT", reviewerSession);

      expect(authorize).toHaveBeenCalledWith(reviewerSession, 'REVIEW_IOM');
      expect(prisma.iOM.update).toHaveBeenCalledWith({
        where: { id: iomId },
        data: { status: IOMStatus.REJECTED },
        select: iomSelectClause,
      });
    });
  });

  describe('deleteIOM', () => {
    it('should delete an IOM if user has DELETE_IOM permission', async () => {
      const iomId = 'iom-to-delete';
      const session = mockUserSession(['DELETE_IOM']);
      vi.mocked(authorize).mockReturnValue(true);
      vi.mocked(prisma.iOM.findUnique).mockResolvedValue(fullMockIom);

      await deleteIOM(iomId, session);

      expect(authorize).toHaveBeenCalledWith(session, 'DELETE_IOM');
      expect(prisma.iOM.delete).toHaveBeenCalledWith({ where: { id: iomId } });
      expect(logAudit).toHaveBeenCalledWith("DELETE", expect.any(Object));
    });
  });
});