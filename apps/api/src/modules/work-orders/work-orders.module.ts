import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { PrismaWorkOrdersStore } from './prisma-work-orders.store';
import { ServiceRequestsController } from './service-requests.controller';
import { ServiceRequestsService } from './service-requests.service';
import { WorkOrdersController } from './work-orders.controller';
import { WorkOrdersService } from './work-orders.service';
import { WORK_ORDERS_STORE } from './work-orders.store';

@Module({
  imports: [IdentityModule],
  controllers: [ServiceRequestsController, WorkOrdersController],
  providers: [
    { provide: WORK_ORDERS_STORE, useClass: PrismaWorkOrdersStore },
    ServiceRequestsService,
    WorkOrdersService,
  ],
  exports: [WORK_ORDERS_STORE, ServiceRequestsService, WorkOrdersService],
})
export class WorkOrdersModule {}
