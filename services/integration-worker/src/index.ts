import { loadConfig } from '@servicegrid/config';

export const INTEGRATION_QUEUE = 'fieldsutra-integrations';

export function getIntegrationWorkerConfig() {
  const config = loadConfig();
  return {
    queueName: INTEGRATION_QUEUE,
    redisUrl: config.REDIS_URL,
  };
}
