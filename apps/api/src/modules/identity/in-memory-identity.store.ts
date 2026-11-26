import crypto from 'node:crypto';
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

export class InMemoryIdentityStore implements IdentityStore {
  private tenants = new Map<string, TenantRecord>();
  private branches = new Map<string, BranchRecord>();
  private users = new Map<string, UserRecord>();
  private sessions = new Map<string, SessionRecord>();
  private verificationTokens = new Map<string, TokenRecord>();
  private resetTokens = new Map<string, TokenRecord>();
  private invitations = new Map<string, InvitationRecord>();

  async createTenantWithOwner(input: {
    tenantName: string;
    tenantSlug: string;
    timezone: string;
    currency: string;
    email: string;
    fullName: string;
    passwordHash: string;
  }) {
    const tenant: TenantRecord = {
      id: crypto.randomUUID(),
      name: input.tenantName,
      slug: input.tenantSlug,
      timezone: input.timezone,
      currency: input.currency,
      isActive: true,
    };
    this.tenants.set(tenant.id, tenant);

    const branch: BranchRecord = {
      id: crypto.randomUUID(),
      tenantId: tenant.id,
      name: 'Headquarters',
      code: 'HQ',
      city: null,
      isPrimary: true,
    };
    this.branches.set(branch.id, branch);

    const user: UserRecord = {
      id: crypto.randomUUID(),
      tenantId: tenant.id,
      email: input.email.toLowerCase(),
      fullName: input.fullName,
      passwordHash: input.passwordHash,
      isActive: true,
      emailVerifiedAt: null,
      roles: ['ORGANIZATION_OWNER'],
    };
    this.users.set(user.id, user);

    return { tenant, branch, user };
  }

  async findTenantById(tenantId: string) {
    return this.tenants.get(tenantId) ?? null;
  }

  async updateTenant(tenantId: string, patch: Partial<Pick<TenantRecord, 'name' | 'timezone' | 'currency'>>) {
    const t = this.tenants.get(tenantId);
    if (!t) throw new Error('Tenant not found');
    const updated = { ...t, ...patch };
    this.tenants.set(tenantId, updated);
    return updated;
  }

  async findUserByEmailInTenant(tenantId: string, email: string) {
    const lower = email.toLowerCase();
    return [...this.users.values()].find((u) => u.tenantId === tenantId && u.email === lower) ?? null;
  }

  async findUserByEmailGlobal(email: string) {
    const lower = email.toLowerCase();
    return [...this.users.values()].find((u) => u.email === lower) ?? null;
  }

  async findUserById(tenantId: string, userId: string) {
    const u = this.users.get(userId);
    return u && u.tenantId === tenantId ? u : null;
  }

  async listUsers(tenantId: string) {
    return [...this.users.values()].filter((u) => u.tenantId === tenantId);
  }

  async updateUserStatus(tenantId: string, userId: string, isActive: boolean) {
    const u = await this.findUserById(tenantId, userId);
    if (!u) return null;
    const updated = { ...u, isActive };
    this.users.set(userId, updated);
    return updated;
  }

  async setUserRoles(tenantId: string, userId: string, roles: SystemRole[]) {
    const u = await this.findUserById(tenantId, userId);
    if (!u) return null;
    const updated = { ...u, roles: [...roles] };
    this.users.set(userId, updated);
    return updated;
  }

  async markEmailVerified(tenantId: string, userId: string) {
    const u = await this.findUserById(tenantId, userId);
    if (u) this.users.set(userId, { ...u, emailVerifiedAt: new Date() });
  }

  async updatePassword(tenantId: string, userId: string, passwordHash: string) {
    const u = await this.findUserById(tenantId, userId);
    if (u) this.users.set(userId, { ...u, passwordHash });
  }

  async createSession(input: Omit<SessionRecord, 'id' | 'revokedAt' | 'createdAt'>) {
    const s: SessionRecord = {
      ...input,
      id: crypto.randomUUID(),
      revokedAt: null,
      createdAt: new Date(),
    };
    this.sessions.set(s.id, s);
    return s;
  }

  async findSessionById(tenantId: string, sessionId: string) {
    const s = this.sessions.get(sessionId);
    return s && s.tenantId === tenantId ? s : null;
  }

