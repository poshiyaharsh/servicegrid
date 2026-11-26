'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import type { DashboardMetricsDto } from '@servicegrid/api-client';
import { Badge, Button, Card } from '@servicegrid/ui';
import { LoadingSkeleton } from '../../components/branding/LoadingSkeleton';
import { Sidebar } from '../../components/layout/Sidebar';
import { TopNav } from '../../components/layout/TopNav';
import { getErrorMessage, RequireAuth, useAuth } from '../../lib/auth-context';

function DashboardContent() {
  const { api } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetricsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getDashboardMetrics();
      setMetrics(res.data);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load dashboard metrics.'));
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void loadMetrics();
  }, [loadMetrics]);

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar activeItem="Overview" />
      <div className="flex flex-1 flex-col">
        <TopNav title="Operations Overview" />
        <main className="flex-1 space-y-6 p-6">
          {error && (
            <div role="alert" className="flex items-center justify-between rounded-md border border-[#FECDD3] bg-[#FFF1F2] px-4 py-3 text-sm text-[#BE123C]">
              <span>{error}</span>
              <Button variant="secondary" size="sm" onClick={() => void loadMetrics()}>
                Retry
              </Button>
            </div>
          )}

          {loading ? (
            <LoadingSkeleton variant="kpi" />
          ) : !metrics ? (
            <Card title="No Metrics Available">
              <p className="text-sm text-[#64748B]">
                Start by adding customers, service requests, and work orders to see live operational KPIs.
              </p>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <Card title="Total Customers">
                  <p className="text-2xl font-bold tabular-nums text-[#0F172A]">{metrics.totalCustomers}</p>
                  <Link href="/customers" className="mt-2 inline-block text-xs font-medium text-[#0D9488] hover:underline">
                    View directory →
                  </Link>
                </Card>
                <Card title="Open Requests">
                  <p className="text-2xl font-bold tabular-nums text-[#0F172A]">{metrics.openServiceRequests}</p>
                  <Link href="/service-requests" className="mt-2 inline-block text-xs font-medium text-[#0D9488] hover:underline">
                    Manage requests →
                  </Link>
                </Card>
                <Card title="Active Work Orders">
                  <p className="text-2xl font-bold tabular-nums text-[#0F172A]">{metrics.activeWorkOrders}</p>
                  <Link href="/work-orders" className="mt-2 inline-block text-xs font-medium text-[#0D9488] hover:underline">
                    View jobs →
                  </Link>
                </Card>
                <Card title="Completed Jobs">
                  <p className="text-2xl font-bold tabular-nums text-[#059669]">{metrics.completedJobs}</p>
                  <p className="mt-2 text-xs text-[#64748B]">First-time fix: {metrics.firstTimeFixRate}%</p>
                </Card>
                <Card title="Pending Jobs">
                  <p className="text-2xl font-bold tabular-nums text-[#D97706]">{metrics.pendingJobs}</p>
                  <p className="mt-2 text-xs text-[#64748B]">Total jobs: {metrics.totalJobs}</p>
                </Card>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card
                  title="Recent Activity"
                  subtitle="Latest service requests and work orders"
                  action={
                    <Button variant="secondary" size="sm" onClick={() => void loadMetrics()}>
                      Refresh
                    </Button>
                  }
                >
                  {metrics.recentActivity.length === 0 ? (
                    <p className="text-sm text-[#64748B]">
                      No recent service activity yet. Create a customer or service request to begin.
                    </p>
                  ) : (
                    <ul className="divide-y divide-[#E2E8F0]">
                      {metrics.recentActivity.map((item) => (
                        <li key={item.id} className="flex items-center justify-between py-2.5 text-sm">
                          <div>
                            <p className="font-medium text-[#0F172A]">{item.title}</p>
                            <p className="text-xs text-[#64748B]">
                              {item.type === 'WORK_ORDER' ? 'Work Order' : 'Service Request'} •{' '}
                              {new Date(item.timestamp).toLocaleString()}
                            </p>
                          </div>
                          <Badge tone={item.status === 'COMPLETED' ? 'teal' : 'neutral'}>{item.status}</Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>

                <Card title="Service & Financial Performance" subtitle="Live backend aggregations">
                  <dl className="grid grid-cols-2 gap-4 text-sm">
                    <div className="rounded-md border border-[#E2E8F0] p-3">
                      <dt className="text-xs text-[#64748B]">Collected Revenue</dt>
                      <dd className="mt-1 text-lg font-semibold tabular-nums text-[#0F172A]">{metrics.revenue}</dd>
                    </div>
                    <div className="rounded-md border border-[#E2E8F0] p-3">
                      <dt className="text-xs text-[#64748B]">Outstanding Receivables</dt>
                      <dd className="mt-1 text-lg font-semibold tabular-nums text-[#0F172A]">
                        {metrics.outstandingPayments}
                      </dd>
                    </div>
                    <div className="rounded-md border border-[#E2E8F0] p-3">
                      <dt className="text-xs text-[#64748B]">Parts Consumed</dt>
                      <dd className="mt-1 text-lg font-semibold tabular-nums text-[#0F172A]">
                        {metrics.inventoryConsumption}
                      </dd>
                    </div>
                    <div className="rounded-md border border-[#E2E8F0] p-3">
                      <dt className="text-xs text-[#64748B]">AMC Renewals Due (30d)</dt>
                      <dd className="mt-1 text-lg font-semibold tabular-nums text-[#0F172A]">
                        {metrics.contractRenewalsDue}
                      </dd>
                    </div>
                  </dl>
                </Card>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default function DashboardOverviewPage() {
  return (
    <RequireAuth>
      <DashboardContent />
    </RequireAuth>
  );
}
