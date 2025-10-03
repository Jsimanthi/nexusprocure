// src/app/api/analytics/spend-by-department/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth-config';
import { prisma } from '@/lib/prisma';
import { authorize } from '@/lib/auth-utils';
import { POStatus } from '@prisma/client';

/**
 * @swagger
 * /api/analytics/spend-by-department:
 *   get:
 *     summary: Get total spend by department
 *     description: >
 *       Calculates the total spend (sum of `grandTotal` from Purchase Orders)
 *       for each department. Only considers POs that are not in DRAFT, REJECTED, or CANCELLED status.
 *       Requires VIEW_ANALYTICS permission.
 *     tags:
 *       - Analytics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: An array of departments with their total spend.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                     example: "IT Department"
 *                   total:
 *                     type: number
 *                     example: 150000.75
 *       401:
 *         description: Unauthorized.
 *       403:
 *         description: Forbidden.
 */
export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    authorize(session, 'VIEW_ANALYTICS');

    const spendByDepartment = await prisma.purchaseOrder.groupBy({
      by: ['departmentId'],
      _sum: {
        grandTotal: true,
      },
      where: {
        departmentId: {
          not: null,
        },
        // Exclude orders that don't represent actual or potential spending
        status: {
          notIn: [POStatus.DRAFT, POStatus.REJECTED, POStatus.CANCELLED],
        },
      },
    });

    // Get department names for the IDs
    const departmentIds = spendByDepartment.map(d => d.departmentId!);
    const departments = await prisma.department.findMany({
      where: {
        id: {
          in: departmentIds,
        },
      },
      select: {
        id: true,
        name: true,
      },
    });

    const departmentMap = new Map(departments.map(d => [d.id, d.name]));

    const result = spendByDepartment.map(data => ({
      name: departmentMap.get(data.departmentId!) || 'Unknown Department',
      total: data._sum.grandTotal || 0,
    })).sort((a, b) => b.total - a.total); // Sort by total spend descending

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Not authorized')) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    console.error('Error fetching spend by department:', error);
    return NextResponse.json(
      { message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}