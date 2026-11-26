import type { SystemRole } from '@servicegrid/types';

export interface TenantRecord {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  currency: string;
  isActive: boolean;
}

export interface BranchRecord {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  city: string | null;
  isPrimary: boolean;
}

export interface UserRecord {
  id: string;
  tenantId: string;
  email: string;
  fullName: string;
  passwordHash: string;
  isActive: boolean;
  emailVerifiedAt: Date | null;
  roles: SystemRole[];
}

export interface SessionRecord {
  id: string;
  tenantId: string;
  userId: string;
  refreshTokenHash: string;
  userAgent: string | null;
  ipAddress: string | null;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
}

export interface TokenRecord {
  id: string;
  tenantId: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
}

export interface InvitationRecord {
  id: string;
  tenantId: string;
  email: string;
  role: SystemRole;
  branchId: string | null;
  tokenHash: string;
  invitedByUserId: string;
  acceptedAt: Date | null;
  expiresAt: Date;
}

export const IDENTITY_STORE = Symbol('IDENTITY_STORE');

export interface IdentityStore {
  createTenantWithOwner(input: {
    tenantName: string;
    tenantSlug: string;
    timezone: string;
    currency: string;
    email: string;
    fullName: string;
    passwordHash: string;
  }): Promise<{ tenant: TenantRecord; branch: BranchRecord; user: UserRecord }>;

  findTenantById(tenantId: string): Promise<TenantRecord | null>;
  updateTenant(tenantId: string, patch: Partial<Pick<TenantRecord, 'name' | 'timezone' | 'currency'>>): Promise<TenantRecord>;

  findUserByEmailInTenant(tenantId: string, email: string): Promise<UserRecord | null>;
  findUserByEmailGlobal(email: string): Promise<UserRecord | null>;
  findUserById(tenantId: string, userId: string): Promise<UserRecord | null>;
  listUsers(tenantId: string): Promise<UserRecord[]>;
  updateUserStatus(tenantId: string, userId: string, isActive: boolean): Promise<UserRecord | null>;
  setUserRoles(tenantId: string, userId: string, roles: SystemRole[]): Promise<UserRecord | null>;
  markEmailVerified(tenantId: string, userId: string): Promise<void>;
  updatePassword(tenantId: string, userId: string, passwordHash: string): Promise<void>;

  createSession(input: Omit<SessionRecord, 'id' | 'revokedAt' | 'createdAt'>): Promise<SessionRecord>;
  findSessionById(tenantId: string, sessionId: string): Promise<SessionRecord | null>;
  listSessions(tenantId: string, userId: string): Promise<SessionRecord[]>;
  rotateSessionRefreshHash(tenantId: string, sessionId: string, newHash: string, expiresAt: Date): Promise<void>;
  revokeSession(tenantId: string, sessionId: string): Promise<boolean>;

  createEmailVerificationToken(input: Omit<TokenRecord, 'id' | 'usedAt'>): Promise<TokenRecord>;
  consumeEmailVerificationToken(tokenHash: string): Promise<TokenRecord | null>;

  createPasswordResetToken(input: Omit<TokenRecord, 'id' | 'usedAt'>): Promise<TokenRecord>;
  consumePasswordResetToken(tokenHash: string): Promise<TokenRecord | null>;

  createInvitation(input: Omit<InvitationRecord, 'id' | 'acceptedAt'>): Promise<InvitationRecord>;
  listInvitations(tenantId: string): Promise<InvitationRecord[]>;
  findInvitationByTokenHash(tokenHash: string): Promise<InvitationRecord | null>;
  acceptInvitation(input: {
    invitationId: string;
    tenantId: string;
    fullName: string;
    passwordHash: string;
  }): Promise<UserRecord>;

  listBranches(tenantId: string): Promise<BranchRecord[]>;
  createBranch(input: Omit<BranchRecord, 'id'>): Promise<BranchRecord>;
  updateBranch(
    tenantId: string,
    branchId: string,
    patch: Partial<Pick<BranchRecord, 'name' | 'city' | 'isPrimary'>>,
  ): Promise<BranchRecord | null>;
  deleteBranch(tenantId: string, branchId: string): Promise<boolean>;
}
