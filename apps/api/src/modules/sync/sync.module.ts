import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { WorkOrdersModule } from '../work-orders/work-orders.module';
import { SyncController } from './sync.controller';
import { PrismaSyncLogStore, SYNC_LOG_STORE, SyncService } from './sync.service';

@Module({
  imports: [IdentityModule, WorkOrdersModule],
  controllers: [SyncController],
  providers: [{ provide: SYNC_LOG_STORE, useClass: PrismaSyncLogStore }, SyncService],
  exports: [SyncService],
})
export class SyncModule {}
