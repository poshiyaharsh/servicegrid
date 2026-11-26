'use client';

import React, { useCallback, useEffect, useState } from 'react';
import type {
  CustomerAddressDto,
  CustomerRecordDto,
  JobPriorityDto,
  ServiceRequestDto,
} from '@servicegrid/api-client';
import { Badge, Button, Card, Input, Table } from '@servicegrid/ui';
import { LoadingSkeleton } from '../../../components/branding/LoadingSkeleton';
import { Sidebar } from '../../../components/layout/Sidebar';
import { TopNav } from '../../../components/layout/TopNav';
import { getErrorMessage, RequireAuth, useAuth } from '../../../lib/auth-context';

function ServiceRequestsContent() {
  const { api, can } = useAuth();
  const [requests, setRequests] = useState<ServiceRequestDto[]>([]);
  const [customers, setCustomers] = useState<CustomerRecordDto[]>([]);
  const [addresses, setAddresses] = useState<CustomerAddressDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'' | JobPriorityDto>('');

  const [showCreate, setShowCreate] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<JobPriorityDto>('MEDIUM');
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [srRes, custRes] = await Promise.all([
        api.listServiceRequests({
          status: statusFilter || undefined,
          priority: priorityFilter || undefined,
          search: search.trim() || undefined,
        }),
        api.listCustomers({ page: 1, limit: 50 }),
      ]);
      setRequests(srRes.data);
      setCustomers(custRes.data);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load service requests.'));
    } finally {
      setLoading(false);
    }
  }, [api, statusFilter, priorityFilter, search]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!customerId) {
      setAddresses([]);
      setSelectedAddressId('');
      return;
    }
    let active = true;
    (async () => {
      try {
        const res = await api.getCustomer(customerId);
        if (!active) return;
        setAddresses(res.data.addresses);
        setSelectedAddressId(res.data.addresses[0]?.id ?? '');
      } catch {
        if (active) setAddresses([]);
      }
    })();
    return () => {
      active = false;
    };
  }, [api, customerId]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (!customerId || !title.trim() || !description.trim()) {
      setError('Customer, title, and problem description are required.');
      return;
    }
    const addr = addresses.find((a) => a.id === selectedAddressId);
    const fullDescription = addr
      ? `${description.trim()}\n[Service Address: ${addr.label} — ${addr.line1}, ${addr.city}]`
      : description.trim();

    setSubmitting(true);
    try {
      await api.createServiceRequest({
        customerId,
        title: title.trim(),
        description: fullDescription,
        priority,
      });
      setShowCreate(false);
      setTitle('');
      setDescription('');
      setNotice('Service request created.');
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to create service request.'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConvert(id: string) {
    setError(null);
    setNotice(null);
    try {
      const res = await api.convertServiceRequest(id);
      setNotice(`Converted to Work Order ${res.data.jobNumber}.`);
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to convert service request.'));
    }
  }

  const customerMap = new Map(customers.map((c) => [c.id, c.displayName]));

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar activeItem="Service Requests" />
      <div className="flex flex-1 flex-col">
        <TopNav title="Service Requests" />
        <main className="flex-1 space-y-6 p-6">
          {notice && (
            <div className="rounded-md border border-[#99F6E4] bg-[#F0FDFA] px-4 py-3 text-sm text-[#0F766E]">
              {notice}
            </div>
          )}
          {error && (
            <div role="alert" className="rounded-md border border-[#FECDD3] bg-[#FFF1F2] px-4 py-3 text-sm text-[#BE123C]">
              {error}
            </div>
          )}

          {showCreate && (
            <Card title="New Service Request">
              <form className="grid grid-cols-1 gap-4 sm:grid-cols-2" onSubmit={handleCreate}>
                <label className="flex flex-col gap-1 text-xs font-medium text-[#334155]">
                  Customer
                  <select
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    required
                    className="rounded-md border border-[#CBD5E1] bg-white px-3 py-2 text-sm text-[#0F172A]"
                  >
                    <option value="">Select customer…</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.displayName} ({c.primaryPhone})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1 text-xs font-medium text-[#334155]">
                  Service Address
                  <select
                    value={selectedAddressId}
                    onChange={(e) => setSelectedAddressId(e.target.value)}
                    className="rounded-md border border-[#CBD5E1] bg-white px-3 py-2 text-sm text-[#0F172A]"
                  >
                    <option value="">Primary / Unspecified</option>
                    {addresses.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.label}: {a.line1}, {a.city}
                      </option>
                    ))}
                  </select>
                </label>

                <Input label="Request Title" value={title} onChange={(e) => setTitle(e.target.value)} required />

                <label className="flex flex-col gap-1 text-xs font-medium text-[#334155]">
                  Priority
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as JobPriorityDto)}
                    className="rounded-md border border-[#CBD5E1] bg-white px-3 py-2 text-sm text-[#0F172A]"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="URGENT">URGENT</option>
                  </select>
                </label>

                <div className="sm:col-span-2">
                  <Input
                    label="Problem Description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                  />
                </div>

                <div className="flex gap-2 sm:col-span-2">
                  <Button type="submit" disabled={submitting}>
                    {submitting ? 'Submitting…' : 'Create Request'}
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </Card>
          )}

          <Card
            title="Service Request Queue"
            subtitle="Intake customer issues, track SLA deadlines, and convert to work orders"
            action={
              can('work_orders:write') ? (
                <Button size="sm" onClick={() => setShowCreate(true)}>
                  New Request
                </Button>
              ) : undefined
            }
          >
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <div className="w-full max-w-sm">
                <Input
                  placeholder="Search request #, title, or issue…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select
                aria-label="Filter by status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-md border border-[#CBD5E1] bg-white px-3 py-2 text-sm text-[#0F172A]"
              >
                <option value="">All Statuses</option>
                <option value="NEW">NEW</option>
                <option value="TRIAGED">TRIAGED</option>
                <option value="CONVERTED">CONVERTED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
              <select
                aria-label="Filter by priority"
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value as '' | JobPriorityDto)}
                className="rounded-md border border-[#CBD5E1] bg-white px-3 py-2 text-sm text-[#0F172A]"
              >
                <option value="">All Priorities</option>
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="URGENT">URGENT</option>
              </select>
            </div>

            {loading ? (
              <LoadingSkeleton variant="table" rows={5} />
            ) : (
              <Table
                columns={[
                  { key: 'num', header: 'Request #', render: (r) => r.requestNumber ?? `SR-${r.id.slice(0, 6).toUpperCase()}` },
                  { key: 'customer', header: 'Customer', render: (r) => customerMap.get(r.customerId) ?? r.customerId },
                  { key: 'title', header: 'Issue', render: (r) => r.title },
                  { key: 'priority', header: 'Priority', render: (r) => <Badge>{r.priority}</Badge> },
                  {
                    key: 'status',
                    header: 'Status',
                    render: (r) => (
                      <Badge tone={r.status === 'CONVERTED' ? 'teal' : 'neutral'}>{r.status}</Badge>
                    ),
                  },
                  {
                    key: 'sla',
                    header: 'SLA Due',
                    render: (r) => (r.slaDueAt ? new Date(r.slaDueAt).toLocaleString() : '—'),
                  },
                  {
                    key: 'actions',
                    header: 'Actions',
                    render: (r) =>
                      r.status !== 'CONVERTED' && can('work_orders:write') ? (
                        <Button size="sm" onClick={() => void handleConvert(r.id)}>
                          Convert to Job
                        </Button>
                      ) : (
                        <span className="text-xs text-[#64748B]">
                          {r.convertedWorkOrderId ? 'Converted' : '—'}
                        </span>
                      ),
                  },
                ]}
                data={requests}
                keyExtractor={(r) => r.id}
                emptyMessage="No service requests match the current filters."
              />
            )}
          </Card>
        </main>
      </div>
    </div>
  );
}

export default function ServiceRequestsPage() {
  return (
    <RequireAuth>
      <ServiceRequestsContent />
    </RequireAuth>
  );
}
