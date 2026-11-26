import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  RequirePermissions,
  type AuthenticatedUser,
} from '../../common/security/auth.decorators';
import { JwtAuthGuard } from '../../common/security/jwt-auth.guard';
import { PermissionsGuard } from '../../common/security/permissions.guard';
import { WorkflowsService } from './workflows.service';
import type { WorkflowAction, WorkflowCondition } from './workflows.store';

@ApiTags('Workflows')
@Controller('workflows')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Get()
  @RequirePermissions('org:manage')
  async list(@CurrentUser() user: AuthenticatedUser) {
    return { success: true, data: await this.workflowsService.listDefinitions(user.tenantId) };
  }

  @Post()
  @RequirePermissions('org:manage')
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: {
      name: string;
      triggerEvent: string;
      conditions?: WorkflowCondition[];
      actions: WorkflowAction[];
      delaySeconds?: number;
      maxDepth?: number;
    },
  ) {
    return {
      success: true,
      data: await this.workflowsService.createDefinition(user.tenantId, body),
    };
  }

  @Post('trigger')
  @RequirePermissions('org:manage')
  async trigger(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { triggerEvent: string; payload: Record<string, unknown> },
  ) {
    return {
      success: true,
      data: await this.workflowsService.executeTrigger(user.tenantId, body),
    };
  }

  @Get('runs')
  @RequirePermissions('org:manage')
  async runs(
    @CurrentUser() user: AuthenticatedUser,
    @Query('correlationId') correlationId?: string,
  ) {
    return {
      success: true,
      data: await this.workflowsService.listRuns(user.tenantId, correlationId),
    };
  }
}
