// src/lib/iom.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getIOMs, createIOM, updateIOMStatus, deleteIOM } from './iom';
import { prisma } from './prisma';
import { IOM, IOMStatus } from '@/types/iom';
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
    role: { id: 'role-1', name: 'User' },
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
        reviewerId: 'reviewer-1',
        approverId: 'approver-1',
        items: [],
        isUrgent: false
      };
      const session = mockUserSession(['CREATE_IOM']);
      vi.mocked(authorize).mockReturnValue(true);

      vi.mocked(prisma.iOM.create).mockResolvedValue({
        id: 'new-iom-id',
        ...iomData,
        isUrgent: false,
        iomNumber: 'IOM-2024-0001',
        pdfToken: 'pdf-token',
        totalAmount: 0,
        reviewerStatus: 'PENDING',
        approverStatus: 'PENDING',
        status: IOMStatus.DRAFT,
        createdAt: new Date(),
        updatedAt: new Date(),
        content: null,
        reviewedById: 'reviewer-1',
        approvedById: 'approver-1'
      } as IOM);

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
        reviewerId: 'reviewer-1',
        approverId: 'approver-1',
        items: [],
        isUrgent: false
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

        .mockResolvedValue({ id: 'new-iom-id', ...iomData, isUrgent: false } as unknown as IOM);

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
        // 'items' property is intentionally omitted
      };
      const session = mockUserSession(['CREATE_IOM']);
      vi.mocked(authorize).mockReturnValue(true);

      const createdIomMock = {
        id: 'new-iom-id-no-items',
        ...iomData,
        items: [],
        isUrgent: false,
        iomNumber: 'IOM-2024-0002',
        pdfToken: 'pdf-token-2',
        totalAmount: 0,
        reviewerStatus: 'PENDING',
        approverStatus: 'PENDING',
        status: IOMStatus.DRAFT,
        createdAt: new Date(),
        updatedAt: new Date(),
        content: null,
        reviewedById: null,
        approvedById: null
      } as IOM;
      vi.mocked(prisma.iOM.create).mockResolvedValue(createdIomMock);

      // We need to cast because the base type expects `items`
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await createIOM(iomData as any, session);

      expect(authorize).toHaveBeenCalledWith(session, 'CREATE_IOM');

      // Check that prisma.create was called with an empty array for items
      expect(prisma.iOM.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            items: {
              create: [], // This is the crucial check
            },
            totalAmount: 0, // And this one
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
    approverSession.user!.id = approverId;
    const reviewerSession = mockUserSession(['REVIEW_IOM']);
    reviewerSession.user!.id = reviewerId;

    const baseIom = {
      id: iomId,
      title: 'Test IOM',
      from: 'Dept A',
      to: 'Dept B',
      subject: 'Test Subject',
      preparedById: 'user-prepared-id',
      requestedById: 'user-prepared-id',
      iomNumber: 'IOM-2024-0001',
      status: IOMStatus.PENDING_APPROVAL,
      reviewerStatus: "PENDING",
      approverStatus: "PENDING",
      approvedById: approverId,
      reviewedById: reviewerId,
      preparedBy: { id: 'user-id', name: 'Test User', email: 'test@example.com' },
      isUrgent: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      pdfToken: null,
      content: null,
      totalAmount: 0,
      items: [],
    };

    beforeEach(() => {
      // Mock the final update call that sets the overall status
      vi.mocked(prisma.iOM.update).mockResolvedValue({
        ...baseIom,
        items: [],
        preparedBy: { id: 'user-id', name: 'Test User', email: 'test@example.com' },
        requestedBy: { id: 'user-id', name: 'Test User', email: 'test@example.com' },
        reviewedBy: undefined,
        approvedBy: undefined,
      } as IOM);
    });

    it('should throw an error if user is not the designated reviewer or approver', async () => {
      const unrelatedUserSession = mockUserSession(['REVIEW_IOM', 'APPROVE_IOM']);
      unrelatedUserSession.user!.id = 'unrelated-user';
      vi.mocked(prisma.iOM.findUnique).mockResolvedValue(baseIom as IOM);

      await expect(
        updateIOMStatus(iomId, "APPROVE", unrelatedUserSession)
      ).rejects.toThrow("Not authorized to perform this action on this IOM.");
    });

    it('should allow reviewer to approve and update reviewerStatus', async () => {
      vi.mocked(authorize).mockReturnValue(true);
      vi.mocked(prisma.iOM.findUnique).mockResolvedValue(baseIom as IOM);

      // This is the first update call for the sub-status
      vi.mocked(prisma.iOM.update).mockResolvedValueOnce({ ...baseIom, reviewerStatus: "APPROVED" } as IOM);
      // This is the second, final update call
      vi.mocked(prisma.iOM.update).mockResolvedValueOnce({ ...baseIom, reviewerStatus: "APPROVED", status: IOMStatus.PENDING_APPROVAL } as IOM);


      await updateIOMStatus(iomId, "APPROVE", reviewerSession);

      expect(authorize).toHaveBeenCalledWith(reviewerSession, 'REVIEW_IOM');
      // Check that the first update sets the reviewerStatus
      expect(prisma.iOM.update).toHaveBeenCalledWith({
        where: { id: iomId },
        data: { reviewerStatus: "APPROVED" },
      });
    });

    it('should allow approver to approve and update approverStatus, leading to final APPROVAL', async () => {
      vi.mocked(authorize).mockReturnValue(true);
      // For this test, let's assume the reviewer has already approved.
      const iomPendingManagerApproval = { ...baseIom, reviewerStatus: 'APPROVED' };
      vi.mocked(prisma.iOM.findUnique).mockResolvedValue(iomPendingManagerApproval as IOM);

      // Mock the sub-status update
      vi.mocked(prisma.iOM.update).mockResolvedValueOnce({ ...iomPendingManagerApproval, approverStatus: 'APPROVED' } as IOM);
      // Mock the final status update
      vi.mocked(prisma.iOM.update).mockResolvedValueOnce({ ...iomPendingManagerApproval, approverStatus: 'APPROVED', status: IOMStatus.APPROVED } as IOM);


      await updateIOMStatus(iomId, "APPROVE", approverSession);

      expect(authorize).toHaveBeenCalledWith(approverSession, 'APPROVE_IOM');
      // Check sub-status update
      expect(prisma.iOM.update).toHaveBeenCalledWith({
        where: { id: iomId },
        data: { approverStatus: "APPROVED" },
      });
      // Check final status update
      expect(prisma.iOM.update).toHaveBeenCalledWith({
        where: { id: iomId },
        data: { status: IOMStatus.APPROVED },
        include: expect.any(Object),
      });
    });

    it('should set final status to REJECTED if reviewer rejects', async () => {
      vi.mocked(authorize).mockReturnValue(true);
      vi.mocked(prisma.iOM.findUnique).mockResolvedValue(baseIom as IOM);

      vi.mocked(prisma.iOM.update).mockResolvedValueOnce({ ...baseIom, reviewerStatus: 'REJECTED' } as IOM);
      vi.mocked(prisma.iOM.update).mockResolvedValueOnce({ ...baseIom, reviewerStatus: 'REJECTED', status: IOMStatus.REJECTED } as IOM);

      await updateIOMStatus(iomId, "REJECT", reviewerSession);

      expect(authorize).toHaveBeenCalledWith(reviewerSession, 'REVIEW_IOM');
      // Check final status update
      expect(prisma.iOM.update).toHaveBeenCalledWith({
        where: { id: iomId },
        data: { status: IOMStatus.REJECTED },
        include: expect.any(Object),
      });
    });
  });

  describe('deleteIOM', () => {
    it('should delete an IOM if user has DELETE_IOM permission', async () => {
      const iomId = 'iom-to-delete';
      const session = mockUserSession(['DELETE_IOM']);
      vi.mocked(authorize).mockReturnValue(true);

      vi.mocked(prisma.iOM.findUnique).mockResolvedValue({
        id: iomId,
        title: 'IOM to Delete',
        from: 'Dept A',
        to: 'Dept B',
        subject: 'Test Subject',
        preparedById: 'user-prepared-id',
        requestedById: 'user-prepared-id',
        iomNumber: 'IOM-2024-0001',
        status: IOMStatus.DRAFT,
        reviewerStatus: 'PENDING',
        approverStatus: 'PENDING',
        approvedById: null,
        reviewedById: null,
        isUrgent: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        pdfToken: null,
        content: null,
        totalAmount: 0,
        items: [],
      } as IOM);

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
      vi.mocked(prisma.$transaction).mockResolvedValue([[], 0]);
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