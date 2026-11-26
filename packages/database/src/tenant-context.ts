import type { Prisma } from '@prisma/client';
import { prisma } from './index';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Executes a Prisma transaction with PostgreSQL session variable `app.current_tenant_id`
 * set locally so Row-Level Security (RLS) policies enforce tenant isolation at the DB layer.
 */
export async function withTenantTransaction<T>(
  tenantId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  if (!UUID_REGEX.test(tenantId)) {
    throw new Error('Invalid tenantId format for RLS context');
  }

  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SELECT set_config('app.current_tenant_id', $1, true)`, tenantId);
    return fn(tx);
  });
}
