import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  RequirePermissions,
  type AuthenticatedUser,
} from '../../common/security/auth.decorators';
import { JwtAuthGuard } from '../../common/security/jwt-auth.guard';
import { PermissionsGuard } from '../../common/security/permissions.guard';
import { AmcService } from './amc.service';
import type { VisitFrequency } from './amc.store';

@ApiTags('AMC')
@Controller('amc')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class AmcController {
  constructor(private readonly amcService: AmcService) {}

  @Get('contracts')
  @RequirePermissions('amc:read')
  async list(@CurrentUser() user: AuthenticatedUser) {
    return { success: true, data: await this.amcService.listContracts(user.tenantId) };
  }

  @Post('contracts')
  @RequirePermissions('amc:write')
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: {
      customerId: string;
      title: string;
      price: string;
      currency?: string;
      startDate: string;
      endDate: string;
      visitFrequency: VisitFrequency;
      coverageDetails?: Record<string, unknown>;
      coveredAssetIds?: string[];
    },
  ) {
    return { success: true, data: await this.amcService.createContract(user.tenantId, body) };
  }

  @Post('contracts/:id/generate-due-visits')
  @RequirePermissions('amc:write')
  async generateDueVisits(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { asOfDate?: string },
  ) {
    return {
      success: true,
      data: await this.amcService.generateDueVisits(
        user.tenantId,
        id,
        body?.asOfDate ? new Date(body.asOfDate) : new Date(),
      ),
    };
  }

  @Get('reminders/renewals')
  @RequirePermissions('amc:read')
  async reminders(@CurrentUser() user: AuthenticatedUser, @Query('days') days?: string) {
    return {
      success: true,
      data: await this.amcService.getRenewalReminders(
        user.tenantId,
        days ? Number(days) : 30,
      ),
    };
  }

  @Post('contracts/:id/renew')
  @RequirePermissions('amc:write')
  async renew(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { startDate: string; endDate: string; price?: string },
  ) {
    return { success: true, data: await this.amcService.renewContract(user.tenantId, id, body) };
  }

  @Post('contracts/:id/cancel')
  @RequirePermissions('amc:write')
  async cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { reason: string },
  ) {
    return {
      success: true,
      data: await this.amcService.cancelContract(user.tenantId, id, body.reason),
    };
  }

  @Get('contracts/:id/profitability')
  @RequirePermissions('amc:read')
  async profitability(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query('incurredCost') incurredCost = '0.00',
  ) {
    return {
      success: true,
      data: await this.amcService.getProfitability(user.tenantId, id, incurredCost),
    };
  }
}
