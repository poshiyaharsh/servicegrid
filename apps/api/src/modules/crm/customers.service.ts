import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { gstinSchema } from '@servicegrid/validation';
import {
  CRM_STORE,
  type CommunicationChannel,
  type CrmStore,
  type CustomerType,
} from './crm.store';

@Injectable()
export class CustomersService {
  constructor(@Inject(CRM_STORE) private readonly store: CrmStore) {}

  async list(
    tenantId: string,
    query: { search?: string; customerType?: CustomerType; tag?: string; page?: number; limit?: number },
  ) {
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20)));
    return this.store.listCustomers(tenantId, {
      search: query.search,
      customerType: query.customerType,
      tag: query.tag,
      page,
      limit,
    });
  }

  async create(
    tenantId: string,
    actorUserId: string,
    input: {
      customerType?: CustomerType;
      displayName: string;
      companyName?: string;
      gstin?: string;
      primaryPhone: string;
      primaryEmail?: string;
      tags?: string[];
      notes?: string;
    },
  ) {
    if (!input.displayName?.trim() || !input.primaryPhone?.trim()) {
      throw new BadRequestException('displayName and primaryPhone are required');
    }
    if (input.gstin) {
      const check = gstinSchema.safeParse(input.gstin);
      if (!check.success) {
        throw new BadRequestException(check.error.issues[0]?.message ?? 'Invalid GSTIN');
      }
    }
    return this.store.createCustomer({
      tenantId,
      actorUserId,
      customerType: input.customerType ?? 'INDIVIDUAL',
      displayName: input.displayName.trim(),
      companyName: input.companyName?.trim() ?? null,
      gstin: input.gstin?.trim().toUpperCase() ?? null,
      primaryPhone: input.primaryPhone.trim(),
      primaryEmail: input.primaryEmail?.trim().toLowerCase() ?? null,
      tags: input.tags ?? [],
      notes: input.notes ?? null,
    });
  }

  async getProfile(tenantId: string, customerId: string) {
    const profile = await this.store.getCustomerProfile(tenantId, customerId);
    if (!profile) throw new NotFoundException('Customer not found');
    return profile;
  }

  async update(
    tenantId: string,
    customerId: string,
    actorUserId: string,
    patch: {
      displayName?: string;
      companyName?: string;
      gstin?: string;
      primaryPhone?: string;
      primaryEmail?: string;
      tags?: string[];
      notes?: string;
      isActive?: boolean;
    },
  ) {
    if (patch.gstin) {
      const check = gstinSchema.safeParse(patch.gstin);
      if (!check.success) {
        throw new BadRequestException(check.error.issues[0]?.message ?? 'Invalid GSTIN');
      }
    }
    const updated = await this.store.updateCustomer(tenantId, customerId, patch, actorUserId);
    if (!updated) throw new NotFoundException('Customer not found');
    return updated;
  }

  async addContact(
    tenantId: string,
    customerId: string,
    input: { name: string; role?: string; phone: string; email?: string; isPrimary?: boolean },
  ) {
    const contact = await this.store.addContact(tenantId, customerId, input);
    if (!contact) throw new NotFoundException('Customer not found');
    return contact;
  }

  async deleteContact(tenantId: string, customerId: string, contactId: string) {
    const deleted = await this.store.deleteContact(tenantId, customerId, contactId);
    if (!deleted) throw new NotFoundException('Contact not found');
    return { deleted: true };
  }

  async addAddress(
    tenantId: string,
    customerId: string,
    input: {
      label?: string;
      line1: string;
      line2?: string;
      city: string;
      state: string;
      postalCode: string;
      country?: string;
      isPrimary?: boolean;
    },
  ) {
    const address = await this.store.addAddress(tenantId, customerId, input);
    if (!address) throw new NotFoundException('Customer not found');
    return address;
  }

  async deleteAddress(tenantId: string, customerId: string, addressId: string) {
    const deleted = await this.store.deleteAddress(tenantId, customerId, addressId);
    if (!deleted) throw new NotFoundException('Address not found');
    return { deleted: true };
  }

  async logCommunication(
    tenantId: string,
    customerId: string,
    actorUserId: string,
    input: { channel: CommunicationChannel; direction: 'INBOUND' | 'OUTBOUND'; summary: string },
  ) {
    const conv = await this.store.logCommunication(tenantId, customerId, {
      ...input,
      createdByUserId: actorUserId,
    });
    if (!conv) throw new NotFoundException('Customer not found');
    return conv;
  }

  async getTimeline(tenantId: string, customerId: string) {
    return this.store.getTimeline(tenantId, customerId);
  }

  async addAsset(
    tenantId: string,
    customerId: string,
    input: {
      name: string;
      category: string;
      manufacturer?: string;
      modelName?: string;
      serialNumber?: string;
      installedAt?: string;
      warrantyExpiresAt?: string;
      notes?: string;
    },
  ) {
    const asset = await this.store.addAsset(tenantId, customerId, {
      ...input,
      installedAt: input.installedAt ? new Date(input.installedAt) : undefined,
      warrantyExpiresAt: input.warrantyExpiresAt ? new Date(input.warrantyExpiresAt) : undefined,
    });
    if (!asset) throw new NotFoundException('Customer not found');
    return asset;
  }

  async listAssets(tenantId: string, customerId: string) {
    return this.store.listAssets(tenantId, customerId);
  }

  async addServiceHistory(
    tenantId: string,
    customerId: string,
    input: { assetId?: string; summary: string; servicedAt?: string; technicianName?: string; notes?: string },
  ) {
    const rec = await this.store.addServiceHistory(tenantId, customerId, {
      ...input,
      servicedAt: input.servicedAt ? new Date(input.servicedAt) : undefined,
    });
    if (!rec) throw new NotFoundException('Customer not found');
    return rec;
  }

  async importCsv(tenantId: string, actorUserId: string, csvText: string) {
    const lines = csvText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length < 2) {
      throw new BadRequestException('CSV must include a header row and at least one data row');
    }

    const headers = lines[0]!.split(',').map((h) => h.trim().toLowerCase());
    const nameIdx = headers.indexOf('displayname');
    const phoneIdx = headers.indexOf('primaryphone');
    const typeIdx = headers.indexOf('customertype');
    const companyIdx = headers.indexOf('companyname');
    const emailIdx = headers.indexOf('primaryemail');

    if (nameIdx === -1 || phoneIdx === -1) {
      throw new BadRequestException('CSV header must include displayName and primaryPhone columns');
    }

    let imported = 0;
    const errors: Array<{ row: number; message: string }> = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i]!.split(',').map((c) => c.trim());
      const displayName = cols[nameIdx] ?? '';
      const primaryPhone = cols[phoneIdx] ?? '';
      if (!displayName || !primaryPhone) {
        errors.push({ row: i + 1, message: 'Missing displayName or primaryPhone' });
        continue;
      }
      const rawType = (typeIdx >= 0 ? cols[typeIdx] : 'INDIVIDUAL')?.toUpperCase();
      const customerType: CustomerType = rawType === 'BUSINESS' ? 'BUSINESS' : 'INDIVIDUAL';

      await this.store.createCustomer({
        tenantId,
        actorUserId,
        customerType,
        displayName,
        companyName: companyIdx >= 0 ? cols[companyIdx] || null : null,
        primaryPhone,
        primaryEmail: emailIdx >= 0 ? cols[emailIdx] || null : null,
      });
      imported++;
    }

    return { imported, failed: errors.length, errors };
  }

  async exportCsv(tenantId: string): Promise<string> {
    const { items } = await this.store.listCustomers(tenantId, { page: 1, limit: 1000 });
    const header = 'id,customerType,displayName,companyName,gstin,primaryPhone,primaryEmail,tags';
    const rows = items.map((c) =>
      [
        c.id,
        c.customerType,
        this.csvEscape(c.displayName),
        this.csvEscape(c.companyName ?? ''),
        this.csvEscape(c.gstin ?? ''),
        this.csvEscape(c.primaryPhone),
        this.csvEscape(c.primaryEmail ?? ''),
        this.csvEscape(c.tags.join(';')),
      ].join(','),
    );
    return [header, ...rows].join('\n');
  }

  private csvEscape(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}
