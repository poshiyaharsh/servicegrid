import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { loadConfig } from '@servicegrid/config';
import type { AuthenticatedUser } from './auth.decorators';
import { verifyJwt } from './crypto.util';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly accessSecret = loadConfig().JWT_ACCESS_SECRET;

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      user?: AuthenticatedUser;
    }>();

    const authHeader = req.headers['authorization'];
    const rawHeader = Array.isArray(authHeader) ? authHeader[0] : authHeader;
    if (!rawHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }

    const token = rawHeader.slice(7).trim();
    let payload;
    try {
      payload = verifyJwt(token, this.accessSecret);
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }

    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }

    // Never trust client-supplied x-tenant-id without authorization checks
    const clientTenantHeader = req.headers['x-tenant-id'];
    const suppliedTenantId = Array.isArray(clientTenantHeader)
      ? clientTenantHeader[0]
      : clientTenantHeader;

    const isSuperAdmin = payload.roles.includes('PLATFORM_SUPER_ADMIN');
    if (suppliedTenantId && suppliedTenantId !== payload.tenantId && !isSuperAdmin) {
      throw new ForbiddenException('Cross-tenant access denied');
    }

    req.user = {
      userId: payload.sub,
      tenantId: suppliedTenantId && isSuperAdmin ? suppliedTenantId : payload.tenantId,
      sessionId: payload.sessionId,
      roles: payload.roles,
    };

    return true;
  }
}
