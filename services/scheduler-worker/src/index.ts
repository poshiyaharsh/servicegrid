import { loadConfig } from '@servicegrid/config';

export const SCHEDULER_QUEUE = 'fieldsutra-scheduler';

export function getSchedulerWorkerConfig() {
  const config = loadConfig();
  return {
    queueName: SCHEDULER_QUEUE,
    redisUrl: config.REDIS_URL,
  };
}
