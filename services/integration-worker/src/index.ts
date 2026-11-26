import { loadConfig } from '@servicegrid/config';
import { Worker, type Job } from 'bullmq';

export const INTEGRATION_QUEUE = 'fieldsutra-integrations';

export interface IntegrationJobData {
  tenantId: string;
  provider: string;
  eventType: string;
  payload: Record<string, unknown>;
}

export function getIntegrationWorkerConfig() {
  const config = loadConfig();
  return {
    queueName: INTEGRATION_QUEUE,
    redisUrl: config.REDIS_URL,
  };
}

export async function processIntegrationJob(job: Job<IntegrationJobData>) {
  if (!job.data?.tenantId || !job.data?.provider) {
    throw new Error('Integration job missing required tenantId or provider');
  }
  return {
    processed: true,
    jobId: job.id,
    tenantId: job.data.tenantId,
    provider: job.data.provider,
    eventType: job.data.eventType,
  };
}

export function startIntegrationWorker() {
  const { queueName, redisUrl } = getIntegrationWorkerConfig();
  const worker = new Worker<IntegrationJobData>(queueName, processIntegrationJob, {
    connection: { url: redisUrl },
    concurrency: 5,
  });
  return worker;
}

if (require.main === module) {
  const worker = startIntegrationWorker();
  const shutdown = async () => {
    await worker.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
