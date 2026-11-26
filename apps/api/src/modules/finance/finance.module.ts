import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import {
  EstimatesController,
  ExpensesController,
  InvoicesController,
  PaymentsController,
} from './finance.controllers';
import { FinanceService } from './finance.service';
import { FINANCE_STORE } from './finance.store';
import { PrismaFinanceStore } from './prisma-finance.store';

@Module({
  imports: [IdentityModule],
  controllers: [EstimatesController, InvoicesController, PaymentsController, ExpensesController],
  providers: [{ provide: FINANCE_STORE, useClass: PrismaFinanceStore }, FinanceService],
  exports: [FINANCE_STORE, FinanceService],
})
export class FinanceModule {}
