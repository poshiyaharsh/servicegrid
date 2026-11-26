import { loadConfig } from '@servicegrid/config';
import { Worker, type Job } from 'bullmq';

export const SCHEDULER_QUEUE = 'fieldsutra-scheduler';

export interface SchedulerJobData {
  tenantId: string;
  contractId: string;
  scheduledDate: string;
}

export function getSchedulerWorkerConfig() {
  const config = loadConfig();
  return {
    queueName: SCHEDULER_QUEUE,
    redisUrl: config.REDIS_URL,
  };
}

export async function processSchedulerJob(job: Job<SchedulerJobData>) {
  if (!job.data?.tenantId || !job.data?.contractId) {
    throw new Error('Scheduler job missing required tenantId or contractId');
  }
  return {
    processed: true,
    jobId: job.id,
    tenantId: job.data.tenantId,
    contractId: job.data.contractId,
    scheduledDate: job.data.scheduledDate,
  };
}

export function startSchedulerWorker() {
  const { queueName, redisUrl } = getSchedulerWorkerConfig();
  const worker = new Worker<SchedulerJobData>(queueName, processSchedulerJob, {
    connection: { url: redisUrl },
    concurrency: 2,
  });
  return worker;
}

if (require.main === module) {
  const worker = startSchedulerWorker();
  const shutdown = async () => {
    await worker.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
