import { Body, Controller, Get, Inject, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  RequirePermissions,
  type AuthenticatedUser,
} from '../../common/security/auth.decorators';
import { JwtAuthGuard } from '../../common/security/jwt-auth.guard';
import { PermissionsGuard } from '../../common/security/permissions.guard';
import { AiIntelligenceService } from './ai.service';
import { AnalyticsService } from './analytics.service';

@ApiTags('Analytics & AI')
@Controller('analytics')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(
    @Inject(AnalyticsService) private readonly analyticsService: AnalyticsService,
    @Inject(AiIntelligenceService) private readonly aiService: AiIntelligenceService,
  ) {}

  @Get('dashboard')
  @RequirePermissions('analytics:read')
  async dashboard(@CurrentUser() user: AuthenticatedUser) {
    return {
      success: true,
      data: await this.analyticsService.getDashboardMetrics(user.tenantId),
    };
  }

  @Get('ai/status')
  @RequirePermissions('analytics:read')
  aiStatus() {
    return { success: true, data: this.aiService.getProviderStatus() };
  }

  @Post('ai/classify-complaint')
  @RequirePermissions('work_orders:read')
  classify(@Body() body: { text: string }) {
    return { success: true, data: this.aiService.classifyComplaint(body.text) };
  }

  @Post('ai/voice-to-request')
  @RequirePermissions('work_orders:write')
  voiceToRequest(@Body() body: { transcript: string }) {
    return { success: true, data: this.aiService.voiceToServiceRequestDraft(body.transcript) };
  }

  @Post('ai/summarize')
  @RequirePermissions('work_orders:read')
  summarize(@Body() body: { text: string }) {
    return { success: true, data: this.aiService.summarizeText(body.text) };
  }

  @Post('ai/suggest-parts')
  @RequirePermissions('work_orders:read')
  suggestParts(@Body() body: { complaintText: string }) {
    return { success: true, data: this.aiService.suggestSpareParts(body.complaintText) };
  }
}
