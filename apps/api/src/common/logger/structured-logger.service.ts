import { ConsoleLogger, Injectable } from '@nestjs/common';

@Injectable()
export class StructuredLoggerService extends ConsoleLogger {
  override log(message: unknown, context?: string) {
    this.emit('info', message, context);
  }

  override warn(message: unknown, context?: string) {
    this.emit('warn', message, context);
  }

  override error(message: unknown, stackOrContext?: string, context?: string) {
    this.emit('error', message, context ?? stackOrContext, stackOrContext);
  }

  private emit(level: string, message: unknown, context?: string, stack?: string) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      service: 'fieldsutra-api',
      context: context ?? 'Application',
      message,
      ...(stack ? { stack } : {}),
    };
    process.stdout.write(`${JSON.stringify(entry)}\n`);
  }
}
