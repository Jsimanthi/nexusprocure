import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth-config';
import { authorize } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { logAudit, getAuditUser } from '@/lib/audit';
import { triggerPusherEvent } from '@/lib/pusher';
import { PRStatus, POStatus, IOMStatus } from '@prisma/client';

import { NextRequest } from 'next/server';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    authorize(session, 'PROCESS_PAYMENT_REQUEST');

    const { id: prId } = await context.params;

    // Use a transaction to ensure all updates succeed or fail together
    const result = await prisma.$transaction(async (tx) => {
      const pr = await tx.paymentRequest.findUnique({
        where: { id: prId },
        include: { po: { select: { id: true, iomId: true } } },
      });

      if (!pr) {
        throw new Error('Payment Request not found.');
      }

      if (pr.status !== 'APPROVED') {
        throw new Error('Only APPROVED Payment Requests can be processed.');
      }

      const auditUser = getAuditUser(session);

      // 1. Update Payment Request status to PROCESSED
      const updatedPr = await tx.paymentRequest.update({
        where: { id: prId },
        data: { status: PRStatus.PROCESSED },
      });
      await logAudit("UPDATE", {
        model: "PaymentRequest",
        recordId: prId,
        userId: auditUser.userId,
        userName: auditUser.userName,
        changes: { from: { status: pr.status }, to: { status: PRStatus.PROCESSED } },
      });

      let updatedPo, updatedIom;

      // 2. If there's a linked PO, update its status to COMPLETED
      if (pr.po?.id) {
        const po = await tx.purchaseOrder.findUnique({ where: { id: pr.po.id } });
        if (po) {
            updatedPo = await tx.purchaseOrder.update({
                where: { id: pr.po.id },
                data: { status: POStatus.COMPLETED },
            });
            await logAudit("UPDATE", {
                model: "PurchaseOrder",
                recordId: pr.po.id,
                userId: auditUser.userId,
                userName: auditUser.userName,
                changes: { from: { status: po.status }, to: { status: POStatus.COMPLETED } },
            });
        }
      }

      // 3. If there's a linked IOM, update its status to COMPLETED
      if (pr.po?.iomId) {
        const iom = await tx.iOM.findUnique({ where: { id: pr.po.iomId } });
        if (iom) {
            updatedIom = await tx.iOM.update({
                where: { id: pr.po.iomId },
                data: { status: IOMStatus.COMPLETED },
            });
            await logAudit("UPDATE", {
                model: "IOM",
                recordId: pr.po.iomId,
                userId: auditUser.userId,
                userName: auditUser.userName,
                changes: { from: { status: iom.status }, to: { status: IOMStatus.COMPLETED } },
            });
        }
      }

      return { updatedPr, updatedPo, updatedIom };
    });

    // Trigger real-time update
    await triggerPusherEvent('dashboard-channel', 'dashboard-update', {});

    return NextResponse.json(result.updatedPr);

  } catch (error) {
    console.error("Error processing Payment Request:", error);
    if (error instanceof Error && error.message.includes('Not authorized')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof Error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}