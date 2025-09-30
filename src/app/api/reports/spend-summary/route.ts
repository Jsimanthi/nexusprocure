import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth-config';
import { authorize } from '@/lib/auth-utils';
import { subMonths, startOfMonth, format } from 'date-fns';

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    authorize(session, 'VIEW_ANALYTICS');

    // 1. Get the date 12 months ago from the start of the current month
    const endDate = new Date();
    const startDate = startOfMonth(subMonths(endDate, 11));

    // 2. Fetch all approved PO items within the last 12 months
    const poItems = await prisma.pOItem.findMany({
      where: {
        po: {
          status: 'APPROVED',
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      },
      select: {
        totalPrice: true,
        category: true,
        po: {
          select: {
            createdAt: true,
          },
        },
      },
    });

    // 3. Process the data into a monthly summary by category
    const monthlySummary = poItems.reduce((acc, item) => {
      const month = format(new Date(item.po.createdAt), 'yyyy-MM');
      const category = item.category || 'Uncategorized';

      if (!acc[month]) {
        acc[month] = { month };
      }

      if (!acc[month][category]) {
        acc[month][category] = 0;
      }

      acc[month][category] += item.totalPrice;
      return acc;
    }, {});

    // 4. Get a distinct list of all categories present in the data
    const categories = [...new Set(poItems.map(item => item.category || 'Uncategorized'))];

    // 5. Convert the summary object to an array and fill in missing months/categories
    const allMonths = Array.from({ length: 12 }, (_, i) => {
        return format(subMonths(endDate, i), 'yyyy-MM');
    }).reverse();

    const formattedData = allMonths.map(monthStr => {
        const monthData = { month: format(new Date(`${monthStr}-01`), 'MMM yyyy') };
        categories.forEach(cat => {
            monthData[cat] = monthlySummary[monthStr]?.[cat] || 0;
        });
        return monthData;
    });

    return NextResponse.json({
      chartData: formattedData,
      categories,
    });

  } catch (error) {
    if (error instanceof Error && error.message.includes('Not authorized')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Error fetching spend summary report:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}