import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { SystemRole } from '@servicegrid/types';
import {
  CurrentUser,
  RequirePermissions,
  type AuthenticatedUser,
} from '../../common/security/auth.decorators';
import { JwtAuthGuard } from '../../common/security/jwt-auth.guard';
import { PermissionsGuard } from '../../common/security/permissions.guard';
import { UsersService } from './users.service';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermissions('users:manage')
  async list(@CurrentUser() user: AuthenticatedUser) {
    return { success: true, data: await this.usersService.list(user.tenantId) };
  }

  @Get('permissions/matrix')
  getPermissionsMatrix() {
    return { success: true, data: this.usersService.getPermissionsMatrix() };
  }

  @Get(':id')
  @RequirePermissions('users:manage')
  async getById(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return { success: true, data: await this.usersService.getById(user.tenantId, id) };
  }

  @Patch(':id/roles')
  @RequirePermissions('users:manage')
  async setRoles(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { roles: SystemRole[] },
  ) {
    return { success: true, data: await this.usersService.setRoles(user.tenantId, id, body.roles) };
  }

  @Patch(':id/status')
  @RequirePermissions('users:manage')
  async setStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { isActive: boolean },
  ) {
    return { success: true, data: await this.usersService.setStatus(user.tenantId, id, body.isActive) };
  }
}
