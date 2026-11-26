import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CRM_STORE, type CrmStore, type CustomerType, type LeadStatus } from './crm.store';

@Injectable()
export class LeadsService {
  constructor(@Inject(CRM_STORE) private readonly store: CrmStore) {}

  async list(tenantId: string, status?: LeadStatus) {
    return this.store.listLeads(tenantId, status);
  }

  async create(
    tenantId: string,
    input: { name: string; phone: string; email?: string; source?: string; notes?: string; assignedToUserId?: string },
  ) {
    return this.store.createLead({ tenantId, ...input });
  }

  async update(
    tenantId: string,
    leadId: string,
    patch: { status?: LeadStatus; notes?: string; assignedToUserId?: string },
  ) {
    const updated = await this.store.updateLead(tenantId, leadId, patch);
    if (!updated) throw new NotFoundException('Lead not found');
    return updated;
  }

  async convert(
    tenantId: string,
    leadId: string,
    actorUserId: string,
    input: { customerType?: CustomerType; companyName?: string },
  ) {
    const result = await this.store.convertLeadToCustomer(tenantId, leadId, {
      ...input,
      actorUserId,
    });
    if (!result) throw new NotFoundException('Lead not found');
    return result;
  }
}
