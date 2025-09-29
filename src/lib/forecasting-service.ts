import { prisma } from './prisma';

// Simple Moving Average forecasting model
function calculateMovingAverage(data: { date: Date; quantity: number }[], period: number) {
  if (data.length < period) {
    // Not enough data for the specified period, return average of available data
    const totalQuantity = data.reduce((sum, item) => sum + item.quantity, 0);
    return data.length > 0 ? totalQuantity / data.length : 0;
  }

  const recentData = data.slice(-period);
  const sum = recentData.reduce((acc, item) => acc + item.quantity, 0);
  return sum / period;
}

export async function getDemandForecast(itemName: string) {
  const historicalPOItems = await prisma.pOItem.findMany({
    where: {
      itemName: itemName,
      po: {
        status: { in: ['ORDERED', 'DELIVERED', 'COMPLETED'] },
      },
    },
    select: {
      quantity: true,
      po: {
        select: {
          createdAt: true,
        },
      },
    },
    orderBy: {
      po: {
        createdAt: 'asc',
      },
    },
  });

  // Aggregate by month to get monthly purchase quantities
  const monthlyData: { [key: string]: { date: Date, quantity: number } } = {};
  for (const item of historicalPOItems) {
    const month = item.po.createdAt.toISOString().slice(0, 7); // YYYY-MM
    if (!monthlyData[month]) {
      monthlyData[month] = {
        date: new Date(item.po.createdAt.getFullYear(), item.po.createdAt.getMonth(), 1),
        quantity: 0,
      };
    }
    monthlyData[month].quantity += item.quantity;
  }

  const historicalData = Object.values(monthlyData).sort((a, b) => a.date.getTime() - b.date.getTime());

  // Use a 3-month moving average for the forecast
  const forecast = calculateMovingAverage(historicalData, 3);

  return {
    historicalData: historicalData.map(d => ({ month: d.date.toISOString().slice(0, 7), quantity: d.quantity })),
    forecast: Math.round(forecast), // Return a whole number for the forecast
  };
}

// Function to get the most frequently purchased items to populate the dropdown
export async function getFrequentlyPurchasedItems(limit = 10) {
  const items = await prisma.pOItem.groupBy({
    by: ['itemName'],
    _sum: {
      quantity: true,
    },
    where: {
      po: {
        status: { in: ['ORDERED', 'DELIVERED', 'COMPLETED'] },
      },
    },
    orderBy: {
      _sum: {
        quantity: 'desc',
      },
    },
    take: limit,
  });

  return items.map(item => item.itemName);
}