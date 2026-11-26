import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  RequirePermissions,
  type AuthenticatedUser,
} from '../../common/security/auth.decorators';
import { JwtAuthGuard } from '../../common/security/jwt-auth.guard';
import { PermissionsGuard } from '../../common/security/permissions.guard';
import { FinanceService } from './finance.service';
import type { BillingLineInput, PaymentRecord } from './finance.store';

@ApiTags('Estimates')
@Controller('estimates')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class EstimatesController {
  constructor(private readonly financeService: FinanceService) {}

  @Post()
  @RequirePermissions('finance:write')
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: {
      customerId: string;
      workOrderId?: string;
      currency?: string;
      isInterState?: boolean;
      items: BillingLineInput[];
    },
  ) {
    return {
      success: true,
      data: await this.financeService.createEstimate(user.tenantId, user.userId, body),
    };
  }

  @Post(':id/approve')
  @RequirePermissions('finance:write')
  async approve(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return {
      success: true,
      data: await this.financeService.approveEstimate(user.tenantId, id, user.userId),
    };
  }

  @Post(':id/convert-to-invoice')
  @RequirePermissions('finance:write')
  async convert(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { businessGstin?: string; customerGstin?: string; isInterState?: boolean },
  ) {
    return {
      success: true,
      data: await this.financeService.convertEstimateToInvoice(
        user.tenantId,
        id,
        user.userId,
        body,
      ),
    };
  }
}

@ApiTags('Invoices')
@Controller('invoices')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class InvoicesController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('outstanding')
  @RequirePermissions('finance:read')
  async outstanding(@CurrentUser() user: AuthenticatedUser) {
    return {
      success: true,
      data: await this.financeService.listOutstandingInvoices(user.tenantId),
    };
  }

  @Get('audit-logs')
  @RequirePermissions('finance:read')
  async auditLogs(@CurrentUser() user: AuthenticatedUser, @Query('entityId') entityId?: string) {
    return {
      success: true,
      data: await this.financeService.listAuditLogs(user.tenantId, entityId),
    };
  }

  @Post()
  @RequirePermissions('finance:write')
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: {
      customerId: string;
      workOrderId?: string;
      currency?: string;
      businessGstin?: string;
      customerGstin?: string;
      isInterState?: boolean;
      items: BillingLineInput[];
    },
  ) {
    return {
      success: true,
      data: await this.financeService.createInvoice(user.tenantId, user.userId, body),
    };
  }

  @Get(':id')
  @RequirePermissions('finance:read')
  async getById(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return { success: true, data: await this.financeService.getInvoice(user.tenantId, id) };
  }

  @Patch(':id')
  @RequirePermissions('finance:write')
  async updateDraft(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { customerGstin?: string; businessGstin?: string },
  ) {
    return {
      success: true,
      data: await this.financeService.updateDraftInvoice(user.tenantId, id, user.userId, body),
    };
  }

  @Post(':id/finalize')
  @RequirePermissions('finance:write')
  async finalize(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return {
      success: true,
      data: await this.financeService.finalizeInvoice(user.tenantId, id, user.userId),
    };
  }

  @Post(':id/credit-notes')
  @RequirePermissions('finance:write')
  async creditNote(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { amount: string; reason: string },
  ) {
    return {
      success: true,
      data: await this.financeService.issueCreditNote(user.tenantId, id, user.userId, body),
    };
  }

  @Post(':id/debit-notes')
  @RequirePermissions('finance:write')
  async debitNote(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { amount: string; reason: string },
  ) {
    return {
      success: true,
      data: await this.financeService.issueDebitNote(user.tenantId, id, user.userId, body),
    };
  }
}

@ApiTags('Payments')
@Controller('payments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class PaymentsController {
  constructor(private readonly financeService: FinanceService) {}

  @Post()
  @RequirePermissions('finance:write')
  async record(
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: {
      invoiceId: string;
      amount: string;
      method: PaymentRecord['method'];
      reference?: string;
    },
  ) {
    return {
      success: true,
      data: await this.financeService.recordPayment(user.tenantId, user.userId, body),
    };
  }

  @Post('upi-intent')
  @RequirePermissions('finance:read')
  async upiIntent(@CurrentUser() user: AuthenticatedUser, @Body() body: { invoiceId: string }) {
    return {
      success: true,
      data: await this.financeService.createSandboxUpiIntent(user.tenantId, body.invoiceId),
    };
  }

  @Post(':id/reconcile')
  @RequirePermissions('finance:write')
  async reconcile(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return {
      success: true,
      data: await this.financeService.reconcilePayment(user.tenantId, id, user.userId),
    };
  }

  @Post(':id/refund')
  @RequirePermissions('finance:write')
  async refund(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { amount: string },
  ) {
    return {
      success: true,
      data: await this.financeService.refundPayment(user.tenantId, id, body.amount, user.userId),
    };
  }
}

@ApiTags('Expenses')
@Controller('expenses')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class ExpensesController {
  constructor(private readonly financeService: FinanceService) {}

  @Get()
  @RequirePermissions('finance:read')
  async list(@CurrentUser() user: AuthenticatedUser) {
    return { success: true, data: await this.financeService.listExpenses(user.tenantId) };
  }

  @Post()
  @RequirePermissions('finance:write')
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: { workOrderId?: string; technicianId?: string; category: string; amount: string; currency?: string; notes?: string },
  ) {
    return { success: true, data: await this.financeService.createExpense(user.tenantId, body) };
  }

  @Get('commissions')
  @RequirePermissions('finance:read')
  async listCommissions(@CurrentUser() user: AuthenticatedUser) {
    return { success: true, data: await this.financeService.listCommissions(user.tenantId) };
  }

  @Post('commissions')
  @RequirePermissions('finance:write')
  async createCommission(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { workOrderId: string; technicianId: string; amount: string },
  ) {
    return {
      success: true,
      data: await this.financeService.createCommission(user.tenantId, body),
    };
  }
}
