import { Body, Controller, Get, Header, Headers, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  RequirePermissions,
  type AuthenticatedUser,
} from '../../common/security/auth.decorators';
import { JwtAuthGuard } from '../../common/security/jwt-auth.guard';
import { PermissionsGuard } from '../../common/security/permissions.guard';
import { IntegrationsService } from './integrations.service';
import type { ProviderType } from './provider-adapters';

@ApiTags('Integrations')
@Controller('integrations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Post()
  @RequirePermissions('org:manage')
  async configure(
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: {
      providerType: ProviderType;
      providerName: string;
      mode?: 'SANDBOX' | 'LIVE';
      config?: Record<string, unknown>;
      isEnabled?: boolean;
    },
  ) {
    return {
      success: true,
      data: await this.integrationsService.configureIntegration(user.tenantId, body),
    };
  }

  @Get('health')
  @RequirePermissions('org:manage')
  async health(@CurrentUser() user: AuthenticatedUser) {
    return { success: true, data: await this.integrationsService.getHealthReport(user.tenantId) };
  }

  @Post('storage/signed-upload-url')
  @RequirePermissions('work_orders:execute')
  async signedUploadUrl(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { fileName: string },
  ) {
    return {
      success: true,
      data: await this.integrationsService.getSignedUploadUrl(user.tenantId, body.fileName),
    };
  }

  @Get('accounting/export')
  @RequirePermissions('finance:read')
  @Header('Content-Type', 'text/csv')
  async exportAccounting(@CurrentUser() user: AuthenticatedUser) {
    return this.integrationsService.exportAccountingCsv(user.tenantId);
  }

  @Post('webhooks/:provider')
  @RequirePermissions('org:manage')
  async ingestWebhook(
    @CurrentUser() user: AuthenticatedUser,
    @Param('provider') provider: string,
    @Headers('x-webhook-signature') signature = '',
    @Body() body: { eventType: string; payload: Record<string, unknown>; secret?: string },
  ) {
    const rawBody = JSON.stringify(body.payload ?? {});
    return {
      success: true,
      data: await this.integrationsService.ingestWebhook({
        tenantId: user.tenantId,
        provider,
        eventType: body.eventType,
        rawBody,
        signature,
        secret: body.secret ?? 'dev_webhook_secret',
        payload: body.payload ?? {},
      }),
    };
  }

  @Post('webhooks/:id/retry')
  @RequirePermissions('org:manage')
  async retryWebhook(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return {
      success: true,
      data: await this.integrationsService.retryWebhook(user.tenantId, id),
    };
  }
}

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Get('templates')
  @RequirePermissions('org:manage')
  async listTemplates(@CurrentUser() user: AuthenticatedUser) {
    return {
      success: true,
      data: await this.integrationsService.listTemplates(user.tenantId),
    };
  }

  @Post('templates')
  @RequirePermissions('org:manage')
  async createTemplate(
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: {
      channel: 'WHATSAPP' | 'EMAIL' | 'SMS';
      code: string;
      name: string;
      bodyTemplate: string;
      variables?: string[];
    },
  ) {
    return {
      success: true,
      data: await this.integrationsService.createTemplate(user.tenantId, body),
    };
  }

  @Post('send')
  @RequirePermissions('work_orders:write')
  async send(
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: {
      channel: 'WHATSAPP' | 'EMAIL' | 'SMS';
      recipient: string;
      templateCode?: string;
      variables?: Record<string, string>;
      body?: string;
    },
  ) {
    return {
      success: true,
      data: await this.integrationsService.sendNotification(user.tenantId, body),
    };
  }

  @Get()
  @RequirePermissions('work_orders:read')
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status?: 'QUEUED' | 'SENT_SANDBOX' | 'DELIVERED' | 'FAILED',
  ) {
    return {
      success: true,
      data: await this.integrationsService.listNotifications(user.tenantId, status),
    };
  }
}
