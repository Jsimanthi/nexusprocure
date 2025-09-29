import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-config';
import { authorize } from '@/lib/auth-utils';
import { getDemandForecast, getFrequentlyPurchasedItems } from '@/lib/forecasting-service';
import { z } from 'zod';

const forecastQuerySchema = z.object({
  itemName: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    authorize(session, 'VIEW_ANALYTICS');

    const { searchParams } = new URL(request.url);
    const validation = forecastQuerySchema.safeParse({
      itemName: searchParams.get('itemName') || undefined,
    });

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input', details: validation.error.format() }, { status: 400 });
    }

    const { itemName } = validation.data;

    if (itemName) {
      // If an item name is provided, get the forecast for it
      const forecastData = await getDemandForecast(itemName);
      return NextResponse.json(forecastData);
    } else {
      // If no item name is provided, return a list of popular items
      const popularItems = await getFrequentlyPurchasedItems(10);
      return NextResponse.json({ popularItems });
    }

  } catch (error) {
    console.error('Error in forecast API:', error);
    if (error instanceof Error && error.message.includes('Not authorized')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}