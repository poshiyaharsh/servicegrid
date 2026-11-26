import { Injectable } from '@nestjs/common';
import { loadConfig } from '@servicegrid/config';

@Injectable()
export class ErrorMonitorService {
  private readonly sentryDsn: string;

  constructor() {
    this.sentryDsn = loadConfig().SENTRY_DSN;
  }

  isConfigured(): boolean {
    return Boolean(this.sentryDsn);
  }

  captureException(error: unknown, metadata?: Record<string, unknown>): void {
    const payload = {
      timestamp: new Date().toISOString(),
      event: 'captured_exception',
      sentryConfigured: this.isConfigured(),
      error: error instanceof Error ? { name: error.name, message: error.message } : String(error),
      metadata,
    };
    process.stderr.write(`${JSON.stringify(payload)}\n`);
  }
}
