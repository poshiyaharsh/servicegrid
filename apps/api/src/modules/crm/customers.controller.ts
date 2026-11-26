import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  RequirePermissions,
  type AuthenticatedUser,
} from '../../common/security/auth.decorators';
import { JwtAuthGuard } from '../../common/security/jwt-auth.guard';
import { PermissionsGuard } from '../../common/security/permissions.guard';
import type { CommunicationChannel, CustomerType } from './crm.store';
import { CustomersService } from './customers.service';

@ApiTags('Customers')
@Controller('customers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class CustomersController {
  constructor(@Inject(CustomersService) private readonly customersService: CustomersService) {}

  @Get()
  @RequirePermissions('customers:read')
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('search') search?: string,
    @Query('customerType') customerType?: CustomerType,
    @Query('tag') tag?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.customersService.list(user.tenantId, {
      search,
      customerType,
      tag,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
    return { success: true, data: result.items, meta: { total: result.total } };
  }

  @Post()
  @RequirePermissions('customers:write')
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: {
      customerType?: CustomerType;
      displayName: string;
      companyName?: string;
      gstin?: string;
      primaryPhone: string;
      primaryEmail?: string;
      tags?: string[];
      notes?: string;
    },
  ) {
    return {
      success: true,
      data: await this.customersService.create(user.tenantId, user.userId, body),
    };
  }

  @Get('export/csv')
  @RequirePermissions('customers:read')
  @Header('Content-Type', 'text/csv')
  async exportCsv(@CurrentUser() user: AuthenticatedUser) {
    return this.customersService.exportCsv(user.tenantId);
  }

  @Post('import')
  @RequirePermissions('customers:write')
  async importCsv(@CurrentUser() user: AuthenticatedUser, @Body() body: { csv: string }) {
    return {
      success: true,
      data: await this.customersService.importCsv(user.tenantId, user.userId, body.csv),
    };
  }

  @Get(':id')
  @RequirePermissions('customers:read')
  async getProfile(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return { success: true, data: await this.customersService.getProfile(user.tenantId, id) };
  }

  @Patch(':id')
  @RequirePermissions('customers:write')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body()
    body: {
      displayName?: string;
      companyName?: string;
      gstin?: string;
      primaryPhone?: string;
      primaryEmail?: string;
      tags?: string[];
      notes?: string;
      isActive?: boolean;
    },
  ) {
    return {
      success: true,
      data: await this.customersService.update(user.tenantId, id, user.userId, body),
    };
  }

  @Post(':id/contacts')
  @RequirePermissions('customers:write')
  async addContact(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { name: string; role?: string; phone: string; email?: string; isPrimary?: boolean },
  ) {
    return { success: true, data: await this.customersService.addContact(user.tenantId, id, body) };
  }

  @Delete(':id/contacts/:contactId')
  @RequirePermissions('customers:write')
  async deleteContact(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('contactId') contactId: string,
  ) {
    return {
      success: true,
      data: await this.customersService.deleteContact(user.tenantId, id, contactId),
    };
  }

  @Post(':id/addresses')
  @RequirePermissions('customers:write')
  async addAddress(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body()
    body: {
      label?: string;
      line1: string;
      line2?: string;
      city: string;
      state: string;
      postalCode: string;
      country?: string;
      isPrimary?: boolean;
    },
  ) {
    return { success: true, data: await this.customersService.addAddress(user.tenantId, id, body) };
  }

  @Delete(':id/addresses/:addressId')
  @RequirePermissions('customers:write')
  async deleteAddress(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('addressId') addressId: string,
  ) {
    return {
      success: true,
      data: await this.customersService.deleteAddress(user.tenantId, id, addressId),
    };
  }

  @Post(':id/communications')
  @RequirePermissions('customers:write')
  async logCommunication(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { channel: CommunicationChannel; direction: 'INBOUND' | 'OUTBOUND'; summary: string },
  ) {
    return {
      success: true,
      data: await this.customersService.logCommunication(user.tenantId, id, user.userId, body),
    };
  }

  @Get(':id/timeline')
  @RequirePermissions('customers:read')
  async getTimeline(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return { success: true, data: await this.customersService.getTimeline(user.tenantId, id) };
  }

  @Post(':id/assets')
  @RequirePermissions('customers:write')
  async addAsset(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body()
    body: {
      name: string;
      category: string;
      manufacturer?: string;
      modelName?: string;
      serialNumber?: string;
      installedAt?: string;
      warrantyExpiresAt?: string;
      notes?: string;
    },
  ) {
    return { success: true, data: await this.customersService.addAsset(user.tenantId, id, body) };
  }

  @Get(':id/assets')
  @RequirePermissions('customers:read')
  async listAssets(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return { success: true, data: await this.customersService.listAssets(user.tenantId, id) };
  }

  @Post(':id/service-history')
  @RequirePermissions('customers:write')
  async addServiceHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body()
    body: { assetId?: string; summary: string; servicedAt?: string; technicianName?: string; notes?: string },
  ) {
    return {
      success: true,
      data: await this.customersService.addServiceHistory(user.tenantId, id, body),
    };
  }
}
