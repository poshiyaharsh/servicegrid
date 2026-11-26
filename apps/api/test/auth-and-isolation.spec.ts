import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ForbiddenException, NotFoundException, UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from '../src/common/security/jwt-auth.guard';
import { PermissionsGuard } from '../src/common/security/permissions.guard';
import { AuthService } from '../src/modules/auth/auth.service';
import { BranchesService } from '../src/modules/branches/branches.service';
import { InMemoryIdentityStore } from '../src/modules/identity/in-memory-identity.store';
import { OrganizationsService } from '../src/modules/organizations/organizations.service';
import { UsersService } from '../src/modules/users/users.service';

function mockExecutionContext(
  headers: Record<string, string>,
  user?: unknown,
): ExecutionContext {
  const req = { headers, user };
  return {
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => (() => undefined),
    getClass: () => class Dummy {},
  } as unknown as ExecutionContext;
}

describe('Phase 04 — Auth, RBAC & Cross-Tenant Isolation', () => {
  it('supports register, email verify, login, refresh rotation, logout, and password reset', async () => {
    const store = new InMemoryIdentityStore();
    const auth = new AuthService(store);

    const reg = await auth.register({
      organizationName: 'CoolAir Services',
      fullName: 'Rajesh Sharma',
      email: 'rajesh@coolair.in',
      password: 'StrongPassword123!',
    });

    assert.equal(reg.tenant.name, 'CoolAir Services');
    assert.equal(reg.branch.code, 'HQ');
    assert.deepEqual(reg.user.roles, ['ORGANIZATION_OWNER']);
    assert.ok(reg.verificationToken);

    const verified = await auth.verifyEmail(reg.verificationToken!);
    assert.equal(verified.verified, true);

    const refreshed = await auth.refresh(reg.refreshToken);
    assert.ok(refreshed.accessToken);
    assert.ok(refreshed.refreshToken);

    await auth.logout(reg.tenant.id, reg.sessionId);
    await assert.rejects(() => auth.refresh(refreshed.refreshToken), UnauthorizedException);

    const forgot = await auth.forgotPassword('rajesh@coolair.in');
    assert.ok(forgot.resetToken);
    await auth.resetPassword(forgot.resetToken!, 'NewStrongPassword456!');

    const loggedIn = await auth.login({
      email: 'rajesh@coolair.in',
      password: 'NewStrongPassword456!',
    });
    assert.equal(loggedIn.user.email, 'rajesh@coolair.in');
  });

  it('enforces RBAC permissions and blocks cross-tenant access attempts', async () => {
    const store = new InMemoryIdentityStore();
    const auth = new AuthService(store);
    const orgs = new OrganizationsService(store);
    const branches = new BranchesService(store);
    const users = new UsersService(store);

    const tenantA = await auth.register({
      organizationName: 'Alpha HVAC',
      fullName: 'Owner A',
      email: 'owner@alpha.in',
      password: 'StrongPassword123!',
    });

    const tenantB = await auth.register({
      organizationName: 'Beta Solar',
      fullName: 'Owner B',
      email: 'owner@beta.in',
      password: 'StrongPassword123!',
    });

    // Invite technician to Tenant A
    const inv = await orgs.inviteMember({
      tenantId: tenantA.tenant.id,
      invitedByUserId: tenantA.user.id,
      email: 'tech@alpha.in',
      role: 'TECHNICIAN',
    });
    const techUser = await orgs.acceptInvitation({
      token: inv.invitationToken!,
      fullName: 'Vikram Tech',
      password: 'TechPassword123!',
    });
    assert.deepEqual(techUser.roles, ['TECHNICIAN']);

    // Guard blocks spoofed x-tenant-id header
    const jwtGuard = new JwtAuthGuard();
    const spoofedCtx = mockExecutionContext({
      authorization: `Bearer ${tenantA.accessToken}`,
      'x-tenant-id': tenantB.tenant.id,
    });
    assert.throws(() => jwtGuard.canActivate(spoofedCtx), ForbiddenException);

    // Valid Tenant A token succeeds
    const validCtx = mockExecutionContext({
      authorization: `Bearer ${tenantA.accessToken}`,
    });
    assert.equal(jwtGuard.canActivate(validCtx), true);

    // PermissionsGuard blocks TECHNICIAN from org:manage
    const reflector = {
      getAllAndOverride: () => ['org:manage'],
    } as unknown as Reflector;
    const permGuard = new PermissionsGuard(reflector);
    const techCtx = mockExecutionContext(
      {},
      { userId: techUser.id, tenantId: tenantA.tenant.id, sessionId: 's1', roles: ['TECHNICIAN'] },
    );
    assert.throws(() => permGuard.canActivate(techCtx), ForbiddenException);

    // Cross-tenant branch & user isolation
    const branchB = await branches.create(tenantB.tenant.id, {
      name: 'Pune West',
      code: 'PNQ',
      city: 'Pune',
    });

    await assert.rejects(
      () => branches.update(tenantA.tenant.id, branchB.id, { name: 'Hijacked' }),
      NotFoundException,
    );
    await assert.rejects(
      () => branches.remove(tenantA.tenant.id, branchB.id),
      NotFoundException,
    );
    await assert.rejects(
      () => users.getById(tenantA.tenant.id, tenantB.user.id),
      NotFoundException,
    );
  });
});
