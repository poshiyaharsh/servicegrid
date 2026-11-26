import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { CRM_STORE } from './crm.store';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';
import { PrismaCrmStore } from './prisma-crm.store';

@Module({
  imports: [IdentityModule],
  controllers: [CustomersController, LeadsController],
  providers: [
    { provide: CRM_STORE, useClass: PrismaCrmStore },
    CustomersService,
    LeadsService,
  ],
  exports: [CRM_STORE, CustomersService, LeadsService],
})
export class CrmModule {}
