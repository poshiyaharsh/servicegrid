import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CustomersService } from '../src/modules/crm/customers.service';
import { InMemoryCrmStore } from '../src/modules/crm/in-memory-crm.store';
import { LeadsService } from '../src/modules/crm/leads.service';

describe('Phase 05 — CRM, Leads, Assets & Isolation', () => {
  it('supports business/individual customers, contacts, addresses, assets, history, timeline, and search', async () => {
    const store = new InMemoryCrmStore();
    const customers = new CustomersService(store);
    const tenantId = '11111111-1111-4111-8111-111111111111';
    const userId = '22222222-2222-4222-8222-222222222222';

    await assert.rejects(
      () =>
        customers.create(tenantId, userId, {
          customerType: 'BUSINESS',
          displayName: 'Invalid GST Co',
          gstin: 'BAD_GST',
          primaryPhone: '+919876543210',
        }),
      BadRequestException,
    );

    const biz = await customers.create(tenantId, userId, {
      customerType: 'BUSINESS',
      displayName: 'Apex Tech Park',
      companyName: 'Apex Infra Pvt Ltd',
      gstin: '27AABCU9603R1ZM',
      primaryPhone: '+919876543210',
      primaryEmail: 'facility@apextech.in',
      tags: ['commercial', 'amc-prospect'],
      notes: 'Requires gate pass for rooftop chiller access',
    });

    await customers.addContact(tenantId, biz.id, {
      name: 'Meera Nair',
      role: 'Facility Manager',
      phone: '+919811112222',
      isPrimary: true,
    });

    await customers.addAddress(tenantId, biz.id, {
      label: 'Campus A',
      line1: 'Plot 42, Hinjewadi Phase 2',
      city: 'Pune',
      state: 'Maharashtra',
      postalCode: '411057',
      isPrimary: true,
    });

    await customers.logCommunication(tenantId, biz.id, userId, {
      channel: 'WHATSAPP',
      direction: 'INBOUND',
      summary: 'Requested annual AC maintenance quote for 12 split units',
    });

    const asset = await customers.addAsset(tenantId, biz.id, {
      name: 'Daikin Split AC 2T',
      category: 'HVAC',
      manufacturer: 'Daikin',
      modelName: 'FTKF60U',
      serialNumber: 'DK-994821',
    });

    await customers.addServiceHistory(tenantId, biz.id, {
      assetId: asset.id,
      summary: 'Gas top-up and condenser coil wash',
      technicianName: 'Vikram',
    });

    const profile = await customers.getProfile(tenantId, biz.id);
    assert.equal(profile.contacts.length, 1);
    assert.equal(profile.addresses.length, 1);
    assert.equal(profile.assets.length, 1);
    assert.equal(profile.serviceHistory.length, 1);
    assert.equal(profile.conversations.length, 1);
    assert.ok(profile.timeline.length >= 4);

    const searchRes = await customers.list(tenantId, { search: '27AABCU9603R1ZM', tag: 'commercial' });
    assert.equal(searchRes.total, 1);
    assert.equal(searchRes.items[0]?.id, biz.id);
  });

  it('supports lead conversion, CSV import/export, and blocks cross-tenant access', async () => {
    const store = new InMemoryCrmStore();
    const customers = new CustomersService(store);
    const leads = new LeadsService(store);

    const tenantA = '11111111-1111-4111-8111-111111111111';
    const tenantB = '99999999-9999-4999-8999-999999999999';
    const userA = '22222222-2222-4222-8222-222222222222';

    const lead = await leads.create(tenantA, {
      name: 'Rohan Joshi',
      phone: '+919900112233',
      source: 'WHATSAPP',
    });

    const converted = await leads.convert(tenantA, lead.id, userA, { customerType: 'INDIVIDUAL' });
    assert.equal(converted.lead.status, 'CONVERTED');
    assert.equal(converted.customer.displayName, 'Rohan Joshi');

    const csvImport = await customers.importCsv(
      tenantA,
      userA,
      [
        'displayName,primaryPhone,customerType,companyName,primaryEmail',
        'Sita Patel,+919822334455,INDIVIDUAL,,sita@example.in',
        ',+910000000000,INDIVIDUAL,,bad@example.in',
      ].join('\n'),
    );
    assert.equal(csvImport.imported, 1);
    assert.equal(csvImport.failed, 1);

    const exported = await customers.exportCsv(tenantA);
    assert.ok(exported.includes('Rohan Joshi'));
    assert.ok(exported.includes('Sita Patel'));

    await assert.rejects(
      () => customers.getProfile(tenantB, converted.customer.id),
      NotFoundException,
    );
  });
});
