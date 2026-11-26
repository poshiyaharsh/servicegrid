import { Injectable } from '@nestjs/common';
import { withTenantTransaction } from '@servicegrid/database';
import type {
  AddressRecord,
  CommunicationChannel,
  CrmStore,
  CustomerActivityRecord,
  CustomerRecord,
  CustomerType,
  LeadRecord,
  LeadStatus,
} from './crm.store';

@Injectable()
export class PrismaCrmStore implements CrmStore {
  async listCustomers(
    tenantId: string,
    query: { search?: string; customerType?: CustomerType; tag?: string; page: number; limit: number },
  ) {
    return withTenantTransaction(tenantId, async (tx) => {
      const where = {
        tenantId,
        ...(query.customerType ? { customerType: query.customerType } : {}),
        ...(query.tag ? { tags: { has: query.tag } } : {}),
        ...(query.search
          ? {
              OR: [
                { displayName: { contains: query.search, mode: 'insensitive' as const } },
                { companyName: { contains: query.search, mode: 'insensitive' as const } },
                { primaryPhone: { contains: query.search } },
                { primaryEmail: { contains: query.search, mode: 'insensitive' as const } },
                { gstin: { contains: query.search, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      };

      const [items, total] = await Promise.all([
        tx.customer.findMany({
          where,
          skip: (query.page - 1) * query.limit,
          take: query.limit,
          orderBy: { createdAt: 'desc' },
        }),
        tx.customer.count({ where }),
      ]);

      return { items: items as CustomerRecord[], total };
    });
  }

  async createCustomer(input: {
    tenantId: string;
    customerType: CustomerType;
    displayName: string;
    companyName?: string | null;
    gstin?: string | null;
    primaryPhone: string;
    primaryEmail?: string | null;
    tags?: string[];
    notes?: string | null;
    actorUserId?: string;
  }) {
    return withTenantTransaction(input.tenantId, async (tx) => {
      const customer = await tx.customer.create({
        data: {
          tenantId: input.tenantId,
          customerType: input.customerType,
          displayName: input.displayName,
          companyName: input.companyName ?? null,
          gstin: input.gstin ?? null,
          primaryPhone: input.primaryPhone,
          primaryEmail: input.primaryEmail ?? null,
          tags: input.tags ?? [],
          notes: input.notes ?? null,
        },
      });

      await tx.customerActivity.create({
        data: {
          tenantId: input.tenantId,
          customerId: customer.id,
          activityType: 'CUSTOMER_CREATED',
          title: `Customer profile created (${customer.customerType})`,
          actorUserId: input.actorUserId ?? null,
        },
      });

      return customer as CustomerRecord;
    });
  }

  async getCustomerProfile(
    tenantId: string,
    customerId: string,
  ): Promise<Awaited<ReturnType<CrmStore['getCustomerProfile']>>> {
    return withTenantTransaction(tenantId, async (tx) => {
      const customer = await tx.customer.findFirst({ where: { id: customerId, tenantId } });
      if (!customer) return null;

      const [contacts, addresses, assets, serviceHistory, conversations, timeline] = await Promise.all([
        tx.customerContact.findMany({ where: { tenantId, customerId } }),
        tx.address.findMany({ where: { tenantId, customerId } }),
        tx.asset.findMany({ where: { tenantId, customerId }, orderBy: { createdAt: 'desc' } }),
        tx.serviceHistory.findMany({ where: { tenantId, customerId }, orderBy: { servicedAt: 'desc' } }),
        tx.conversation.findMany({ where: { tenantId, customerId }, orderBy: { occurredAt: 'desc' } }),
        tx.customerActivity.findMany({ where: { tenantId, customerId }, orderBy: { createdAt: 'desc' } }),
      ]);

      return {
        customer: customer as CustomerRecord,
        contacts,
        addresses,
        assets,
        serviceHistory,
        conversations: conversations.map((c) => ({
          ...c,
          channel: c.channel as CommunicationChannel,
          direction: c.direction as 'INBOUND' | 'OUTBOUND',
        })),
        timeline: timeline as CustomerActivityRecord[],
      };
    });
  }

  async updateCustomer(
    tenantId: string,
    customerId: string,
    patch: Partial<
      Pick<
        CustomerRecord,
        'displayName' | 'companyName' | 'gstin' | 'primaryPhone' | 'primaryEmail' | 'tags' | 'notes' | 'isActive'
      >
    >,
    actorUserId?: string,
  ) {
    return withTenantTransaction(tenantId, async (tx) => {
      const existing = await tx.customer.findFirst({ where: { id: customerId, tenantId } });
      if (!existing) return null;

      const updated = await tx.customer.update({ where: { id: customerId }, data: patch });
      await tx.customerActivity.create({
        data: {
          tenantId,
          customerId,
          activityType: 'CUSTOMER_UPDATED',
          title: 'Customer profile updated',
          actorUserId: actorUserId ?? null,
        },
      });
      return updated as CustomerRecord;
    });
  }

  async addContact(
    tenantId: string,
    customerId: string,
    input: { name: string; role?: string; phone: string; email?: string; isPrimary?: boolean },
  ) {
    return withTenantTransaction(tenantId, async (tx) => {
      const customer = await tx.customer.findFirst({ where: { id: customerId, tenantId } });
      if (!customer) return null;

      return tx.customerContact.create({
        data: {
          tenantId,
          customerId,
          name: input.name,
          role: input.role ?? null,
          phone: input.phone,
          email: input.email ?? null,
          isPrimary: input.isPrimary ?? false,
        },
      });
    });
  }

  async deleteContact(tenantId: string, customerId: string, contactId: string) {
    return withTenantTransaction(tenantId, async (tx) => {
      const res = await tx.customerContact.deleteMany({ where: { id: contactId, customerId, tenantId } });
      return res.count > 0;
    });
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
  ): Promise<AddressRecord | null> {
    return withTenantTransaction(tenantId, async (tx) => {
      const customer = await tx.customer.findFirst({ where: { id: customerId, tenantId } });
      if (!customer) return null;

      return tx.address.create({
        data: {
          tenantId,
          customerId,
          label: input.label ?? 'Primary',
          line1: input.line1,
          line2: input.line2 ?? null,
          city: input.city,
          state: input.state,
          postalCode: input.postalCode,
          country: input.country ?? 'IN',
          isPrimary: input.isPrimary ?? false,
        },
      });
    });
  }

  async deleteAddress(tenantId: string, customerId: string, addressId: string) {
    return withTenantTransaction(tenantId, async (tx) => {
      const res = await tx.address.deleteMany({ where: { id: addressId, customerId, tenantId } });
      return res.count > 0;
    });
  }

  async logCommunication(
    tenantId: string,
    customerId: string,
    input: {
      channel: CommunicationChannel;
      direction: 'INBOUND' | 'OUTBOUND';
      summary: string;
      createdByUserId?: string;
    },
  ) {
    return withTenantTransaction(tenantId, async (tx) => {
      const customer = await tx.customer.findFirst({ where: { id: customerId, tenantId } });
      if (!customer) return null;

      const conv = await tx.conversation.create({
        data: {
          tenantId,
          customerId,
          channel: input.channel,
          direction: input.direction,
          summary: input.summary,
          createdByUserId: input.createdByUserId ?? null,
        },
      });

      await tx.customerActivity.create({
        data: {
          tenantId,
          customerId,
          activityType: 'COMMUNICATION_LOGGED',
          title: `${input.direction} ${input.channel} communication`,
          actorUserId: input.createdByUserId ?? null,
        },
      });

      return {
        ...conv,
        channel: conv.channel as CommunicationChannel,
        direction: conv.direction as 'INBOUND' | 'OUTBOUND',
      };
    });
  }

  async getTimeline(tenantId: string, customerId: string) {
    return withTenantTransaction(tenantId, async (tx) => {
      const rows = await tx.customerActivity.findMany({
        where: { tenantId, customerId },
        orderBy: { createdAt: 'desc' },
      });
      return rows as CustomerActivityRecord[];
    });
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
      installedAt?: Date;
      warrantyExpiresAt?: Date;
      notes?: string;
    },
  ) {
    return withTenantTransaction(tenantId, async (tx) => {
      const customer = await tx.customer.findFirst({ where: { id: customerId, tenantId } });
      if (!customer) return null;

      const asset = await tx.asset.create({
        data: {
          tenantId,
          customerId,
          name: input.name,
          category: input.category,
          manufacturer: input.manufacturer ?? null,
          modelName: input.modelName ?? null,
          serialNumber: input.serialNumber ?? null,
          installedAt: input.installedAt ?? null,
          warrantyExpiresAt: input.warrantyExpiresAt ?? null,
          notes: input.notes ?? null,
        },
      });

      await tx.customerActivity.create({
        data: {
          tenantId,
          customerId,
          activityType: 'ASSET_REGISTERED',
          title: `Registered asset: ${asset.name}`,
        },
      });

      return asset;
    });
  }

  async listAssets(tenantId: string, customerId: string) {
    return withTenantTransaction(tenantId, (tx) =>
      tx.asset.findMany({ where: { tenantId, customerId }, orderBy: { createdAt: 'desc' } }),
    );
  }

  async addServiceHistory(
    tenantId: string,
    customerId: string,
    input: { assetId?: string; summary: string; servicedAt?: Date; technicianName?: string; notes?: string },
  ) {
    return withTenantTransaction(tenantId, async (tx) => {
      const customer = await tx.customer.findFirst({ where: { id: customerId, tenantId } });
      if (!customer) return null;

      const record = await tx.serviceHistory.create({
        data: {
          tenantId,
          customerId,
          assetId: input.assetId ?? null,
          summary: input.summary,
          servicedAt: input.servicedAt ?? new Date(),
          technicianName: input.technicianName ?? null,
          notes: input.notes ?? null,
        },
      });

      await tx.customerActivity.create({
        data: {
          tenantId,
          customerId,
          activityType: 'SERVICE_RECORDED',
          title: `Service recorded: ${record.summary}`,
        },
      });

      return record;
    });
  }

  async listLeads(tenantId: string, status?: LeadStatus) {
    return withTenantTransaction(tenantId, async (tx) => {
      const rows = await tx.lead.findMany({
        where: { tenantId, ...(status ? { status } : {}) },
        orderBy: { createdAt: 'desc' },
      });
      return rows as LeadRecord[];
    });
  }

  async createLead(input: {
    tenantId: string;
    name: string;
    phone: string;
    email?: string;
    source?: string;
    notes?: string;
    assignedToUserId?: string;
  }) {
    return withTenantTransaction(input.tenantId, async (tx) => {
      const lead = await tx.lead.create({
        data: {
          tenantId: input.tenantId,
          name: input.name,
          phone: input.phone,
          email: input.email ?? null,
          source: input.source ?? 'MANUAL',
          notes: input.notes ?? null,
          assignedToUserId: input.assignedToUserId ?? null,
        },
      });
      return lead as LeadRecord;
    });
  }

  async updateLead(
    tenantId: string,
    leadId: string,
    patch: Partial<Pick<LeadRecord, 'status' | 'notes' | 'assignedToUserId'>>,
  ) {
    return withTenantTransaction(tenantId, async (tx) => {
      const existing = await tx.lead.findFirst({ where: { id: leadId, tenantId } });
      if (!existing) return null;
      const updated = await tx.lead.update({ where: { id: leadId }, data: patch });
      return updated as LeadRecord;
    });
  }

  async convertLeadToCustomer(
    tenantId: string,
    leadId: string,
    input: { customerType?: CustomerType; companyName?: string; actorUserId?: string },
  ) {
    return withTenantTransaction(tenantId, async (tx) => {
      const lead = await tx.lead.findFirst({ where: { id: leadId, tenantId } });
      if (!lead) return null;

      const customer = await tx.customer.create({
        data: {
          tenantId,
          customerType: input.customerType ?? 'INDIVIDUAL',
          displayName: lead.name,
          companyName: input.companyName ?? null,
          primaryPhone: lead.phone,
          primaryEmail: lead.email,
          notes: lead.notes,
        },
      });

      const updatedLead = await tx.lead.update({
        where: { id: lead.id },
        data: { status: 'CONVERTED', customerId: customer.id, convertedAt: new Date() },
      });

      await tx.customerActivity.create({
        data: {
          tenantId,
          customerId: customer.id,
          activityType: 'LEAD_CONVERTED',
          title: `Converted from lead (${lead.source})`,
          actorUserId: input.actorUserId ?? null,
        },
      });

      return { lead: updatedLead as LeadRecord, customer: customer as CustomerRecord };
    });
  }
}
