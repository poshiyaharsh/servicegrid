import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  RequirePermissions,
  type AuthenticatedUser,
} from '../../common/security/auth.decorators';
import { JwtAuthGuard } from '../../common/security/jwt-auth.guard';
import { PermissionsGuard } from '../../common/security/permissions.guard';
import type { RouteStop } from './dispatch.engine';
import { DispatchService } from './dispatch.service';

@ApiTags('Dispatch')
@Controller('dispatch')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class DispatchController {
  constructor(private readonly dispatchService: DispatchService) {}

  @Get('board')
  @RequirePermissions('work_orders:read')
  async getBoard(
    @CurrentUser() user: AuthenticatedUser,
    @Query('view') view: 'daily' | 'weekly' | 'monthly' = 'daily',
    @Query('date') date?: string,
  ) {
    return {
      success: true,
      data: await this.dispatchService.getBoard(user.tenantId, view, date),
    };
  }

  @Post('recommendations')
  @RequirePermissions('work_orders:assign')
  async recommend(
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: {
      startAt: string;
      endAt: string;
      requiredSkills?: string[];
      jobLat?: number | null;
      jobLng?: number | null;
      priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
      slaDueAt?: string | null;
    },
  ) {
    return {
      success: true,
      data: await this.dispatchService.recommendTechnicians(user.tenantId, body),
    };
  }

  @Post('schedule')
  @RequirePermissions('work_orders:assign')
  async schedule(
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: {
      workOrderId: string;
      technicianIds: string[];
      startAt: string;
      estimatedDurationMinutes?: number;
      requiredSkills?: string[];
      jobLat?: number | null;
      jobLng?: number | null;
      manualOverride?: boolean;
      overrideReason?: string;
    },
  ) {
    return {
      success: true,
      data: await this.dispatchService.scheduleJob(user.tenantId, body),
    };
  }

  @Post('emergency-reassign')
  @RequirePermissions('work_orders:assign')
  async emergencyReassign(
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: { appointmentId: string; newTechnicianId: string; reason: string; manualOverride?: boolean },
  ) {
    return {
      success: true,
      data: await this.dispatchService.emergencyReassign(user.tenantId, body),
    };
  }

  @Post('optimize-route')
  @RequirePermissions('work_orders:assign')
  async optimizeRoute(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { technicianId: string; stops: RouteStop[] },
  ) {
    return {
      success: true,
      data: await this.dispatchService.optimizeTechnicianRoute(user.tenantId, body),
    };
  }
}
