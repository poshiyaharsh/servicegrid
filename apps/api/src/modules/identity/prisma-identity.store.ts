import { Injectable } from '@nestjs/common';
import { prisma, withTenantTransaction } from '@servicegrid/database';
import type { SystemRole } from '@servicegrid/types';
import type {
  BranchRecord,
  IdentityStore,
  InvitationRecord,
  SessionRecord,
  TenantRecord,
  TokenRecord,
  UserRecord,
} from './identity.store';

@Injectable()
export class PrismaIdentityStore implements IdentityStore {
  async createTenantWithOwner(input: {
    tenantName: string;
    tenantSlug: string;
    timezone: string;
    currency: string;
    email: string;
    fullName: string;
    passwordHash: string;
  }): Promise<{ tenant: TenantRecord; branch: BranchRecord; user: UserRecord }> {
    return prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: input.tenantName,
          slug: input.tenantSlug,
          timezone: input.timezone,
          currency: input.currency,
        },
      });
      await tx.$executeRawUnsafe(`SELECT set_config('app.current_tenant_id', $1, true)`, tenant.id);

      const branch = await tx.branch.create({
        data: {
          tenantId: tenant.id,
          name: 'Headquarters',
          code: 'HQ',
          isPrimary: true,
        },
      });

      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: input.email.toLowerCase(),
          fullName: input.fullName,
          passwordHash: input.passwordHash,
        },
      });

      await tx.userRole.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          role: 'ORGANIZATION_OWNER',
          branchId: branch.id,
        },
      });

      return {
        tenant,
        branch,
        user: { ...user, roles: ['ORGANIZATION_OWNER'] },
      };
    });
  }

  async findTenantById(tenantId: string): Promise<TenantRecord | null> {
    return prisma.tenant.findUnique({ where: { id: tenantId } });
  }

  async updateTenant(
    tenantId: string,
    patch: Partial<Pick<TenantRecord, 'name' | 'timezone' | 'currency'>>,
  ): Promise<TenantRecord> {
    return prisma.tenant.update({ where: { id: tenantId }, data: patch });
  }

  async findUserByEmailInTenant(tenantId: string, email: string): Promise<UserRecord | null> {
    return withTenantTransaction(tenantId, async (tx) => {
      const user = await tx.user.findFirst({
        where: { tenantId, email: email.toLowerCase() },
        include: { roles: true },
      });
      if (!user) return null;
      return { ...user, roles: user.roles.map((r) => r.role as SystemRole) };
    });
  }

  async findUserByEmailGlobal(email: string): Promise<UserRecord | null> {
    const user = await prisma.user.findFirst({
      where: { email: email.toLowerCase() },
      include: { roles: true },
    });
    if (!user) return null;
    return { ...user, roles: user.roles.map((r) => r.role as SystemRole) };
  }

  async findUserById(tenantId: string, userId: string): Promise<UserRecord | null> {
    return withTenantTransaction(tenantId, async (tx) => {
      const user = await tx.user.findFirst({
        where: { id: userId, tenantId },
        include: { roles: true },
      });
      if (!user) return null;
      return { ...user, roles: user.roles.map((r) => r.role as SystemRole) };
    });
  }

  async listUsers(tenantId: string): Promise<UserRecord[]> {
    return withTenantTransaction(tenantId, async (tx) => {
      const users = await tx.user.findMany({
        where: { tenantId },
        include: { roles: true },
        orderBy: { createdAt: 'desc' },
      });
      return users.map((u) => ({ ...u, roles: u.roles.map((r) => r.role as SystemRole) }));
    });
  }

  async updateUserStatus(tenantId: string, userId: string, isActive: boolean): Promise<UserRecord | null> {
    return withTenantTransaction(tenantId, async (tx) => {
      const existing = await tx.user.findFirst({ where: { id: userId, tenantId } });
      if (!existing) return null;
      const updated = await tx.user.update({
        where: { id: userId },
        data: { isActive },
        include: { roles: true },
      });
      return { ...updated, roles: updated.roles.map((r) => r.role as SystemRole) };
    });
  }

  async setUserRoles(tenantId: string, userId: string, roles: SystemRole[]): Promise<UserRecord | null> {
    return withTenantTransaction(tenantId, async (tx) => {
      const existing = await tx.user.findFirst({ where: { id: userId, tenantId } });
      if (!existing) return null;
      await tx.userRole.deleteMany({ where: { tenantId, userId } });
      await tx.userRole.createMany({
        data: roles.map((role) => ({ tenantId, userId, role })),
      });
      return { ...existing, roles };
    });
  }

  async markEmailVerified(tenantId: string, userId: string): Promise<void> {
    await withTenantTransaction(tenantId, async (tx) => {
      await tx.user.updateMany({
        where: { id: userId, tenantId },
        data: { emailVerifiedAt: new Date() },
      });
    });
  }

  async updatePassword(tenantId: string, userId: string, passwordHash: string): Promise<void> {
    await withTenantTransaction(tenantId, async (tx) => {
      await tx.user.updateMany({
        where: { id: userId, tenantId },
        data: { passwordHash },
      });
    });
  }

  async createSession(input: Omit<SessionRecord, 'id' | 'revokedAt' | 'createdAt'>): Promise<SessionRecord> {
    return withTenantTransaction(input.tenantId, (tx) => tx.session.create({ data: input }));
  }

  async findSessionById(tenantId: string, sessionId: string): Promise<SessionRecord | null> {
    return withTenantTransaction(tenantId, (tx) =>
      tx.session.findFirst({ where: { id: sessionId, tenantId } }),
    );
  }

  async listSessions(tenantId: string, userId: string): Promise<SessionRecord[]> {
    return withTenantTransaction(tenantId, (tx) =>
      tx.session.findMany({ where: { tenantId, userId }, orderBy: { createdAt: 'desc' } }),
    );
  }

  async rotateSessionRefreshHash(
    tenantId: string,
    sessionId: string,
    newHash: string,
    expiresAt: Date,
  ): Promise<void> {
    await withTenantTransaction(tenantId, (tx) =>
      tx.session.updateMany({
        where: { id: sessionId, tenantId, revokedAt: null },
        data: { refreshTokenHash: newHash, expiresAt },
      }),
    );
  }

  async revokeSession(tenantId: string, sessionId: string): Promise<boolean> {
    return withTenantTransaction(tenantId, async (tx) => {
      const res = await tx.session.updateMany({
        where: { id: sessionId, tenantId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return res.count > 0;
    });
  }

  async createEmailVerificationToken(input: Omit<TokenRecord, 'id' | 'usedAt'>): Promise<TokenRecord> {
    return withTenantTransaction(input.tenantId, (tx) =>
      tx.emailVerificationToken.create({ data: input }),
    );
  }

  async consumeEmailVerificationToken(tokenHash: string): Promise<TokenRecord | null> {
    const token = await prisma.emailVerificationToken.findUnique({ where: { tokenHash } });
    if (!token || token.usedAt || token.expiresAt <= new Date()) return null;
    return prisma.emailVerificationToken.update({
      where: { id: token.id },
      data: { usedAt: new Date() },
    });
  }

  async createPasswordResetToken(input: Omit<TokenRecord, 'id' | 'usedAt'>): Promise<TokenRecord> {
    return withTenantTransaction(input.tenantId, (tx) =>
      tx.passwordResetToken.create({ data: input }),
    );
  }

  async consumePasswordResetToken(tokenHash: string): Promise<TokenRecord | null> {
    const token = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
    if (!token || token.usedAt || token.expiresAt <= new Date()) return null;
    return prisma.passwordResetToken.update({
      where: { id: token.id },
      data: { usedAt: new Date() },
    });
  }

  async createInvitation(input: Omit<InvitationRecord, 'id' | 'acceptedAt'>): Promise<InvitationRecord> {
    const created = await withTenantTransaction(input.tenantId, (tx) =>
      tx.organizationInvitation.create({ data: input }),
    );
    return { ...created, role: created.role as SystemRole };
  }

  async listInvitations(tenantId: string): Promise<InvitationRecord[]> {
    const list = await withTenantTransaction(tenantId, (tx) =>
      tx.organizationInvitation.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } }),
    );
    return list.map((inv) => ({ ...inv, role: inv.role as SystemRole }));
  }

  async findInvitationByTokenHash(tokenHash: string): Promise<InvitationRecord | null> {
    const inv = await prisma.organizationInvitation.findUnique({ where: { tokenHash } });
    if (!inv) return null;
    return { ...inv, role: inv.role as SystemRole };
  }

  async acceptInvitation(input: {
    invitationId: string;
    tenantId: string;
    fullName: string;
    passwordHash: string;
  }): Promise<UserRecord> {
    return withTenantTransaction(input.tenantId, async (tx) => {
      const inv = await tx.organizationInvitation.update({
        where: { id: input.invitationId },
        data: { acceptedAt: new Date() },
      });
      const user = await tx.user.create({
        data: {
          tenantId: input.tenantId,
          email: inv.email.toLowerCase(),
          fullName: input.fullName,
          passwordHash: input.passwordHash,
          emailVerifiedAt: new Date(),
        },
      });
      await tx.userRole.create({
        data: {
          tenantId: input.tenantId,
          userId: user.id,
          role: inv.role,
          branchId: inv.branchId,
        },
      });
      return { ...user, roles: [inv.role as SystemRole] };
    });
  }

  async listBranches(tenantId: string): Promise<BranchRecord[]> {
    return withTenantTransaction(tenantId, (tx) =>
      tx.branch.findMany({ where: { tenantId }, orderBy: { createdAt: 'asc' } }),
    );
  }

  async createBranch(input: Omit<BranchRecord, 'id'>): Promise<BranchRecord> {
    return withTenantTransaction(input.tenantId, (tx) => tx.branch.create({ data: input }));
  }

  async updateBranch(
    tenantId: string,
    branchId: string,
    patch: Partial<Pick<BranchRecord, 'name' | 'city' | 'isPrimary'>>,
  ): Promise<BranchRecord | null> {
    return withTenantTransaction(tenantId, async (tx) => {
      const existing = await tx.branch.findFirst({ where: { id: branchId, tenantId } });
      if (!existing) return null;
      return tx.branch.update({ where: { id: branchId }, data: patch });
    });
  }

  async deleteBranch(tenantId: string, branchId: string): Promise<boolean> {
    return withTenantTransaction(tenantId, async (tx) => {
      const res = await tx.branch.deleteMany({ where: { id: branchId, tenantId } });
      return res.count > 0;
    });
  }
}
