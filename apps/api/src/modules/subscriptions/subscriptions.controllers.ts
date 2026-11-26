import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  RequirePermissions,
  type AuthenticatedUser,
} from '../../common/security/auth.decorators';
import { JwtAuthGuard } from '../../common/security/jwt-auth.guard';
import { PermissionsGuard } from '../../common/security/permissions.guard';
import { SubscriptionsService } from './subscriptions.service';
import type { BillingCycle } from './subscriptions.store';

@ApiTags('Subscriptions')
@Controller('subscriptions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class SubscriptionsController {
  constructor(private readonly subService: SubscriptionsService) {}

  @Get('plans')
  async listPlans() {
    return { success: true, data: await this.subService.listPlans() };
  }

  @Post('trial')
  @RequirePermissions('org:manage')
  async startTrial(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { planCode: string; trialDays?: number },
  ) {
    return {
      success: true,
      data: await this.subService.startTrial(user.tenantId, body.planCode, body.trialDays),
    };
  }

  @Post('activate')
  @RequirePermissions('org:manage')
  async activate(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { planCode: string; billingCycle?: BillingCycle },
  ) {
    return {
      success: true,
      data: await this.subService.activateOrRenew(user.tenantId, body.planCode, body.billingCycle),
    };
  }

  @Post('change-plan')
  @RequirePermissions('org:manage')
  async changePlan(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { targetPlanCode: string },
  ) {
    return {
      success: true,
      data: await this.subService.changePlan(user.tenantId, body.targetPlanCode),
    };
  }

  @Post('cancel')
  @RequirePermissions('org:manage')
  async cancel(@CurrentUser() user: AuthenticatedUser, @Body() body: { reason: string }) {
    return {
      success: true,
      data: await this.subService.cancelSubscription(user.tenantId, body.reason),
    };
  }

  @Get('billing-history')
  @RequirePermissions('finance:read')
  async billingHistory(@CurrentUser() user: AuthenticatedUser) {
    return { success: true, data: await this.subService.getBillingHistory(user.tenantId) };
  }
}

@ApiTags('Platform Super Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('platform:manage')
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly subService: SubscriptionsService) {}

  @Get('overview')
  async overview() {
    return { success: true, data: await this.subService.getSuperAdminOverview() };
  }

  @Post('plans')
  async upsertPlan(
    @Body()
    body: {
      code: string;
      name: string;
      monthlyPrice: string;
      annualPrice: string;
      currency?: string;
      maxTechnicians: number;
      maxJobsPerMonth: number;
      maxBranches: number;
    },
  ) {
    return { success: true, data: await this.subService.seedPlan(body) };
  }
}
