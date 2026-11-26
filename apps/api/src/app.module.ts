import { Module } from '@nestjs/common';
import { ErrorMonitorService } from './common/monitoring/error-monitor.service';
import { StructuredLoggerService } from './common/logger/structured-logger.service';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [HealthModule],
  providers: [StructuredLoggerService, ErrorMonitorService],
})
export class AppModule {}
