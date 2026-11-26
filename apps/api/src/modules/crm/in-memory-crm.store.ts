import crypto from 'node:crypto';
import type {
  AddressRecord,
  AssetRecord,
  CommunicationChannel,
  ConversationRecord,
  CrmStore,
  CustomerActivityRecord,
  CustomerContactRecord,
  CustomerRecord,
  CustomerType,
  LeadRecord,
  LeadStatus,
  ServiceHistoryRecord,
} from './crm.store';

export class InMemoryCrmStore implements CrmStore {
  private customers = new Map<string, CustomerRecord>();
  private contacts = new Map<string, CustomerContactRecord>();
  private addresses = new Map<string, AddressRecord>();
  private leads = new Map<string, LeadRecord>();
  private conversations = new Map<string, ConversationRecord>();
  private activities = new Map<string, CustomerActivityRecord>();
  private assets = new Map<string, AssetRecord>();
  private serviceHistory = new Map<string, ServiceHistoryRecord>();

  async listCustomers(
    tenantId: string,
    query: { search?: string; customerType?: CustomerType; tag?: string; page: number; limit: number },
  ) {
    let rows = [...this.customers.values()].filter((c) => c.tenantId === tenantId);
    if (query.customerType) rows = rows.filter((c) => c.customerType === query.customerType);
    if (query.tag) rows = rows.filter((c) => c.tags.includes(query.tag!));
    if (query.search) {
      const q = query.search.toLowerCase();
      rows = rows.filter(
        (c) =>
          c.displayName.toLowerCase().includes(q) ||
          (c.companyName?.toLowerCase().includes(q) ?? false) ||
          c.primaryPhone.includes(query.search!) ||
          (c.primaryEmail?.toLowerCase().includes(q) ?? false) ||
          (c.gstin?.toLowerCase().includes(q) ?? false),
      );
    }
    const start = (query.page - 1) * query.limit;
    return { items: rows.slice(start, start + query.limit), total: rows.length };
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
    const now = new Date();
    const customer: CustomerRecord = {
      id: crypto.randomUUID(),
      tenantId: input.tenantId,
      customerType: input.customerType,
      displayName: input.displayName,
      companyName: input.companyName ?? null,
      gstin: input.gstin ?? null,
      primaryPhone: input.primaryPhone,
      primaryEmail: input.primaryEmail ?? null,
      tags: input.tags ?? [],
      notes: input.notes ?? null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
    this.customers.set(customer.id, customer);
    this.recordActivity(
      input.tenantId,
      customer.id,
      'CUSTOMER_CREATED',
      `Customer profile created (${customer.customerType})`,
      input.actorUserId ?? null,
    );
    return customer;
  }

  async getCustomerProfile(tenantId: string, customerId: string) {
    const customer = this.customers.get(customerId);
    if (!customer || customer.tenantId !== tenantId) return null;

    return {
      customer,
      contacts: [...this.contacts.values()].filter((c) => c.tenantId === tenantId && c.customerId === customerId),
      addresses: [...this.addresses.values()].filter((a) => a.tenantId === tenantId && a.customerId === customerId),
      assets: [...this.assets.values()].filter((a) => a.tenantId === tenantId && a.customerId === customerId),
      serviceHistory: [...this.serviceHistory.values()].filter(
        (s) => s.tenantId === tenantId && s.customerId === customerId,
      ),
      conversations: [...this.conversations.values()].filter(
        (c) => c.tenantId === tenantId && c.customerId === customerId,
      ),
      timeline: await this.getTimeline(tenantId, customerId),
    };
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
    const c = this.customers.get(customerId);
    if (!c || c.tenantId !== tenantId) return null;
    const updated = { ...c, ...patch, updatedAt: new Date() };
    this.customers.set(customerId, updated);
    this.recordActivity(tenantId, customerId, 'CUSTOMER_UPDATED', 'Customer profile updated', actorUserId ?? null);
    return updated;
  }

  async addContact(
    tenantId: string,
    customerId: string,
    input: { name: string; role?: string; phone: string; email?: string; isPrimary?: boolean },
  ) {
    const c = this.customers.get(customerId);
    if (!c || c.tenantId !== tenantId) return null;
    const contact: CustomerContactRecord = {
      id: crypto.randomUUID(),
      tenantId,
      customerId,
      name: input.name,
      role: input.role ?? null,
      phone: input.phone,
      email: input.email ?? null,
      isPrimary: input.isPrimary ?? false,
    };
    this.contacts.set(contact.id, contact);
    return contact;
  }

  async deleteContact(tenantId: string, customerId: string, contactId: string) {
    const contact = this.contacts.get(contactId);
    if (!contact || contact.tenantId !== tenantId || contact.customerId !== customerId) return false;
    return this.contacts.delete(contactId);
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
    const c = this.customers.get(customerId);
    if (!c || c.tenantId !== tenantId) return null;
    const address: AddressRecord = {
      id: crypto.randomUUID(),
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
    };
    this.addresses.set(address.id, address);
    return address;
  }

  async deleteAddress(tenantId: string, customerId: string, addressId: string) {
    const addr = this.addresses.get(addressId);
    if (!addr || addr.tenantId !== tenantId || addr.customerId !== customerId) return false;
    return this.addresses.delete(addressId);
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
    const c = this.customers.get(customerId);
    if (!c || c.tenantId !== tenantId) return null;
    const conv: ConversationRecord = {
      id: crypto.randomUUID(),
      tenantId,
      customerId,
      channel: input.channel,
      direction: input.direction,
      summary: input.summary,
      occurredAt: new Date(),
      createdByUserId: input.createdByUserId ?? null,
    };
    this.conversations.set(conv.id, conv);
    this.recordActivity(
      tenantId,
      customerId,
      'COMMUNICATION_LOGGED',
      `${input.direction} ${input.channel} communication`,
      input.createdByUserId ?? null,
    );
    return conv;
  }

  async getTimeline(tenantId: string, customerId: string) {
    return [...this.activities.values()]
      .filter((a) => a.tenantId === tenantId && a.customerId === customerId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
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
    const c = this.customers.get(customerId);
    if (!c || c.tenantId !== tenantId) return null;
    const asset: AssetRecord = {
      id: crypto.randomUUID(),
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
    };
    this.assets.set(asset.id, asset);
    this.recordActivity(tenantId, customerId, 'ASSET_REGISTERED', `Registered asset: ${asset.name}`, null);
    return asset;
  }

  async listAssets(tenantId: string, customerId: string) {
    return [...this.assets.values()].filter((a) => a.tenantId === tenantId && a.customerId === customerId);
  }

  async addServiceHistory(
    tenantId: string,
    customerId: string,
    input: { assetId?: string; summary: string; servicedAt?: Date; technicianName?: string; notes?: string },
  ) {
    const c = this.customers.get(customerId);
    if (!c || c.tenantId !== tenantId) return null;
    const rec: ServiceHistoryRecord = {
      id: crypto.randomUUID(),
      tenantId,
      customerId,
      assetId: input.assetId ?? null,
      summary: input.summary,
      servicedAt: input.servicedAt ?? new Date(),
      technicianName: input.technicianName ?? null,
      notes: input.notes ?? null,
    };
    this.serviceHistory.set(rec.id, rec);
    this.recordActivity(tenantId, customerId, 'SERVICE_RECORDED', `Service recorded: ${rec.summary}`, null);
    return rec;
  }

  async listLeads(tenantId: string, status?: LeadStatus) {
    return [...this.leads.values()].filter((l) => l.tenantId === tenantId && (!status || l.status === status));
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
    const lead: LeadRecord = {
      id: crypto.randomUUID(),
      tenantId: input.tenantId,
      customerId: null,
      name: input.name,
      phone: input.phone,
      email: input.email ?? null,
      source: input.source ?? 'MANUAL',
      status: 'NEW',
      notes: input.notes ?? null,
      assignedToUserId: input.assignedToUserId ?? null,
      convertedAt: null,
      createdAt: new Date(),
    };
    this.leads.set(lead.id, lead);
    return lead;
  }

  async updateLead(
    tenantId: string,
    leadId: string,
    patch: Partial<Pick<LeadRecord, 'status' | 'notes' | 'assignedToUserId'>>,
  ) {
    const lead = this.leads.get(leadId);
    if (!lead || lead.tenantId !== tenantId) return null;
    const updated = { ...lead, ...patch };
    this.leads.set(leadId, updated);
    return updated;
  }

  async convertLeadToCustomer(
    tenantId: string,
    leadId: string,
    input: { customerType?: CustomerType; companyName?: string; actorUserId?: string },
  ) {
    const lead = this.leads.get(leadId);
    if (!lead || lead.tenantId !== tenantId) return null;

    const customer = await this.createCustomer({
      tenantId,
      customerType: input.customerType ?? 'INDIVIDUAL',
      displayName: lead.name,
      companyName: input.companyName ?? null,
      primaryPhone: lead.phone,
      primaryEmail: lead.email,
      notes: lead.notes,
      actorUserId: input.actorUserId,
    });

    const updatedLead: LeadRecord = {
      ...lead,
      status: 'CONVERTED',
      customerId: customer.id,
      convertedAt: new Date(),
    };
    this.leads.set(leadId, updatedLead);
    return { lead: updatedLead, customer };
  }

  private recordActivity(
    tenantId: string,
    customerId: string,
    activityType: string,
    title: string,
    actorUserId: string | null,
  ) {
    const act: CustomerActivityRecord = {
      id: crypto.randomUUID(),
      tenantId,
      customerId,
      activityType,
      title,
      metadata: null,
      actorUserId,
      createdAt: new Date(),
    };
    this.activities.set(act.id, act);
  }
}
