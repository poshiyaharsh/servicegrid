import { Module } from '@nestjs/common';
import { CrmModule } from '../crm/crm.module';
import { IdentityModule } from '../identity/identity.module';
import { WorkOrdersModule } from '../work-orders/work-orders.module';
import { SyncController } from './sync.controller';
import { PrismaSyncLogStore, SYNC_LOG_STORE, SyncService } from './sync.service';

@Module({
  imports: [IdentityModule, CrmModule, WorkOrdersModule],
  controllers: [SyncController],
  providers: [{ provide: SYNC_LOG_STORE, useClass: PrismaSyncLogStore }, SyncService],
  exports: [SyncService],
})
export class SyncModule {}
