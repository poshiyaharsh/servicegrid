import { loadConfig } from '@servicegrid/config';

export const NOTIFICATION_QUEUE = 'fieldsutra-notifications';

export function getNotificationWorkerConfig() {
  const config = loadConfig();
  return {
    queueName: NOTIFICATION_QUEUE,
    redisUrl: config.REDIS_URL,
  };
}
