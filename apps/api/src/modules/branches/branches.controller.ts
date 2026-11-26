import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  RequirePermissions,
  type AuthenticatedUser,
} from '../../common/security/auth.decorators';
import { JwtAuthGuard } from '../../common/security/jwt-auth.guard';
import { PermissionsGuard } from '../../common/security/permissions.guard';
import { BranchesService } from './branches.service';

@ApiTags('Branches')
@Controller('branches')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    return { success: true, data: await this.branchesService.list(user.tenantId) };
  }

  @Post()
  @RequirePermissions('org:manage')
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { name: string; code: string; city?: string; isPrimary?: boolean },
  ) {
    return { success: true, data: await this.branchesService.create(user.tenantId, body) };
  }

  @Patch(':id')
  @RequirePermissions('org:manage')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { name?: string; city?: string; isPrimary?: boolean },
  ) {
    return { success: true, data: await this.branchesService.update(user.tenantId, id, body) };
  }

  @Delete(':id')
  @RequirePermissions('org:manage')
  async remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return { success: true, data: await this.branchesService.remove(user.tenantId, id) };
  }
}
