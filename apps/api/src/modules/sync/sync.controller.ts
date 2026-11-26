import { Body, Controller, Get, Inject, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  RequirePermissions,
  type AuthenticatedUser,
} from '../../common/security/auth.decorators';
import { JwtAuthGuard } from '../../common/security/jwt-auth.guard';
import { PermissionsGuard } from '../../common/security/permissions.guard';
import { SyncService, type IncomingAttachmentUpload, type IncomingSyncOperation } from './sync.service';

@ApiTags('Mobile Sync')
@Controller('sync')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class SyncController {
  constructor(@Inject(SyncService) private readonly syncService: SyncService) {}

  @Get('assigned-jobs')
  @RequirePermissions('work_orders:read')
  async getAssignedJobs(@CurrentUser() user: AuthenticatedUser) {
    return {
      success: true,
      data: await this.syncService.getAssignedJobs(user.tenantId, user.userId, user.roles),
    };
  }

  @Post('operations')
  @RequirePermissions('work_orders:execute')
  async processBatch(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { operations: IncomingSyncOperation[] },
  ) {
    return {
      success: true,
      data: await this.syncService.processBatch(
        user.tenantId,
        user.userId,
        body.operations,
        user.roles,
      ),
    };
  }

  @Post('attachments')
  @RequirePermissions('work_orders:execute')
  async uploadAttachment(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: IncomingAttachmentUpload,
  ) {
    return {
      success: true,
      data: await this.syncService.registerAttachment(user.tenantId, user.userId, body),
    };
  }
}
