import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { WorkOrderStatus } from '@servicegrid/types';
import {
  CurrentUser,
  RequirePermissions,
  type AuthenticatedUser,
} from '../../common/security/auth.decorators';
import { JwtAuthGuard } from '../../common/security/jwt-auth.guard';
import { PermissionsGuard } from '../../common/security/permissions.guard';
import type { AttachmentCategory, ChecklistItem, JobPriority } from './work-orders.store';
import { WorkOrdersService } from './work-orders.service';

@ApiTags('Work Orders')
@Controller('work-orders')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class WorkOrdersController {
  constructor(private readonly workOrdersService: WorkOrdersService) {}

  @Get()
  @RequirePermissions('work_orders:read')
  async list(@CurrentUser() user: AuthenticatedUser, @Query('status') status?: WorkOrderStatus) {
    return { success: true, data: await this.workOrdersService.list(user.tenantId, status) };
  }

  @Post()
  @RequirePermissions('work_orders:write')
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: {
      branchId?: string;
      customerId: string;
      assetId?: string;
      title: string;
      description?: string;
      priority?: JobPriority;
    },
  ) {
    return {
      success: true,
      data: await this.workOrdersService.create(user.tenantId, user.userId, body),
    };
  }

  @Get(':id')
  @RequirePermissions('work_orders:read')
  async getDetails(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return { success: true, data: await this.workOrdersService.getDetails(user.tenantId, id) };
  }

  @Post(':id/assignments')
  @RequirePermissions('work_orders:assign')
  async assign(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { assignments: Array<{ technicianUserId: string; isLead?: boolean }> },
  ) {
    return {
      success: true,
      data: await this.workOrdersService.assignTechnicians(
        user.tenantId,
        id,
        user.userId,
        body.assignments,
      ),
    };
  }

  @Post(':id/visits')
  @RequirePermissions('work_orders:write')
  async addVisit(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { scheduledStartAt?: string; scheduledEndAt?: string; notes?: string },
  ) {
    return { success: true, data: await this.workOrdersService.addVisit(user.tenantId, id, body) };
  }

  @Post(':id/status')
  @RequirePermissions('work_orders:execute')
  async transitionStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { status: WorkOrderStatus; reason?: string; technicianNotes?: string },
  ) {
    return {
      success: true,
      data: await this.workOrdersService.transitionStatus(user.tenantId, id, user.userId, body),
    };
  }

  @Post(':id/cancel')
  @RequirePermissions('work_orders:write')
  async cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { reason: string },
  ) {
    return {
      success: true,
      data: await this.workOrdersService.cancel(user.tenantId, id, user.userId, body.reason),
    };
  }

  @Post(':id/reopen')
  @RequirePermissions('work_orders:write')
  async reopen(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { reason: string },
  ) {
    return {
      success: true,
      data: await this.workOrdersService.reopen(user.tenantId, id, user.userId, body.reason),
    };
  }

  @Post(':id/checklists')
  @RequirePermissions('work_orders:write')
  async createChecklist(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { title: string; items: ChecklistItem[] },
  ) {
    return {
      success: true,
      data: await this.workOrdersService.createChecklist(user.tenantId, id, body),
    };
  }

  @Patch(':id/checklists/:checklistId')
  @RequirePermissions('work_orders:execute')
  async updateChecklist(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('checklistId') checklistId: string,
    @Body() body: { items: ChecklistItem[] },
  ) {
    return {
      success: true,
      data: await this.workOrdersService.updateChecklist(user.tenantId, id, checklistId, body.items),
    };
  }

  @Post(':id/attachments')
  @RequirePermissions('work_orders:execute')
  async addAttachment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body()
    body: { category: AttachmentCategory; fileName: string; mimeType: string; storageKey: string },
  ) {
    return {
      success: true,
      data: await this.workOrdersService.addAttachment(user.tenantId, id, user.userId, body),
    };
  }

  @Post(':id/report')
  @RequirePermissions('work_orders:execute')
  async approveAndReport(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body()
    body: { summary: string; workPerformed: string; approvedByName?: string; customerApproved: boolean },
  ) {
    return {
      success: true,
      data: await this.workOrdersService.approveAndReport(user.tenantId, id, body),
    };
  }
}
