import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { loadConfig } from '@servicegrid/config';
import type { SystemRole } from '@servicegrid/types';
import { generateOpaqueToken, hashPassword, hashToken } from '../../common/security/crypto.util';
import { IDENTITY_STORE, type IdentityStore } from '../identity/identity.store';

@Injectable()
export class OrganizationsService {
  private readonly config = loadConfig();

  constructor(@Inject(IDENTITY_STORE) private readonly store: IdentityStore) {}

  async getCurrentOrganization(tenantId: string) {
    const tenant = await this.store.findTenantById(tenantId);
    if (!tenant) throw new NotFoundException('Organization not found');
    return tenant;
  }

  async updateCurrentOrganization(
    tenantId: string,
    patch: { name?: string; timezone?: string; currency?: string },
  ) {
    return this.store.updateTenant(tenantId, patch);
  }

  async inviteMember(input: {
    tenantId: string;
    invitedByUserId: string;
    email: string;
    role: SystemRole;
    branchId?: string;
  }) {
    const rawToken = generateOpaqueToken(24);
    const invitation = await this.store.createInvitation({
      tenantId: input.tenantId,
      email: input.email.toLowerCase(),
      role: input.role,
      branchId: input.branchId ?? null,
      tokenHash: hashToken(rawToken),
      invitedByUserId: input.invitedByUserId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    return {
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
      },
      ...(this.config.NODE_ENV !== 'production' ? { invitationToken: rawToken } : {}),
    };
  }

  async listInvitations(tenantId: string) {
    const list = await this.store.listInvitations(tenantId);
    return list.map(({ tokenHash: _omit, ...rest }) => rest);
  }

  async acceptInvitation(input: { token: string; fullName: string; password: string }) {
    if (input.password.length < 10) {
      throw new BadRequestException('Password must be at least 10 characters');
    }
    const invitation = await this.store.findInvitationByTokenHash(hashToken(input.token));
    if (!invitation || invitation.acceptedAt || invitation.expiresAt <= new Date()) {
      throw new BadRequestException('Invalid or expired invitation token');
    }

    const passwordHash = await hashPassword(input.password);
    const user = await this.store.acceptInvitation({
      invitationId: invitation.id,
      tenantId: invitation.tenantId,
      fullName: input.fullName,
      passwordHash,
    });
    const { passwordHash: _omit, ...safe } = user;
    return safe;
  }
}
