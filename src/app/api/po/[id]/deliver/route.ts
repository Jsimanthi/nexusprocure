import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth-config';
import { authorize } from '@/lib/auth-utils';
import { z } from 'zod';

const deliverPoSchema = z.object({
  qualityScore: z.number().min(1).max(5),
  deliveryNotes: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const { id: poId } = context.params;

  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    authorize(session, 'DELIVER_PO');

    const body = await request.json();
    const validation = deliverPoSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.format() },
        { status: 400 }
      );
    }

    const { qualityScore, deliveryNotes } = validation.data;

    const updatedPo = await prisma.purchaseOrder.update({
      where: { id: poId },
      data: {
        status: 'DELIVERED',
        fulfilledAt: new Date(),
        qualityScore,
        deliveryNotes,
      },
    });

    return NextResponse.json(updatedPo);
  } catch (error) {
    console.error('Error marking PO as delivered:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}