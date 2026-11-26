import { Module } from '@nestjs/common';
import { ErrorMonitorService } from './common/monitoring/error-monitor.service';
import { StructuredLoggerService } from './common/logger/structured-logger.service';
import { AmcModule } from './modules/amc/amc.module';
import { CrmModule } from './modules/crm/crm.module';
import { DispatchModule } from './modules/dispatch/dispatch.module';
import { FinanceModule } from './modules/finance/finance.module';
import { HealthModule } from './modules/health/health.module';
import { IdentityModule } from './modules/identity/identity.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { SyncModule } from './modules/sync/sync.module';
import { WorkOrdersModule } from './modules/work-orders/work-orders.module';

@Module({
  imports: [
    HealthModule,
    IdentityModule,
    CrmModule,
    WorkOrdersModule,
    SyncModule,
    DispatchModule,
    InventoryModule,
    FinanceModule,
    AmcModule,
  ],
  providers: [StructuredLoggerService, ErrorMonitorService],
})
export class AppModule {}
