import { loadConfig } from '@servicegrid/config';
import { Worker, type Job } from 'bullmq';

export const INVOICE_QUEUE = 'fieldsutra-invoices';

export interface InvoiceJobData {
  tenantId: string;
  invoiceId: string;
  action: 'generate_pdf' | 'send_invoice';
}

export function getInvoiceWorkerConfig() {
  const config = loadConfig();
  return {
    queueName: INVOICE_QUEUE,
    redisUrl: config.REDIS_URL,
  };
}

export async function processInvoiceJob(job: Job<InvoiceJobData>) {
  if (!job.data?.tenantId || !job.data?.invoiceId) {
    throw new Error('Invoice job missing required tenantId or invoiceId');
  }
  return {
    processed: true,
    jobId: job.id,
    tenantId: job.data.tenantId,
    invoiceId: job.data.invoiceId,
    action: job.data.action,
  };
}

export function startInvoiceWorker() {
  const { queueName, redisUrl } = getInvoiceWorkerConfig();
  const worker = new Worker<InvoiceJobData>(queueName, processInvoiceJob, {
    connection: { url: redisUrl },
    concurrency: 3,
  });
  return worker;
}

if (require.main === module) {
  const worker = startInvoiceWorker();
  const shutdown = async () => {
    await worker.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
