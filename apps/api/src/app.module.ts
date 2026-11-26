import { Module } from '@nestjs/common';
import { ErrorMonitorService } from './common/monitoring/error-monitor.service';
import { StructuredLoggerService } from './common/logger/structured-logger.service';
import { CrmModule } from './modules/crm/crm.module';
import { HealthModule } from './modules/health/health.module';
import { IdentityModule } from './modules/identity/identity.module';
import { WorkOrdersModule } from './modules/work-orders/work-orders.module';

@Module({
  imports: [HealthModule, IdentityModule, CrmModule, WorkOrdersModule],
  providers: [StructuredLoggerService, ErrorMonitorService],
})
export class AppModule {}
