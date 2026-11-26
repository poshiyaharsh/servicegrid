import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { SystemRole } from '@servicegrid/types';
import {
  CurrentUser,
  RequirePermissions,
  type AuthenticatedUser,
} from '../../common/security/auth.decorators';
import { JwtAuthGuard } from '../../common/security/jwt-auth.guard';
import { PermissionsGuard } from '../../common/security/permissions.guard';
import { OrganizationsService } from './organizations.service';

@ApiTags('Organizations')
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly orgsService: OrganizationsService) {}

  @Get('current')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async getCurrent(@CurrentUser() user: AuthenticatedUser) {
    return { success: true, data: await this.orgsService.getCurrentOrganization(user.tenantId) };
  }

  @Patch('current')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('org:manage')
  @ApiBearerAuth()
  async updateCurrent(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { name?: string; timezone?: string; currency?: string },
  ) {
    return {
      success: true,
      data: await this.orgsService.updateCurrentOrganization(user.tenantId, body),
    };
  }

  @Post('invitations')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('users:manage')
  @ApiBearerAuth()
  async createInvitation(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { email: string; role: SystemRole; branchId?: string },
  ) {
    return {
      success: true,
      data: await this.orgsService.inviteMember({
        tenantId: user.tenantId,
        invitedByUserId: user.userId,
        ...body,
      }),
    };
  }

  @Get('invitations')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('users:manage')
  @ApiBearerAuth()
  async listInvitations(@CurrentUser() user: AuthenticatedUser) {
    return { success: true, data: await this.orgsService.listInvitations(user.tenantId) };
  }

  @Post('invitations/accept')
  async acceptInvitation(@Body() body: { token: string; fullName: string; password: string }) {
    return { success: true, data: await this.orgsService.acceptInvitation(body) };
  }
}
