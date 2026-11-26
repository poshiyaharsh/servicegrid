import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { hasPermission, type Permission } from '@servicegrid/permissions';
import { PERMISSIONS_KEY, type AuthenticatedUser } from './auth.decorators';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) {
      return true;
    }

    const req = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    if (!req.user) {
      throw new ForbiddenException('Missing authenticated user context');
    }

    const allowed = required.every((perm) => hasPermission(req.user!.roles, perm));
    if (!allowed) {
      throw new ForbiddenException('Insufficient permissions for this operation');
    }
    return true;
  }
}
