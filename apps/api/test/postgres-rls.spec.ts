import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { after, describe, it } from 'node:test';
import { prisma } from '@servicegrid/database';

const runLiveDbTests = Boolean(process.env.DATABASE_URL);

describe('Live PostgreSQL Row-Level Security (RLS)', { skip: !runLiveDbTests }, () => {
  const createdTenantIds: string[] = [];

  after(async () => {
    if (createdTenantIds.length > 0) {
      await prisma.tenant.deleteMany({ where: { id: { in: createdTenantIds } } });
    }
    await prisma.$disconnect();
  });

  it('isolates tenant rows and blocks cross-tenant inserts under servicegrid_app role', async () => {
    const suffix = crypto.randomBytes(4).toString('hex');
    const tenantA = await prisma.tenant.create({
      data: { name: `RLS Tenant A ${suffix}`, slug: `rls-a-${suffix}` },
    });
    const tenantB = await prisma.tenant.create({
      data: { name: `RLS Tenant B ${suffix}`, slug: `rls-b-${suffix}` },
    });
    createdTenantIds.push(tenantA.id, tenantB.id);

    await prisma.branch.create({
      data: { tenantId: tenantA.id, name: 'A HQ', code: 'HQ', isPrimary: true },
    });
    await prisma.branch.create({
      data: { tenantId: tenantB.id, name: 'B HQ', code: 'HQ', isPrimary: true },
    });

    // Under non-superuser role servicegrid_app with Tenant A context, only Tenant A branches are visible
    const visibleToA = await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SET LOCAL ROLE servicegrid_app`);
      await tx.$executeRawUnsafe(`SELECT set_config('app.current_tenant_id', $1, true)`, tenantA.id);
      return tx.branch.findMany();
    });

    assert.equal(visibleToA.length, 1);
    assert.equal(visibleToA[0]?.tenantId, tenantA.id);

    // Cross-tenant INSERT under Tenant A context for Tenant B must fail at PostgreSQL RLS layer
    await assert.rejects(
      () =>
        prisma.$transaction(async (tx) => {
          await tx.$executeRawUnsafe(`SET LOCAL ROLE servicegrid_app`);
          await tx.$executeRawUnsafe(
            `SELECT set_config('app.current_tenant_id', $1, true)`,
            tenantA.id,
          );
          await tx.branch.create({
            data: { tenantId: tenantB.id, name: 'Hijacked', code: 'HIJ' },
          });
        }),
      /row-level security policy/i,
    );
  });
});
