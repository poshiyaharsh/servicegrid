import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ROLE_PERMISSIONS } from '@servicegrid/permissions';
import type { SystemRole } from '@servicegrid/types';
import { IDENTITY_STORE, type IdentityStore } from '../identity/identity.store';

@Injectable()
export class UsersService {
  constructor(@Inject(IDENTITY_STORE) private readonly store: IdentityStore) {}

  async list(tenantId: string) {
    const users = await this.store.listUsers(tenantId);
    return users.map(({ passwordHash: _omit, ...safe }) => safe);
  }

  async getById(tenantId: string, userId: string) {
    const user = await this.store.findUserById(tenantId, userId);
    if (!user) throw new NotFoundException('User not found');
    const { passwordHash: _omit, ...safe } = user;
    return safe;
  }

  async setRoles(tenantId: string, userId: string, roles: SystemRole[]) {
    const updated = await this.store.setUserRoles(tenantId, userId, roles);
    if (!updated) throw new NotFoundException('User not found');
    const { passwordHash: _omit, ...safe } = updated;
    return safe;
  }

  async setStatus(tenantId: string, userId: string, isActive: boolean) {
    const updated = await this.store.updateUserStatus(tenantId, userId, isActive);
    if (!updated) throw new NotFoundException('User not found');
    const { passwordHash: _omit, ...safe } = updated;
    return safe;
  }

  getPermissionsMatrix() {
    return ROLE_PERMISSIONS;
  }
}
