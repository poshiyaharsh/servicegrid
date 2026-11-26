import { Module } from '@nestjs/common';
import { ErrorMonitorService } from './common/monitoring/error-monitor.service';
import { StructuredLoggerService } from './common/logger/structured-logger.service';
import { HealthModule } from './modules/health/health.module';
import { IdentityModule } from './modules/identity/identity.module';

@Module({
  imports: [HealthModule, IdentityModule],
  providers: [StructuredLoggerService, ErrorMonitorService],
})
export class AppModule {}
