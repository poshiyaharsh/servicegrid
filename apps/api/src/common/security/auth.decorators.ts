import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { Permission } from '@servicegrid/permissions';
import type { TenantContext } from '@servicegrid/types';

export const PERMISSIONS_KEY = 'fieldsutra:permissions';

export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

export interface AuthenticatedUser extends TenantContext {
  sessionId: string;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const req = ctx.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    if (!req.user) {
      throw new Error('AuthenticatedUser missing on request context');
    }
    return req.user;
  },
);
