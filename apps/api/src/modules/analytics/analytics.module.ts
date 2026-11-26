import { Module } from '@nestjs/common';
import { AmcModule } from '../amc/amc.module';
import { FinanceModule } from '../finance/finance.module';
import { IdentityModule } from '../identity/identity.module';
import { InventoryModule } from '../inventory/inventory.module';
import { WorkOrdersModule } from '../work-orders/work-orders.module';
import { AiIntelligenceService } from './ai.service';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

@Module({
  imports: [IdentityModule, WorkOrdersModule, FinanceModule, InventoryModule, AmcModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, AiIntelligenceService],
  exports: [AnalyticsService, AiIntelligenceService],
})
export class AnalyticsModule {}
