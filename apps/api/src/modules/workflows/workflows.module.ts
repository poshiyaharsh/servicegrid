import { Module } from '@nestjs/common';
import { CrmModule } from '../crm/crm.module';
import { FinanceModule } from '../finance/finance.module';
import { IdentityModule } from '../identity/identity.module';
import { WorkOrdersModule } from '../work-orders/work-orders.module';
import { PortalController } from './portal.controller';
import { PrismaWorkflowsStore } from './prisma-workflows.store';
import { WorkflowsController } from './workflows.controller';
import { WorkflowsService } from './workflows.service';
import { WORKFLOWS_STORE } from './workflows.store';

@Module({
  imports: [IdentityModule, CrmModule, WorkOrdersModule, FinanceModule],
  controllers: [WorkflowsController, PortalController],
  providers: [{ provide: WORKFLOWS_STORE, useClass: PrismaWorkflowsStore }, WorkflowsService],
  exports: [WORKFLOWS_STORE, WorkflowsService],
})
export class WorkflowsModule {}
