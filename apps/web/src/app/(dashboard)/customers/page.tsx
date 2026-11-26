'use client';

import React, { useCallback, useEffect, useState } from 'react';
import type { CustomerProfileDto, CustomerRecordDto } from '@servicegrid/api-client';
import { Badge, Button, Card, Input, Table } from '@servicegrid/ui';
import { LoadingSkeleton } from '../../../components/branding/LoadingSkeleton';
import { Sidebar } from '../../../components/layout/Sidebar';
import { TopNav } from '../../../components/layout/TopNav';
import { getErrorMessage, RequireAuth, useAuth } from '../../../lib/auth-context';

function CustomersContent() {
  const { api, can } = useAuth();
  const [customers, setCustomers] = useState<CustomerRecordDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 10;
  const [search, setSearch] = useState('');
  const [customerType, setCustomerType] = useState<'' | 'INDIVIDUAL' | 'BUSINESS'>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedProfile, setSelectedProfile] = useState<CustomerProfileDto | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formType, setFormType] = useState<'INDIVIDUAL' | 'BUSINESS'>('BUSINESS');
  const [displayName, setDisplayName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [gstin, setGstin] = useState('');
  const [primaryPhone, setPrimaryPhone] = useState('');
  const [primaryEmail, setPrimaryEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Contact & address sub-forms
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [addrLabel, setAddrLabel] = useState('Site');
  const [addrLine1, setAddrLine1] = useState('');
  const [addrCity, setAddrCity] = useState('');
  const [addrState, setAddrState] = useState('');
  const [addrPostal, setAddrPostal] = useState('');

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listCustomers({
        search: search.trim() || undefined,
        customerType: customerType || undefined,
        page,
        limit,
      });
      setCustomers(res.data);
      setTotal(res.meta?.total ?? res.data.length);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load customers.'));
    } finally {
      setLoading(false);
    }
  }, [api, search, customerType, page]);

  useEffect(() => {
    void loadCustomers();
  }, [loadCustomers]);

  const openProfile = useCallback(
    async (id: string) => {
      setProfileLoading(true);
      try {
        const res = await api.getCustomer(id);
        setSelectedProfile(res.data);
      } catch (err) {
        setError(getErrorMessage(err, 'Failed to load customer details.'));
      } finally {
        setProfileLoading(false);
      }
    },
    [api],
  );

  function startCreate() {
    setEditingId(null);
    setFormType('BUSINESS');
    setDisplayName('');
    setCompanyName('');
    setGstin('');
    setPrimaryPhone('');
    setPrimaryEmail('');
    setNotes('');
    setShowForm(true);
  }

  function startEdit(c: CustomerRecordDto) {
    setEditingId(c.id);
    setFormType(c.customerType);
    setDisplayName(c.displayName);
    setCompanyName(c.companyName ?? '');
    setGstin(c.gstin ?? '');
    setPrimaryPhone(c.primaryPhone);
    setPrimaryEmail(c.primaryEmail ?? '');
    setNotes(c.notes ?? '');
    setShowForm(true);
  }

  async function handleSaveCustomer(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!displayName.trim() || !primaryPhone.trim()) {
      setError('Display name and primary phone are required.');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await api.updateCustomer(editingId, {
          displayName: displayName.trim(),
          companyName: companyName.trim() || undefined,
          gstin: gstin.trim() || undefined,
          primaryPhone: primaryPhone.trim(),
          primaryEmail: primaryEmail.trim() || undefined,
          notes: notes.trim() || undefined,
        });
      } else {
        await api.createCustomer({
          customerType: formType,
          displayName: displayName.trim(),
          companyName: companyName.trim() || undefined,
          gstin: gstin.trim() || undefined,
          primaryPhone: primaryPhone.trim(),
          primaryEmail: primaryEmail.trim() || undefined,
          notes: notes.trim() || undefined,
        });
      }
      setShowForm(false);
      await loadCustomers();
      if (editingId && selectedProfile?.customer.id === editingId) {
        await openProfile(editingId);
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to save customer.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleAddContact(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProfile || !contactName.trim() || !contactPhone.trim()) return;
    try {
      await api.addCustomerContact(selectedProfile.customer.id, {
        name: contactName.trim(),
        phone: contactPhone.trim(),
        email: contactEmail.trim() || undefined,
      });
      setContactName('');
      setContactPhone('');
      setContactEmail('');
      await openProfile(selectedProfile.customer.id);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleAddAddress(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProfile || !addrLine1.trim() || !addrCity.trim() || !addrState.trim() || !addrPostal.trim()) return;
    try {
      await api.addCustomerAddress(selectedProfile.customer.id, {
        label: addrLabel.trim() || 'Site',
        line1: addrLine1.trim(),
        city: addrCity.trim(),
        state: addrState.trim(),
        postalCode: addrPostal.trim(),
      });
      setAddrLine1('');
      setAddrCity('');
      setAddrState('');
      setAddrPostal('');
      await openProfile(selectedProfile.customer.id);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar activeItem="Customers" />
      <div className="flex flex-1 flex-col">
        <TopNav title="Customers &amp; Assets" />
        <main className="flex-1 space-y-6 p-6">
          {error && (
            <div role="alert" className="rounded-md border border-[#FECDD3] bg-[#FFF1F2] px-4 py-3 text-sm text-[#BE123C]">
              {error}
            </div>
          )}

          {showForm && (
            <Card title={editingId ? 'Edit Customer' : 'Create Customer'}>
              <form className="grid grid-cols-1 gap-4 sm:grid-cols-2" onSubmit={handleSaveCustomer}>
                {!editingId && (
                  <label className="flex flex-col gap-1 text-xs font-medium text-[#334155]">
                    Customer Type
                    <select
                      value={formType}
                      onChange={(e) => setFormType(e.target.value as 'INDIVIDUAL' | 'BUSINESS')}
                      className="rounded-md border border-[#CBD5E1] bg-white px-3 py-2 text-sm text-[#0F172A]"
                    >
                      <option value="BUSINESS">Business</option>
                      <option value="INDIVIDUAL">Individual</option>
                    </select>
                  </label>
                )}
                <Input
                  label="Display Name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                />
                <Input
                  label="Company Name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
                <Input label="GSTIN" value={gstin} onChange={(e) => setGstin(e.target.value)} />
                <Input
                  label="Primary Phone"
                  value={primaryPhone}
                  onChange={(e) => setPrimaryPhone(e.target.value)}
                  required
                />
                <Input
                  label="Primary Email"
                  type="email"
                  value={primaryEmail}
                  onChange={(e) => setPrimaryEmail(e.target.value)}
                />
                <Input label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
                <div className="flex items-end gap-2 sm:col-span-2">
                  <Button type="submit" disabled={saving}>
                    {saving ? 'Saving…' : editingId ? 'Update Customer' : 'Create Customer'}
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </Card>
          )}

          <Card
            title="Customer Directory"
            subtitle="Manage residential &amp; commercial accounts, contacts, addresses, and service history"
            action={
              can('customers:write') ? (
                <Button size="sm" onClick={startCreate}>
                  Add Customer
                </Button>
              ) : undefined
            }
          >
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <div className="w-full max-w-sm">
                <Input
                  placeholder="Search by name, phone, email, or GSTIN…"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
              <select
                aria-label="Filter by customer type"
                value={customerType}
                onChange={(e) => {
                  setCustomerType(e.target.value as '' | 'INDIVIDUAL' | 'BUSINESS');
                  setPage(1);
                }}
                className="rounded-md border border-[#CBD5E1] bg-white px-3 py-2 text-sm text-[#0F172A]"
              >
                <option value="">All Types</option>
                <option value="BUSINESS">Business</option>
                <option value="INDIVIDUAL">Individual</option>
              </select>
            </div>

            {loading ? (
              <LoadingSkeleton variant="table" rows={5} />
            ) : (
              <>
                <Table
                  columns={[
                    { key: 'name', header: 'Customer', render: (r) => r.displayName },
                    {
                      key: 'type',
                      header: 'Type',
                      render: (r) => (
                        <Badge tone={r.customerType === 'BUSINESS' ? 'teal' : 'neutral'}>
                          {r.customerType}
                        </Badge>
                      ),
                    },
                    { key: 'phone', header: 'Phone', render: (r) => r.primaryPhone },
                    { key: 'email', header: 'Email', render: (r) => r.primaryEmail ?? '—' },
                    {
                      key: 'actions',
                      header: 'Actions',
                      render: (r) => (
                        <div className="flex gap-2">
                          <Button size="sm" variant="secondary" onClick={() => void openProfile(r.id)}>
                            Details
                          </Button>
                          {can('customers:write') && (
                            <Button size="sm" variant="secondary" onClick={() => startEdit(r)}>
                              Edit
                            </Button>
                          )}
                        </div>
                      ),
                    },
                  ]}
                  data={customers}
                  keyExtractor={(r) => r.id}
                  emptyMessage="No customers found. Add your first customer to get started."
                />
                <div className="mt-4 flex items-center justify-between text-xs text-[#64748B]">
                  <span>
                    Showing page {page} of {totalPages} ({total} total)
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </>
            )}
          </Card>

          {(profileLoading || selectedProfile) && (
            <Card
              title={selectedProfile ? `${selectedProfile.customer.displayName} — Profile` : 'Loading Profile…'}
              subtitle={selectedProfile?.customer.companyName ?? undefined}
              action={
                <Button size="sm" variant="secondary" onClick={() => setSelectedProfile(null)}>
                  Close
                </Button>
              }
            >
              {profileLoading || !selectedProfile ? (
                <LoadingSkeleton variant="card" rows={4} />
              ) : (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-[#0F172A]">Contacts ({selectedProfile.contacts.length})</h3>
                    {selectedProfile.contacts.length === 0 ? (
                      <p className="text-xs text-[#64748B]">No additional contacts added.</p>
                    ) : (
                      <ul className="space-y-2 text-xs">
                        {selectedProfile.contacts.map((c) => (
                          <li key={c.id} className="rounded border border-[#E2E8F0] p-2">
                            <p className="font-medium text-[#0F172A]">{c.name}</p>
                            <p className="text-[#64748B]">
                              {c.phone} {c.email ? `• ${c.email}` : ''}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                    {can('customers:write') && (
                      <form className="space-y-2 border-t border-[#E2E8F0] pt-3" onSubmit={handleAddContact}>
                        <Input label="Contact Name" value={contactName} onChange={(e) => setContactName(e.target.value)} required />
                        <Input label="Phone" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} required />
                        <Input label="Email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
                        <Button type="submit" size="sm">Add Contact</Button>
                      </form>
                    )}
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-[#0F172A]">
                      Service Addresses ({selectedProfile.addresses.length})
                    </h3>
                    {selectedProfile.addresses.length === 0 ? (
                      <p className="text-xs text-[#64748B]">No service addresses yet.</p>
                    ) : (
                      <ul className="space-y-2 text-xs">
                        {selectedProfile.addresses.map((a) => (
                          <li key={a.id} className="rounded border border-[#E2E8F0] p-2">
                            <p className="font-medium text-[#0F172A]">{a.label}</p>
                            <p className="text-[#64748B]">
                              {a.line1}, {a.city}, {a.state} {a.postalCode}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                    {can('customers:write') && (
                      <form className="space-y-2 border-t border-[#E2E8F0] pt-3" onSubmit={handleAddAddress}>
                        <Input label="Label" value={addrLabel} onChange={(e) => setAddrLabel(e.target.value)} />
                        <Input label="Address Line 1" value={addrLine1} onChange={(e) => setAddrLine1(e.target.value)} required />
                        <div className="grid grid-cols-3 gap-2">
                          <Input label="City" value={addrCity} onChange={(e) => setAddrCity(e.target.value)} required />
                          <Input label="State" value={addrState} onChange={(e) => setAddrState(e.target.value)} required />
                          <Input label="PIN" value={addrPostal} onChange={(e) => setAddrPostal(e.target.value)} required />
                        </div>
                        <Button type="submit" size="sm">Add Address</Button>
                      </form>
                    )}
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-[#0F172A]">
                      Service History &amp; Timeline ({selectedProfile.timeline.length})
                    </h3>
                    {selectedProfile.timeline.length === 0 ? (
                      <p className="text-xs text-[#64748B]">No timeline events recorded yet.</p>
                    ) : (
                      <ul className="space-y-2 text-xs">
                        {selectedProfile.timeline.map((t) => (
                          <li key={t.id} className="rounded border border-[#E2E8F0] p-2">
                            <p className="font-medium text-[#0F172A]">{t.summary}</p>
                            <p className="text-[#64748B]">
                              {t.eventType} • {new Date(t.createdAt).toLocaleString()}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}

export default function CustomersPage() {
  return (
    <RequireAuth>
      <CustomersContent />
    </RequireAuth>
  );
}
