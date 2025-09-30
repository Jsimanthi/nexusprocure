import { prisma } from './prisma';
import { ReportType } from '@prisma/client';
import { sendEmail } from './email';
import Papa from 'papaparse';
import WeeklySummaryEmail from '@/components/emails/WeeklySummaryEmail';

export async function sendWeeklySpendSummary() {
  console.log('Starting to send weekly spend summaries...');

  const subscriptions = await prisma.reportSubscription.findMany({
    where: {
      reportType: ReportType.WEEKLY_SPEND_SUMMARY,
    },
    include: {
      user: true,
    },
  });

  if (subscriptions.length === 0) {
    console.log('No users subscribed to the weekly spend summary.');
    return { success: true, message: 'No subscriptions found.' };
  }

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const purchaseOrders = await prisma.purchaseOrder.findMany({
    where: {
      createdAt: {
        gte: oneWeekAgo,
      },
      status: {
        in: ['ORDERED', 'DELIVERED', 'COMPLETED'],
      },
    },
    include: {
      items: true,
      vendor: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (purchaseOrders.length === 0) {
    console.log('No purchase orders in the last week to report.');
    // Optionally, still send an email to subscribers saying there was no activity
    return { success: true, message: 'No purchase orders in the last week.' };
  }

  const dataToExport = purchaseOrders.flatMap(po =>
    po.items.map(item => ({
      'PO Number': po.poNumber,
      'PO Title': po.title,
      'PO Status': po.status,
      'Department': po.department,
      'Vendor Name': po.vendor?.name,
      'Created At': po.createdAt.toISOString().split('T')[0],
      'Item Name': item.itemName,
      'Item Category': item.category,
      'Item Quantity': item.quantity,
      'Item Unit Price': item.unitPrice,
      'Grand Total': po.grandTotal,
    }))
  );

  const csv = Papa.unparse(dataToExport);
  const csvBuffer = Buffer.from(csv, 'utf-8');

  const totalSpend = purchaseOrders.reduce((sum, po) => sum + po.grandTotal, 0);

  for (const subscription of subscriptions) {
    const { user } = subscription;
    console.log(`Sending summary to ${user.email}...`);

    await sendEmail({
      to: user.email,
      subject: 'Your Weekly Spend Summary',
      react: <WeeklySummaryEmail
        userName={user.name ?? 'User'}
        totalSpend={totalSpend}
        poCount={purchaseOrders.length}
        startDate={oneWeekAgo.toLocaleDateString()}
        endDate={new Date().toLocaleDateString()}
      />,
      attachments: [
        {
          filename: `weekly-spend-summary-${new Date().toISOString().split('T')[0]}.csv`,
          content: csvBuffer,
        },
      ],
    });
  }

  console.log(`Successfully sent summaries to ${subscriptions.length} users.`);
  return {
    success: true,
    message: `Successfully sent summaries to ${subscriptions.length} users.`,
  };
}