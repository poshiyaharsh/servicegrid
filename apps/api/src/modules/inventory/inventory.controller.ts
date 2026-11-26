import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  RequirePermissions,
  type AuthenticatedUser,
} from '../../common/security/auth.decorators';
import { JwtAuthGuard } from '../../common/security/jwt-auth.guard';
import { PermissionsGuard } from '../../common/security/permissions.guard';
import { InventoryService } from './inventory.service';
import type { PurchaseOrderItem } from './inventory.store';

@ApiTags('Inventory')
@Controller('inventory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('products')
  @RequirePermissions('inventory:read')
  async listProducts(@CurrentUser() user: AuthenticatedUser) {
    return { success: true, data: await this.inventoryService.listProducts(user.tenantId) };
  }

  @Post('products')
  @RequirePermissions('inventory:write')
  async createProduct(
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: {
      sku: string;
      barcode?: string;
      qrCode?: string;
      name: string;
      category: string;
      unitPrice: string;
      reorderThreshold?: number;
    },
  ) {
    return { success: true, data: await this.inventoryService.createProduct(user.tenantId, body) };
  }

  @Get('warehouses')
  @RequirePermissions('inventory:read')
  async listWarehouses(@CurrentUser() user: AuthenticatedUser) {
    return { success: true, data: await this.inventoryService.listWarehouses(user.tenantId) };
  }

  @Post('warehouses')
  @RequirePermissions('inventory:write')
  async createWarehouse(
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: {
      branchId?: string;
      name: string;
      code: string;
      warehouseType?: 'MAIN' | 'VEHICLE';
      assignedTechnicianId?: string;
    },
  ) {
    return { success: true, data: await this.inventoryService.createWarehouse(user.tenantId, body) };
  }

  @Post('adjustments')
  @RequirePermissions('inventory:write')
  async adjustStock(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { warehouseId: string; productId: string; quantityDelta: number; reason: string },
  ) {
    return {
      success: true,
      data: await this.inventoryService.adjustStock(user.tenantId, user.userId, body),
    };
  }

  @Post('transfers')
  @RequirePermissions('inventory:write')
  async transferStock(
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: { fromWarehouseId: string; toWarehouseId: string; productId: string; quantity: number },
  ) {
    return {
      success: true,
      data: await this.inventoryService.transferStock(user.tenantId, user.userId, body),
    };
  }

  @Post('consume')
  @RequirePermissions('work_orders:execute')
  async consumeParts(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { workOrderId: string; warehouseId: string; productId: string; quantity: number },
  ) {
    return {
      success: true,
      data: await this.inventoryService.consumePartsForJob(user.tenantId, user.userId, body),
    };
  }

  @Get('alerts/low-stock')
  @RequirePermissions('inventory:read')
  async lowStock(@CurrentUser() user: AuthenticatedUser) {
    return { success: true, data: await this.inventoryService.getLowStockAlerts(user.tenantId) };
  }

  @Get('movements')
  @RequirePermissions('inventory:read')
  async movements(@CurrentUser() user: AuthenticatedUser, @Query('productId') productId?: string) {
    return { success: true, data: await this.inventoryService.listMovements(user.tenantId, productId) };
  }

  @Get('purchase-orders')
  @RequirePermissions('inventory:read')
  async listPOs(@CurrentUser() user: AuthenticatedUser) {
    return { success: true, data: await this.inventoryService.listPurchaseOrders(user.tenantId) };
  }

  @Post('purchase-orders')
  @RequirePermissions('inventory:write')
  async createPO(
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: {
      supplierId: string;
      warehouseId: string;
      items: PurchaseOrderItem[];
      totalAmount: string;
    },
  ) {
    return {
      success: true,
      data: await this.inventoryService.createPurchaseOrder(user.tenantId, body),
    };
  }

  @Post('purchase-orders/:id/receive')
  @RequirePermissions('inventory:write')
  async receivePO(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return {
      success: true,
      data: await this.inventoryService.receivePurchaseOrder(user.tenantId, id, user.userId),
    };
  }
}
