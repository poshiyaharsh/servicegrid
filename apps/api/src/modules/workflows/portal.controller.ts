import { BadRequestException, Body, Controller, Get, Inject, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  RequirePermissions,
  type AuthenticatedUser,
} from '../../common/security/auth.decorators';
import { JwtAuthGuard } from '../../common/security/jwt-auth.guard';
import { PermissionsGuard } from '../../common/security/permissions.guard';
import { CRM_STORE, type CrmStore } from '../crm/crm.store';
import { FinanceService } from '../finance/finance.service';
import { ServiceRequestsService } from '../work-orders/service-requests.service';
import type { JobPriority } from '../work-orders/work-orders.store';
import { WORKFLOWS_STORE, type WorkflowsStore } from './workflows.store';

@ApiTags('Customer Portal')
@Controller('portal')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('portal:access')
@ApiBearerAuth()
export class PortalController {
  constructor(
    @Inject(CRM_STORE) private readonly crmStore: CrmStore,
    @Inject(WORKFLOWS_STORE) private readonly workflowsStore: WorkflowsStore,
    private readonly srService: ServiceRequestsService,
    private readonly financeService: FinanceService,
  ) {}

  @Get('overview')
  async overview(@CurrentUser() user: AuthenticatedUser, @Query('customerId') customerId: string) {
    if (!customerId) throw new BadRequestException('customerId query parameter is required');
    const profile = await this.crmStore.getCustomerProfile(user.tenantId, customerId);
    const invoices = await this.financeService.listOutstandingInvoices(user.tenantId);
    return {
      success: true,
      data: {
        customer: profile?.customer ?? null,
        assets: profile?.assets ?? [],
        serviceHistory: profile?.serviceHistory ?? [],
        outstandingInvoices: invoices.filter((i) => i.customerId === customerId),
      },
    };
  }

  @Post('requests')
  async createRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: {
      customerId: string;
      assetId?: string;
      categoryId?: string;
      title: string;
      description: string;
      priority?: JobPriority;
    },
  ) {
    return {
      success: true,
      data: await this.srService.createRequest(user.tenantId, user.userId, 'PORTAL', body),
    };
  }

  @Post('estimates/:id/approve')
  async approveEstimate(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return {
      success: true,
      data: await this.financeService.approveEstimate(user.tenantId, id, user.userId),
    };
  }

  @Get('invoices/:id')
  async getInvoice(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return { success: true, data: await this.financeService.getInvoice(user.tenantId, id) };
  }

  @Post('invoices/:id/upi-intent')
  async upiIntent(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return {
      success: true,
      data: await this.financeService.createSandboxUpiIntent(user.tenantId, id),
    };
  }

  @Post('feedback')
  async submitFeedback(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { customerId: string; workOrderId: string; rating: number; comment?: string },
  ) {
    if (body.rating < 1 || body.rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }
    return {
      success: true,
      data: await this.workflowsStore.createFeedback({
        tenantId: user.tenantId,
        customerId: body.customerId,
        workOrderId: body.workOrderId,
        rating: body.rating,
        comment: body.comment ?? null,
      }),
    };
  }
}