  async listSessions(tenantId: string, userId: string) {
    return [...this.sessions.values()].filter((s) => s.tenantId === tenantId && s.userId === userId);
  }

  async rotateSessionRefreshHash(tenantId: string, sessionId: string, newHash: string, expiresAt: Date) {
    const s = await this.findSessionById(tenantId, sessionId);
    if (s && !s.revokedAt) {
      this.sessions.set(sessionId, { ...s, refreshTokenHash: newHash, expiresAt });
    }
  }

  async revokeSession(tenantId: string, sessionId: string) {
    const s = await this.findSessionById(tenantId, sessionId);
    if (!s || s.revokedAt) return false;
    this.sessions.set(sessionId, { ...s, revokedAt: new Date() });
    return true;
  }

  async createEmailVerificationToken(input: Omit<TokenRecord, 'id' | 'usedAt'>) {
    const t: TokenRecord = { ...input, id: crypto.randomUUID(), usedAt: null };
    this.verificationTokens.set(t.tokenHash, t);
    return t;
  }

  async consumeEmailVerificationToken(tokenHash: string) {
    const t = this.verificationTokens.get(tokenHash);
    if (!t || t.usedAt || t.expiresAt <= new Date()) return null;
    const used = { ...t, usedAt: new Date() };
    this.verificationTokens.set(tokenHash, used);
    return used;
  }

  async createPasswordResetToken(input: Omit<TokenRecord, 'id' | 'usedAt'>) {
    const t: TokenRecord = { ...input, id: crypto.randomUUID(), usedAt: null };
    this.resetTokens.set(t.tokenHash, t);
    return t;
  }

  async consumePasswordResetToken(tokenHash: string) {
    const t = this.resetTokens.get(tokenHash);
    if (!t || t.usedAt || t.expiresAt <= new Date()) return null;
    const used = { ...t, usedAt: new Date() };
    this.resetTokens.set(tokenHash, used);
    return used;
  }

  async createInvitation(input: Omit<InvitationRecord, 'id' | 'acceptedAt'>) {
    const inv: InvitationRecord = { ...input, id: crypto.randomUUID(), acceptedAt: null };
    this.invitations.set(inv.id, inv);
    return inv;
  }

  async listInvitations(tenantId: string) {
    return [...this.invitations.values()].filter((i) => i.tenantId === tenantId);
  }

  async findInvitationByTokenHash(tokenHash: string) {
    return [...this.invitations.values()].find((i) => i.tokenHash === tokenHash) ?? null;
  }

  async acceptInvitation(input: {
    invitationId: string;
    tenantId: string;
    fullName: string;
    passwordHash: string;
  }) {
    const inv = this.invitations.get(input.invitationId);
    if (!inv || inv.tenantId !== input.tenantId) throw new Error('Invitation not found');
    this.invitations.set(inv.id, { ...inv, acceptedAt: new Date() });

    const user: UserRecord = {
      id: crypto.randomUUID(),
      tenantId: input.tenantId,
      email: inv.email.toLowerCase(),
      fullName: input.fullName,
      passwordHash: input.passwordHash,
      isActive: true,
      emailVerifiedAt: new Date(),
      roles: [inv.role],
    };
    this.users.set(user.id, user);
    return user;
  }

  async listBranches(tenantId: string) {
    return [...this.branches.values()].filter((b) => b.tenantId === tenantId);
  }

  async createBranch(input: Omit<BranchRecord, 'id'>) {
    const branch: BranchRecord = { ...input, id: crypto.randomUUID() };
    this.branches.set(branch.id, branch);
    return branch;
  }

  async updateBranch(
    tenantId: string,
    branchId: string,
    patch: Partial<Pick<BranchRecord, 'name' | 'city' | 'isPrimary'>>,
  ) {
    const b = this.branches.get(branchId);
    if (!b || b.tenantId !== tenantId) return null;
    const updated = { ...b, ...patch };
    this.branches.set(branchId, updated);
    return updated;
  }

  async deleteBranch(tenantId: string, branchId: string) {
    const b = this.branches.get(branchId);
    if (!b || b.tenantId !== tenantId) return false;
    return this.branches.delete(branchId);
  }
}
