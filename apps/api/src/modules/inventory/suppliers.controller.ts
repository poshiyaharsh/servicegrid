import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  RequirePermissions,
  type AuthenticatedUser,
} from '../../common/security/auth.decorators';
import { JwtAuthGuard } from '../../common/security/jwt-auth.guard';
import { PermissionsGuard } from '../../common/security/permissions.guard';
import { InventoryService } from './inventory.service';

@ApiTags('Suppliers')
@Controller('suppliers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class SuppliersController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @RequirePermissions('inventory:read')
  async list(@CurrentUser() user: AuthenticatedUser) {
    return { success: true, data: await this.inventoryService.listSuppliers(user.tenantId) };
  }

  @Post()
  @RequirePermissions('inventory:write')
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { name: string; phone: string; email?: string; gstin?: string },
  ) {
    return { success: true, data: await this.inventoryService.createSupplier(user.tenantId, body) };
  }
}
