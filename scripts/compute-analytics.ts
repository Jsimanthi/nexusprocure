import { scheduleDailyAnalytics, scheduleWeeklyAnalytics, scheduleMonthlyAnalytics } from '../src/lib/analytics';
import logger from '../src/lib/logger';

async function main() {
  const args = process.argv.slice(2);
  const type = args[0] as 'daily' | 'weekly' | 'monthly';

  if (!type || !['daily', 'weekly', 'monthly'].includes(type)) {
    console.error('Usage: npm run compute-analytics <daily|weekly|monthly>');
    process.exit(1);
  }

  try {
    logger.info(`Starting ${type} analytics computation`);

    switch (type) {
      case 'daily':
        await scheduleDailyAnalytics();
        break;
      case 'weekly':
        await scheduleWeeklyAnalytics();
        break;
      case 'monthly':
        await scheduleMonthlyAnalytics();
        break;
    }

    logger.info(`${type} analytics computation completed`);
  } catch (error) {
    logger.error(`Failed to compute ${type} analytics: ${error}`);
    process.exit(1);
  }
}

main();