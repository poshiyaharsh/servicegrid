import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { PrismaSubscriptionsStore } from './prisma-subscriptions.store';
import { AdminController, SubscriptionsController } from './subscriptions.controllers';
import { SubscriptionsService } from './subscriptions.service';
import { SUBSCRIPTIONS_STORE } from './subscriptions.store';

@Module({
  imports: [IdentityModule],
  controllers: [SubscriptionsController, AdminController],
  providers: [
    { provide: SUBSCRIPTIONS_STORE, useClass: PrismaSubscriptionsStore },
    SubscriptionsService,
  ],
  exports: [SUBSCRIPTIONS_STORE, SubscriptionsService],
})
export class SubscriptionsModule {}
