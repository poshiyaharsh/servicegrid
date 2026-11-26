import { Body, Controller, Delete, Get, Inject, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../../common/security/auth.decorators';
import { JwtAuthGuard } from '../../common/security/jwt-auth.guard';
import { AuthService } from './auth.service';

const REFRESH_COOKIE_NAME = 'fs_refresh_token';
const REFRESH_COOKIE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

interface CookieResponse {
  setHeader(name: string, value: string | string[]): void;
}

interface CookieRequest {
  headers?: Record<string, string | string[] | undefined>;
  ip?: string;
}

function parseCookieValue(cookieHeader: string | string[] | undefined, name: string): string | null {
  const raw = Array.isArray(cookieHeader) ? cookieHeader.join('; ') : cookieHeader;
  if (!raw) return null;
  for (const part of raw.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === name) {
      return decodeURIComponent(rest.join('='));
    }
  }
  return null;
}

function buildRefreshCookie(token: string, maxAgeSeconds: number): string {
  const parts = [
    `${REFRESH_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'HttpOnly',
    'Path=/api/v1/auth',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`,
  ];
  if (process.env.NODE_ENV === 'production') {
    parts.push('Secure');
  }
  return parts.join('; ');
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

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
    @Res({ passthrough: true }) res: CookieResponse,
  ) {
    const result = await this.authService.register(body);
    res.setHeader('Set-Cookie', buildRefreshCookie(result.refreshToken, REFRESH_COOKIE_MAX_AGE_SECONDS));
    return { success: true, data: result };
  }

  @Post('login')
  async login(
    @Body() body: { email: string; password: string },
    @Req() req: CookieRequest,
    @Res({ passthrough: true }) res: CookieResponse,
  ) {
    const ua = req.headers?.['user-agent'];
    const result = await this.authService.login({
      ...body,
      userAgent: Array.isArray(ua) ? ua[0] : ua,
      ipAddress: req.ip,
    });
    res.setHeader('Set-Cookie', buildRefreshCookie(result.refreshToken, REFRESH_COOKIE_MAX_AGE_SECONDS));
    return { success: true, data: result };
  }

  @Post('refresh')
  async refresh(
    @Body() body: { refreshToken?: string },
    @Req() req: CookieRequest,
    @Res({ passthrough: true }) res: CookieResponse,
  ) {
    const token = body?.refreshToken || parseCookieValue(req.headers?.['cookie'], REFRESH_COOKIE_NAME) || '';
    const result = await this.authService.refresh(token);
    res.setHeader('Set-Cookie', buildRefreshCookie(result.refreshToken, REFRESH_COOKIE_MAX_AGE_SECONDS));
    return { success: true, data: result };
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
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) res: CookieResponse,
  ) {
    res.setHeader('Set-Cookie', buildRefreshCookie('', 0));
    return { success: true, data: await this.authService.logout(user.tenantId, user.sessionId) };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async me(@CurrentUser() user: AuthenticatedUser) {
    return { success: true, data: await this.authService.getProfile(user.tenantId, user.userId) };
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
