import { Body, Controller, Get, Inject, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  RequirePermissions,
  type AuthenticatedUser,
} from '../../common/security/auth.decorators';
import { JwtAuthGuard } from '../../common/security/jwt-auth.guard';
import { PermissionsGuard } from '../../common/security/permissions.guard';
import { ServiceRequestsService } from './service-requests.service';
import type { JobPriority } from './work-orders.store';

@ApiTags('Service Requests')
@Controller('service-requests')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class ServiceRequestsController {
  constructor(@Inject(ServiceRequestsService) private readonly srService: ServiceRequestsService) {}

  @Get('categories')
  @RequirePermissions('work_orders:read')
  async listCategories(@CurrentUser() user: AuthenticatedUser) {
    return { success: true, data: await this.srService.listCategories(user.tenantId) };
  }

  @Post('categories')
  @RequirePermissions('work_orders:write')
  async createCategory(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { name: string; code: string; defaultSlaHours?: number },
  ) {
    return { success: true, data: await this.srService.createCategory(user.tenantId, body) };
  }

  @Get()
  @RequirePermissions('work_orders:read')
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status?: string,
    @Query('priority') priority?: JobPriority,
    @Query('search') search?: string,
  ) {
    return {
      success: true,
      data: await this.srService.listRequests(user.tenantId, { status, priority, search }),
    };
  }

  @Post()
  @RequirePermissions('work_orders:write')
  async createManual(
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: {
      branchId?: string;
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
      data: await this.srService.createRequest(user.tenantId, user.userId, 'MANUAL', body),
    };
  }

  @Post('portal')
  @RequirePermissions('portal:access')
  async createFromPortal(
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

  @Post(':id/convert')
  @RequirePermissions('work_orders:write')
  async convert(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return {
      success: true,
      data: await this.srService.convertToWorkOrder(user.tenantId, id, user.userId),
    };
  }
}
