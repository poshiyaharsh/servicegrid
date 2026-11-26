'use client';

import React, { useCallback, useEffect, useState } from 'react';
import type {
  CustomerRecordDto,
  JobPriorityDto,
  WorkOrderDetailsDto,
  WorkOrderDto,
} from '@servicegrid/api-client';
import type { WorkOrderStatus } from '@servicegrid/types';
import { Badge, Button, Card, Input, Table } from '@servicegrid/ui';
import { LoadingSkeleton } from '../../../components/branding/LoadingSkeleton';
import { Sidebar } from '../../../components/layout/Sidebar';
import { TopNav } from '../../../components/layout/TopNav';
import { getErrorMessage, RequireAuth, useAuth } from '../../../lib/auth-context';

const WORK_ORDER_STATUSES: WorkOrderStatus[] = [
  'NEW',
  'PENDING',
  'SCHEDULED',
  'ASSIGNED',
  'EN_ROUTE',
  'IN_PROGRESS',
  'ON_HOLD',
  'COMPLETED',
  'CANCELLED',
];

function WorkOrdersContent() {
  const { api, can } = useAuth();
  const [workOrders, setWorkOrders] = useState<WorkOrderDto[]>([]);
  const [customers, setCustomers] = useState<CustomerRecordDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | WorkOrderStatus>('');
  const [priorityFilter, setPriorityFilter] = useState<'' | JobPriorityDto>('');

  const [showCreate, setShowCreate] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [assetId, setAssetId] = useState('');
  const [customerAssets, setCustomerAssets] = useState<Array<{ id: string; category: string; brand: string | null }>>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<JobPriorityDto>('MEDIUM');
  const [submitting, setSubmitting] = useState(false);

  const [selected, setSelected] = useState<WorkOrderDetailsDto | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [nextStatus, setNextStatus] = useState<WorkOrderStatus>('SCHEDULED');
  const [statusReason, setStatusReason] = useState('');
  const [techUserId, setTechUserId] = useState('');
  const [visitStart, setVisitStart] = useState('');
  const [visitNotes, setVisitNotes] = useState('');

  const loadWorkOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [woRes, custRes] = await Promise.all([
        api.listWorkOrders({
          status: statusFilter || undefined,
          priority: priorityFilter || undefined,
          search: search.trim() || undefined,
        }),
        api.listCustomers({ page: 1, limit: 50 }),
      ]);
      setWorkOrders(woRes.data);
      setCustomers(custRes.data);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load work orders.'));
    } finally {
      setLoading(false);
    }
  }, [api, statusFilter, priorityFilter, search]);

  useEffect(() => {
    void loadWorkOrders();
  }, [loadWorkOrders]);

  useEffect(() => {
    if (!customerId) {
      setCustomerAssets([]);
      setAssetId('');
      return;
    }
    let active = true;
    (async () => {
      try {
        const res = await api.getCustomer(customerId);
        if (active) setCustomerAssets(res.data.assets);
      } catch {
        if (active) setCustomerAssets([]);
      }
    })();
    return () => {
      active = false;
    };
  }, [api, customerId]);

  const openDetails = useCallback(
    async (id: string) => {
      setDetailLoading(true);
      try {
        const res = await api.getWorkOrder(id);
        setSelected(res.data);
        setNextStatus(res.data.workOrder.status);
      } catch (err) {
        setError(getErrorMessage(err, 'Failed to load work order details.'));
      } finally {
        setDetailLoading(false);
      }
    },
    [api],
  );

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (!customerId || !title.trim()) {
      setError('Customer and job title are required.');
      return;
    }
    setSubmitting(true);
    try {
      await api.createWorkOrder({
        customerId,
        assetId: assetId || undefined,
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
      });
      setShowCreate(false);
      setTitle('');
      setDescription('');
      setNotice('Work order created.');
      await loadWorkOrders();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to create work order.'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleTransitionStatus(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setError(null);
    setNotice(null);
    try {
      await api.transitionWorkOrderStatus(selected.workOrder.id, {
        status: nextStatus,
        reason: statusReason.trim() || undefined,
      });
      setStatusReason('');
      setNotice(`Status updated to ${nextStatus}.`);
      await Promise.all([loadWorkOrders(), openDetails(selected.workOrder.id)]);
    } catch (err) {
      setError(getErrorMessage(err, 'Invalid status transition.'));
    }
  }

  async function handleAssignTech(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !techUserId.trim()) return;
    setError(null);
    try {
      await api.assignWorkOrder(selected.workOrder.id, [
        { technicianUserId: techUserId.trim(), isLead: true },
      ]);
      setTechUserId('');
      setNotice('Technician assigned.');
      await Promise.all([loadWorkOrders(), openDetails(selected.workOrder.id)]);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleAddVisit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setError(null);
    try {
      await api.addWorkOrderVisit(selected.workOrder.id, {
        scheduledStartAt: visitStart ? new Date(visitStart).toISOString() : undefined,
        notes: visitNotes.trim() || undefined,
      });
      setVisitStart('');
      setVisitNotes('');
      setNotice('Visit scheduled.');
      await openDetails(selected.workOrder.id);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  const customerMap = new Map(customers.map((c) => [c.id, c.displayName]));

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar activeItem="Work Orders" />
      <div className="flex flex-1 flex-col">
        <TopNav title="Work Orders" />
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
            <Card title="Create Work Order">
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
                        {c.displayName}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1 text-xs font-medium text-[#334155]">
                  Asset (Optional)
                  <select
                    value={assetId}
                    onChange={(e) => setAssetId(e.target.value)}
                    className="rounded-md border border-[#CBD5E1] bg-white px-3 py-2 text-sm text-[#0F172A]"
                  >
                    <option value="">No specific asset</option>
                    {customerAssets.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.category} {a.brand ? `(${a.brand})` : ''}
                      </option>
                    ))}
                  </select>
                </label>

                <Input label="Job Title" value={title} onChange={(e) => setTitle(e.target.value)} required />

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
                  <Input label="Job Description" value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>

                <div className="flex gap-2 sm:col-span-2">
                  <Button type="submit" disabled={submitting}>
                    {submitting ? 'Creating…' : 'Create Work Order'}
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </Card>
          )}

          <Card
            title="Active Work Orders"
            subtitle="Track job statuses, multi-technician assignments, scheduling, and status history"
            action={
              can('work_orders:write') ? (
                <Button size="sm" onClick={() => setShowCreate(true)}>
                  Create Work Order
                </Button>
              ) : undefined
            }
          >
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <div className="w-full max-w-sm">
                <Input
                  placeholder="Search job # or title…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select
                aria-label="Filter by status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as '' | WorkOrderStatus)}
                className="rounded-md border border-[#CBD5E1] bg-white px-3 py-2 text-sm text-[#0F172A]"
              >
                <option value="">All Statuses</option>
                {WORK_ORDER_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
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
                  { key: 'jobNumber', header: 'Job #', render: (r) => r.jobNumber },
                  { key: 'customer', header: 'Customer', render: (r) => customerMap.get(r.customerId) ?? r.customerId },
                  { key: 'title', header: 'Title', render: (r) => r.title },
                  { key: 'priority', header: 'Priority', render: (r) => <Badge>{r.priority}</Badge> },
                  {
                    key: 'status',
                    header: 'Status',
                    render: (r) => (
                      <Badge tone={r.status === 'COMPLETED' ? 'teal' : 'neutral'}>{r.status}</Badge>
                    ),
                  },
                  {
                    key: 'actions',
                    header: 'Actions',
                    render: (r) => (
                      <Button size="sm" variant="secondary" onClick={() => void openDetails(r.id)}>
                        Manage
                      </Button>
                    ),
                  },
                ]}
                data={workOrders}
                keyExtractor={(r) => r.id}
                emptyMessage="No work orders yet. Convert a service request or create a work order."
              />
            )}
          </Card>

          {(detailLoading || selected) && (
            <Card
              title={selected ? `${selected.workOrder.jobNumber} — ${selected.workOrder.title}` : 'Loading Work Order…'}
              subtitle={selected?.workOrder.description ?? undefined}
              action={
                <Button size="sm" variant="secondary" onClick={() => setSelected(null)}>
                  Close
                </Button>
              }
            >
              {detailLoading || !selected ? (
                <LoadingSkeleton variant="card" rows={4} />
              ) : (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-[#0F172A]">Status Transition</h3>
                    {can('work_orders:execute') && (
                      <form className="space-y-3" onSubmit={handleTransitionStatus}>
                        <label className="flex flex-col gap-1 text-xs font-medium text-[#334155]">
                          Target Status
                          <select
                            value={nextStatus}
                            onChange={(e) => setNextStatus(e.target.value as WorkOrderStatus)}
                            className="rounded-md border border-[#CBD5E1] bg-white px-3 py-2 text-sm text-[#0F172A]"
                          >
                            {WORK_ORDER_STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </label>
                        <Input
                          label="Reason / Notes"
                          value={statusReason}
                          onChange={(e) => setStatusReason(e.target.value)}
                        />
                        <Button type="submit" size="sm">
                          Update Status
                        </Button>
                      </form>
                    )}

                    <div className="border-t border-[#E2E8F0] pt-3">
                      <h4 className="mb-2 text-xs font-semibold text-[#0F172A]">
                        Status History ({selected.statusHistory.length})
                      </h4>
                      <ul className="space-y-1.5 text-xs">
                        {selected.statusHistory.map((h) => (
                          <li key={h.id} className="rounded border border-[#E2E8F0] p-2">
                            <span className="font-medium text-[#0F172A]">
                              {h.fromStatus ?? 'INIT'} → {h.toStatus}
                            </span>
                            <p className="text-[#64748B]">
                              {new Date(h.changedAt).toLocaleString()} {h.reason ? `• ${h.reason}` : ''}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-[#0F172A]">
                      Assignments ({selected.assignments.length})
                    </h3>
                    {selected.assignments.length === 0 ? (
                      <p className="text-xs text-[#64748B]">No technicians assigned yet.</p>
                    ) : (
                      <ul className="space-y-1.5 text-xs">
                        {selected.assignments.map((a) => (
                          <li key={a.id} className="rounded border border-[#E2E8F0] p-2">
                            Technician: <span className="font-mono">{a.technicianUserId}</span>{' '}
                            {a.isLead ? '(Lead)' : ''}
                          </li>
                        ))}
                      </ul>
                    )}
                    {can('work_orders:assign') && (
                      <form className="space-y-2 border-t border-[#E2E8F0] pt-3" onSubmit={handleAssignTech}>
                        <Input
                          label="Technician User ID"
                          value={techUserId}
                          onChange={(e) => setTechUserId(e.target.value)}
                          placeholder="UUID of technician"
                          required
                        />
                        <Button type="submit" size="sm">
                          Assign Technician
                        </Button>
                      </form>
                    )}
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-[#0F172A]">
                      Scheduled Visits ({selected.visits.length})
                    </h3>
                    {selected.visits.length === 0 ? (
                      <p className="text-xs text-[#64748B]">No visits scheduled yet.</p>
                    ) : (
                      <ul className="space-y-1.5 text-xs">
                        {selected.visits.map((v) => (
                          <li key={v.id} className="rounded border border-[#E2E8F0] p-2">
                            Visit #{v.visitNumber} • {v.status}
                            {v.scheduledStartAt && (
                              <p className="text-[#64748B]">
                                {new Date(v.scheduledStartAt).toLocaleString()}
                              </p>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                    {can('work_orders:write') && (
                      <form className="space-y-2 border-t border-[#E2E8F0] pt-3" onSubmit={handleAddVisit}>
                        <Input
                          label="Scheduled Start"
                          type="datetime-local"
                          value={visitStart}
                          onChange={(e) => setVisitStart(e.target.value)}
                        />
                        <Input
                          label="Visit Notes"
                          value={visitNotes}
                          onChange={(e) => setVisitNotes(e.target.value)}
                        />
                        <Button type="submit" size="sm">
                          Schedule Visit
                        </Button>
                      </form>
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

export default function WorkOrdersPage() {
  return (
    <RequireAuth>
      <WorkOrdersContent />
    </RequireAuth>
  );
}
