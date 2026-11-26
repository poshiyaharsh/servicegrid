import { loadConfig } from '@servicegrid/config';

export const INVOICE_QUEUE = 'fieldsutra-invoices';

export function getInvoiceWorkerConfig() {
  const config = loadConfig();
  return {
    queueName: INVOICE_QUEUE,
    redisUrl: config.REDIS_URL,
  };
}
