export type CustomerType = 'INDIVIDUAL' | 'BUSINESS';
export type LeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'CONVERTED' | 'LOST';
export type CommunicationChannel = 'WHATSAPP' | 'PHONE' | 'EMAIL' | 'SMS' | 'PORTAL';

export interface CustomerRecord {
  id: string;
  tenantId: string;
  customerType: CustomerType;
  displayName: string;
  companyName: string | null;
  gstin: string | null;
  primaryPhone: string;
  primaryEmail: string | null;
  tags: string[];
  notes: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerContactRecord {
  id: string;
  tenantId: string;
  customerId: string;
  name: string;
  role: string | null;
  phone: string;
  email: string | null;
  isPrimary: boolean;
}

export interface AddressRecord {
  id: string;
  tenantId: string;
  customerId: string;
  label: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isPrimary: boolean;
}

export interface LeadRecord {
  id: string;
  tenantId: string;
  customerId: string | null;
  name: string;
  phone: string;
  email: string | null;
  source: string;
  status: LeadStatus;
  notes: string | null;
  assignedToUserId: string | null;
  convertedAt: Date | null;
  createdAt: Date;
}

export interface ConversationRecord {
  id: string;
  tenantId: string;
  customerId: string;
  channel: CommunicationChannel;
  direction: 'INBOUND' | 'OUTBOUND';
  summary: string;
  occurredAt: Date;
  createdByUserId: string | null;
}

export interface CustomerActivityRecord {
  id: string;
  tenantId: string;
  customerId: string;
  activityType: string;
  title: string;
  metadata: Record<string, unknown> | null;
  actorUserId: string | null;
  createdAt: Date;
}

export interface AssetRecord {
  id: string;
  tenantId: string;
  customerId: string;
  name: string;
  category: string;
  manufacturer: string | null;
  modelName: string | null;
  serialNumber: string | null;
  installedAt: Date | null;
  warrantyExpiresAt: Date | null;
  notes: string | null;
}

export interface ServiceHistoryRecord {
  id: string;
  tenantId: string;
  customerId: string;
  assetId: string | null;
  summary: string;
  servicedAt: Date;
  technicianName: string | null;
  notes: string | null;
}

export const CRM_STORE = Symbol('CRM_STORE');

export interface CrmStore {
  listCustomers(
    tenantId: string,
    query: { search?: string; customerType?: CustomerType; tag?: string; page: number; limit: number },
  ): Promise<{ items: CustomerRecord[]; total: number }>;

  createCustomer(input: {
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
  }): Promise<CustomerRecord>;

  getCustomerProfile(tenantId: string, customerId: string): Promise<{
    customer: CustomerRecord;
    contacts: CustomerContactRecord[];
    addresses: AddressRecord[];
    assets: AssetRecord[];
    serviceHistory: ServiceHistoryRecord[];
    conversations: ConversationRecord[];
    timeline: CustomerActivityRecord[];
  } | null>;

  updateCustomer(
    tenantId: string,
    customerId: string,
    patch: Partial<
      Pick<
        CustomerRecord,
        'displayName' | 'companyName' | 'gstin' | 'primaryPhone' | 'primaryEmail' | 'tags' | 'notes' | 'isActive'
      >
    >,
    actorUserId?: string,
  ): Promise<CustomerRecord | null>;

  addContact(
    tenantId: string,
    customerId: string,
    input: { name: string; role?: string; phone: string; email?: string; isPrimary?: boolean },
  ): Promise<CustomerContactRecord | null>;
  deleteContact(tenantId: string, customerId: string, contactId: string): Promise<boolean>;

  addAddress(
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
  ): Promise<AddressRecord | null>;
  deleteAddress(tenantId: string, customerId: string, addressId: string): Promise<boolean>;

  logCommunication(
    tenantId: string,
    customerId: string,
    input: {
      channel: CommunicationChannel;
      direction: 'INBOUND' | 'OUTBOUND';
      summary: string;
      createdByUserId?: string;
    },
  ): Promise<ConversationRecord | null>;

  getTimeline(tenantId: string, customerId: string): Promise<CustomerActivityRecord[]>;

  addAsset(
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
  ): Promise<AssetRecord | null>;
  listAssets(tenantId: string, customerId: string): Promise<AssetRecord[]>;

  addServiceHistory(
    tenantId: string,
    customerId: string,
    input: { assetId?: string; summary: string; servicedAt?: Date; technicianName?: string; notes?: string },
  ): Promise<ServiceHistoryRecord | null>;

  listLeads(tenantId: string, status?: LeadStatus): Promise<LeadRecord[]>;
  createLead(input: {
    tenantId: string;
    name: string;
    phone: string;
    email?: string;
    source?: string;
    notes?: string;
    assignedToUserId?: string;
  }): Promise<LeadRecord>;
  updateLead(
    tenantId: string,
    leadId: string,
    patch: Partial<Pick<LeadRecord, 'status' | 'notes' | 'assignedToUserId'>>,
  ): Promise<LeadRecord | null>;
  convertLeadToCustomer(
    tenantId: string,
    leadId: string,
    input: { customerType?: CustomerType; companyName?: string; actorUserId?: string },
  ): Promise<{ lead: LeadRecord; customer: CustomerRecord } | null>;
}
