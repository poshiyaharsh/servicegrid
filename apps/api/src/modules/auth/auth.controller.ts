import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../../common/security/auth.decorators';
import { JwtAuthGuard } from '../../common/security/jwt-auth.guard';
import { AuthService } from './auth.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(
    @Body()
    body: {
      organizationName: string;
      fullName: string;
      email: string;
      password: string;
      timezone?: string;
      currency?: string;
    },
  ) {
    return { success: true, data: await this.authService.register(body) };
  }

  @Post('login')
  async login(
    @Body() body: { email: string; password: string },
    @Req() req: { headers?: Record<string, string | string[] | undefined>; ip?: string },
  ) {
    const ua = req.headers?.['user-agent'];
    return {
      success: true,
      data: await this.authService.login({
        ...body,
        userAgent: Array.isArray(ua) ? ua[0] : ua,
        ipAddress: req.ip,
      }),
    };
  }

  @Post('refresh')
  async refresh(@Body() body: { refreshToken: string }) {
    return { success: true, data: await this.authService.refresh(body.refreshToken) };
  }

  @Post('verify-email')
  async verifyEmail(@Body() body: { token: string }) {
    return { success: true, data: await this.authService.verifyEmail(body.token) };
  }

  @Post('forgot-password')
  async forgotPassword(@Body() body: { email: string }) {
    return { success: true, data: await this.authService.forgotPassword(body.email) };
  }

  @Post('reset-password')
  async resetPassword(@Body() body: { token: string; newPassword: string }) {
    return { success: true, data: await this.authService.resetPassword(body.token, body.newPassword) };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async logout(@CurrentUser() user: AuthenticatedUser) {
    return { success: true, data: await this.authService.logout(user.tenantId, user.sessionId) };
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async listSessions(@CurrentUser() user: AuthenticatedUser) {
    return { success: true, data: await this.authService.listSessions(user.tenantId, user.userId) };
  }

  @Delete('sessions/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async revokeSession(@CurrentUser() user: AuthenticatedUser, @Param('id') sessionId: string) {
    return { success: true, data: await this.authService.revokeSession(user.tenantId, sessionId) };
  }
}
