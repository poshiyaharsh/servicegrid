import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  RequirePermissions,
  type AuthenticatedUser,
} from '../../common/security/auth.decorators';
import { JwtAuthGuard } from '../../common/security/jwt-auth.guard';
import { PermissionsGuard } from '../../common/security/permissions.guard';
import type { WorkingHoursWindow } from './dispatch.engine';
import { DispatchService } from './dispatch.service';

@ApiTags('Technicians')
@Controller('technicians')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class TechniciansController {
  constructor(private readonly dispatchService: DispatchService) {}

  @Get()
  @RequirePermissions('work_orders:read')
  async list(@CurrentUser() user: AuthenticatedUser) {
    return { success: true, data: await this.dispatchService.listTechnicians(user.tenantId) };
  }

  @Post()
  @RequirePermissions('users:manage')
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: {
      userId: string;
      branchId?: string;
      displayName: string;
      phone: string;
      homeLat?: number;
      homeLng?: number;
      workingHours?: WorkingHoursWindow;
      skills?: string[];
    },
  ) {
    return {
      success: true,
      data: await this.dispatchService.createTechnician(user.tenantId, body),
    };
  }

  @Post(':id/leaves')
  @RequirePermissions('work_orders:assign')
  async addLeave(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body()
    body: { startAt: string; endAt: string; reason?: string; status?: 'PENDING' | 'APPROVED' | 'REJECTED' },
  ) {
    return {
      success: true,
      data: await this.dispatchService.addLeave(user.tenantId, id, body),
    };
  }
}
