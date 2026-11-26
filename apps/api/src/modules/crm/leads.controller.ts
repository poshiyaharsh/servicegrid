import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  RequirePermissions,
  type AuthenticatedUser,
} from '../../common/security/auth.decorators';
import { JwtAuthGuard } from '../../common/security/jwt-auth.guard';
import { PermissionsGuard } from '../../common/security/permissions.guard';
import type { CustomerType, LeadStatus } from './crm.store';
import { LeadsService } from './leads.service';

@ApiTags('Leads')
@Controller('leads')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get()
  @RequirePermissions('customers:read')
  async list(@CurrentUser() user: AuthenticatedUser, @Query('status') status?: LeadStatus) {
    return { success: true, data: await this.leadsService.list(user.tenantId, status) };
  }

  @Post()
  @RequirePermissions('customers:write')
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: { name: string; phone: string; email?: string; source?: string; notes?: string; assignedToUserId?: string },
  ) {
    return { success: true, data: await this.leadsService.create(user.tenantId, body) };
  }

  @Patch(':id')
  @RequirePermissions('customers:write')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { status?: LeadStatus; notes?: string; assignedToUserId?: string },
  ) {
    return { success: true, data: await this.leadsService.update(user.tenantId, id, body) };
  }

  @Post(':id/convert')
  @RequirePermissions('customers:write')
  async convert(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { customerType?: CustomerType; companyName?: string },
  ) {
    return {
      success: true,
      data: await this.leadsService.convert(user.tenantId, id, user.userId, body),
    };
  }
}
