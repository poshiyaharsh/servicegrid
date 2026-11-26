import { loadConfig } from '@servicegrid/config';
import { Worker, type Job } from 'bullmq';

export const NOTIFICATION_QUEUE = 'fieldsutra-notifications';

export interface NotificationJobData {
  tenantId: string;
  channel: 'whatsapp' | 'email' | 'sms';
  recipient: string;
  templateKey: string;
  variables?: Record<string, string>;
}

export function getNotificationWorkerConfig() {
  const config = loadConfig();
  return {
    queueName: NOTIFICATION_QUEUE,
    redisUrl: config.REDIS_URL,
  };
}

export async function processNotificationJob(job: Job<NotificationJobData>) {
  if (!job.data?.tenantId || !job.data?.recipient) {
    throw new Error('Notification job missing required tenantId or recipient');
  }
  return {
    processed: true,
    jobId: job.id,
    tenantId: job.data.tenantId,
    channel: job.data.channel,
    templateKey: job.data.templateKey,
  };
}

export function startNotificationWorker() {
  const { queueName, redisUrl } = getNotificationWorkerConfig();
  const worker = new Worker<NotificationJobData>(queueName, processNotificationJob, {
    connection: { url: redisUrl },
    concurrency: 5,
  });
  return worker;
}

if (require.main === module) {
  const worker = startNotificationWorker();
  const shutdown = async () => {
    await worker.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
