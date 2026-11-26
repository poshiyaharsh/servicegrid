import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { WorkOrdersModule } from '../work-orders/work-orders.module';
import { AmcController } from './amc.controller';
import { AmcService } from './amc.service';
import { AMC_STORE } from './amc.store';
import { PrismaAmcStore } from './prisma-amc.store';

@Module({
  imports: [IdentityModule, WorkOrdersModule],
  controllers: [AmcController],
  providers: [{ provide: AMC_STORE, useClass: PrismaAmcStore }, AmcService],
  exports: [AMC_STORE, AmcService],
})
export class AmcModule {}
