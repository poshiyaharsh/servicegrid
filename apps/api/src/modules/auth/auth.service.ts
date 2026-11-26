import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { loadConfig } from '@servicegrid/config';
import {
  generateOpaqueToken,
  hashPassword,
  hashToken,
  signJwt,
  verifyJwt,
  verifyPassword,
} from '../../common/security/crypto.util';
import { IDENTITY_STORE, type IdentityStore, type UserRecord } from '../identity/identity.store';

@Injectable()
export class AuthService {
  private readonly config = loadConfig();

  constructor(@Inject(IDENTITY_STORE) private readonly store: IdentityStore) {}

  async register(input: {
    organizationName: string;
    fullName: string;
    email: string;
    password: string;
    timezone?: string;
    currency?: string;
  }) {
    if (input.password.length < 10) {
      throw new BadRequestException('Password must be at least 10 characters');
    }

    const existing = await this.store.findUserByEmailGlobal(input.email);
    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    const slugBase = input.organizationName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48);
    const slug = `${slugBase || 'org'}-${generateOpaqueToken(3)}`;

    const passwordHash = await hashPassword(input.password);
    const { tenant, branch, user } = await this.store.createTenantWithOwner({
      tenantName: input.organizationName,
      tenantSlug: slug,
      timezone: input.timezone ?? 'Asia/Kolkata',
      currency: input.currency ?? 'INR',
      email: input.email,
      fullName: input.fullName,
      passwordHash,
    });

    const rawVerificationToken = generateOpaqueToken(24);
    await this.store.createEmailVerificationToken({
      tenantId: tenant.id,
      userId: user.id,
      tokenHash: hashToken(rawVerificationToken),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    const tokens = await this.issueSessionTokens(user);
    return {
      tenant,
      branch,
      user: this.sanitizeUser(user),
      ...tokens,
      ...(this.config.NODE_ENV !== 'production' ? { verificationToken: rawVerificationToken } : {}),
    };
  }

  async login(input: { email: string; password: string; userAgent?: string; ipAddress?: string }) {
    const user = await this.store.findUserByEmailGlobal(input.email);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await verifyPassword(input.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.issueSessionTokens(user, input.userAgent, input.ipAddress);
    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async refresh(refreshToken: string) {
    let payload;
    try {
      payload = verifyJwt(refreshToken, this.config.JWT_REFRESH_SECRET);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    const session = await this.store.findSessionById(payload.tenantId, payload.sessionId);
    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      throw new UnauthorizedException('Session has expired or been revoked');
    }

    if (session.refreshTokenHash !== hashToken(refreshToken)) {
      throw new UnauthorizedException('Refresh token mismatch');
    }

    const user = await this.store.findUserById(payload.tenantId, payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User account inactive');
    }

    const accessToken = signJwt(
      { sub: user.id, tenantId: user.tenantId, sessionId: session.id, roles: user.roles, type: 'access' },
      this.config.JWT_ACCESS_SECRET,
      15 * 60,
    );
    const nextRefreshToken = signJwt(
      { sub: user.id, tenantId: user.tenantId, sessionId: session.id, roles: user.roles, type: 'refresh' },
      this.config.JWT_REFRESH_SECRET,
      7 * 24 * 60 * 60,
    );

    await this.store.rotateSessionRefreshHash(
      user.tenantId,
      session.id,
      hashToken(nextRefreshToken),
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    );

    return { accessToken, refreshToken: nextRefreshToken };
  }

  async logout(tenantId: string, sessionId: string) {
    await this.store.revokeSession(tenantId, sessionId);
    return { loggedOut: true };
  }

  async listSessions(tenantId: string, userId: string) {
    const sessions = await this.store.listSessions(tenantId, userId);
    return sessions.map(({ refreshTokenHash: _omit, ...rest }) => rest);
  }

  async revokeSession(tenantId: string, sessionId: string) {
    const revoked = await this.store.revokeSession(tenantId, sessionId);
    if (!revoked) {
      throw new BadRequestException('Session not found or already revoked');
    }
    return { revoked: true };
  }

  async verifyEmail(rawToken: string) {
    const token = await this.store.consumeEmailVerificationToken(hashToken(rawToken));
    if (!token) {
      throw new BadRequestException('Invalid or expired verification token');
    }
    await this.store.markEmailVerified(token.tenantId, token.userId);
    return { verified: true };
  }

  async forgotPassword(email: string) {
    const user = await this.store.findUserByEmailGlobal(email);
    if (!user) {
      return { sent: true };
    }
    const rawToken = generateOpaqueToken(24);
    await this.store.createPasswordResetToken({
      tenantId: user.tenantId,
      userId: user.id,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });
    return {
      sent: true,
      ...(this.config.NODE_ENV !== 'production' ? { resetToken: rawToken } : {}),
    };
  }

  async resetPassword(rawToken: string, newPassword: string) {
    if (newPassword.length < 10) {
      throw new BadRequestException('Password must be at least 10 characters');
    }
    const token = await this.store.consumePasswordResetToken(hashToken(rawToken));
    if (!token) {
      throw new BadRequestException('Invalid or expired password reset token');
    }
    const passwordHash = await hashPassword(newPassword);
    await this.store.updatePassword(token.tenantId, token.userId, passwordHash);
    return { reset: true };
  }

  private async issueSessionTokens(user: UserRecord, userAgent?: string, ipAddress?: string) {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const tempRefresh = generateOpaqueToken(24);
    const session = await this.store.createSession({
      tenantId: user.tenantId,
      userId: user.id,
      refreshTokenHash: hashToken(tempRefresh),
      userAgent: userAgent ?? null,
      ipAddress: ipAddress ?? null,
      expiresAt,
    });

    const accessToken = signJwt(
      { sub: user.id, tenantId: user.tenantId, sessionId: session.id, roles: user.roles, type: 'access' },
      this.config.JWT_ACCESS_SECRET,
      15 * 60,
    );
    const refreshToken = signJwt(
      { sub: user.id, tenantId: user.tenantId, sessionId: session.id, roles: user.roles, type: 'refresh' },
      this.config.JWT_REFRESH_SECRET,
      7 * 24 * 60 * 60,
    );

    await this.store.rotateSessionRefreshHash(user.tenantId, session.id, hashToken(refreshToken), expiresAt);
    return { accessToken, refreshToken, sessionId: session.id };
  }

  private sanitizeUser(user: UserRecord) {
    const { passwordHash: _omit, ...safe } = user;
    return safe;
  }
}
