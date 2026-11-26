import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IDENTITY_STORE, type IdentityStore } from '../identity/identity.store';

@Injectable()
export class BranchesService {
  constructor(@Inject(IDENTITY_STORE) private readonly store: IdentityStore) {}

  async list(tenantId: string) {
    return this.store.listBranches(tenantId);
  }

  async create(tenantId: string, input: { name: string; code: string; city?: string; isPrimary?: boolean }) {
    return this.store.createBranch({
      tenantId,
      name: input.name,
      code: input.code.toUpperCase(),
      city: input.city ?? null,
      isPrimary: input.isPrimary ?? false,
    });
  }

  async update(tenantId: string, branchId: string, patch: { name?: string; city?: string; isPrimary?: boolean }) {
    const updated = await this.store.updateBranch(tenantId, branchId, patch);
    if (!updated) throw new NotFoundException('Branch not found');
    return updated;
  }

  async remove(tenantId: string, branchId: string) {
    const deleted = await this.store.deleteBranch(tenantId, branchId);
    if (!deleted) throw new NotFoundException('Branch not found');
    return { deleted: true };
  }
}
