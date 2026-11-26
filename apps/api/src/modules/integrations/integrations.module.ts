import { Module } from '@nestjs/common';
import { FinanceModule } from '../finance/finance.module';
import { IdentityModule } from '../identity/identity.module';
import {
  IntegrationsController,
  NotificationsController,
} from './integrations.controllers';
import { IntegrationsService } from './integrations.service';
import { INTEGRATIONS_STORE } from './integrations.store';
import { PrismaIntegrationsStore } from './prisma-integrations.store';

@Module({
  imports: [IdentityModule, FinanceModule],
  controllers: [IntegrationsController, NotificationsController],
  providers: [{ provide: INTEGRATIONS_STORE, useClass: PrismaIntegrationsStore }, IntegrationsService],
  exports: [INTEGRATIONS_STORE, IntegrationsService],
})
export class IntegrationsModule {}
