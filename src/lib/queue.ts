import { Queue, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import logger from './logger';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export const pdfQueue = new Queue('pdf-generation', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  },
});

export const analyticsQueue = new Queue('analytics-computation', {
  connection: redis,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 10000,
    },
  },
});

interface PDFJobData {
  url: string;
  type: 'iom' | 'po' | 'pr';
  id: string;
}

export async function addPDFJob(data: PDFJobData): Promise<Job> {
  logger.info(`Adding PDF job for ${data.type} ${data.id}`);
  return await pdfQueue.add('generate-pdf', data);
}

interface AnalyticsJobData {
  type: 'daily' | 'weekly' | 'monthly';
  date: string;
}

export async function addAnalyticsJob(data: AnalyticsJobData): Promise<Job> {
  logger.info(`Adding analytics job for ${data.type} on ${data.date}`);
  return await analyticsQueue.add('compute-analytics', data);
}

// Worker for PDF generation
new Worker('pdf-generation', async (job) => {
  const { url, type, id } = job.data as PDFJobData;
  logger.info(`Processing PDF job for ${type} ${id}`);

  try {
    // Import pdfService here to avoid circular dependency
    const { default: pdfService } = await import('./pdfService');
    const pdfBuffer = await pdfService.generatePDF(url);

    logger.info(`PDF generated successfully for ${type} ${id}`);
    return pdfBuffer;
  } catch (error) {
    logger.error(`Failed to generate PDF for ${type} ${id}: ${String(error)}`);
    throw error;
  }
}, { connection: redis });

// Worker for analytics
new Worker('analytics-computation', async (job) => {
  const { type, date } = job.data as AnalyticsJobData;
  logger.info(`Processing analytics job for ${type} on ${date}`);

  try {
    // Import analytics logic here
    const { computeAnalytics } = await import('./analytics');
    await computeAnalytics(type, date);

    logger.info(`Analytics computed successfully for ${type} on ${date}`);
  } catch (error) {
    logger.error(`Failed to compute analytics for ${type} on ${date}: ${String(error)}`);
    throw error;
  }
}, { connection: redis });

const queueExports = { pdfQueue, analyticsQueue, addPDFJob, addAnalyticsJob };
export default queueExports;