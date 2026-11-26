import React, { useEffect, useMemo, useState } from 'react';
import { ApiSyncTransport } from './api/mobile-sync-transport';
import { MobileAuthService, type MobileSession } from './auth/mobile-auth.service';
import { InMemorySecureStorage } from './auth/secure-storage';
import { BrandLoader } from './components/BrandLoader';
import {
  createLocalDatabaseState,
  OfflineSyncEngine,
  type LocalJob,
} from './offline/offline-sync-engine';
import { DashboardScreen } from './screens/DashboardScreen';
import { JobDetailsScreen } from './screens/JobDetailsScreen';
import { LoginScreen } from './screens/LoginScreen';
import { NavigationScreen } from './screens/NavigationScreen';
import { SyncStatusScreen } from './screens/SyncStatusScreen';

export interface AppProps {
  apiBaseUrl?: string;
  initializing?: boolean;
  authenticated?: boolean;
}

export default function App({
  apiBaseUrl = 'http://localhost:4000',
  initializing: initialBoot = true,
  authenticated: initialAuth = false,
}: AppProps) {
  const storage = useMemo(() => new InMemorySecureStorage(), []);
  const db = useMemo(() => createLocalDatabaseState(), []);
  const [session, setSession] = useState<MobileSession | null>(null);
  const [initializing, setInitializing] = useState(initialBoot);
  const [isOnline] = useState(true);
  const [screen, setScreen] = useState<'Dashboard' | 'JobDetails' | 'SyncStatus' | 'Navigation'>('Dashboard');
  const [selectedJob, setSelectedJob] = useState<LocalJob | null>(null);
  const [jobs, setJobs] = useState<LocalJob[]>([]);
  const [error, setError] = useState<string | null>(null);

  const authService = useMemo(
    () =>
      new MobileAuthService(apiBaseUrl, storage, () => {
        setSession(null);
      }),
    [apiBaseUrl, storage],
  );
  const syncEngine = useMemo(() => new OfflineSyncEngine(db), [db]);
  const transport = useMemo(() => new ApiSyncTransport(authService.api), [authService]);

  useEffect(() => {
    let active = true;
    (async () => {
      syncEngine.recoverAfterRestart();
      if (initialAuth) {
        if (active) setInitializing(false);
        return;
      }
      try {
        const restored = await authService.restoreSession();
        if (active && restored) {
          setSession(restored);
        }
      } catch {
        // Offline or unauthenticated
      } finally {
        if (active) setInitializing(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [authService, syncEngine, initialAuth]);

  async function refreshJobs() {
    setError(null);
    try {
      const bundle = await transport.fetchAssignedBundle();
      syncEngine.downloadAssignedJobs(
        bundle.jobs,
        bundle.customers,
        bundle.assets,
        bundle.checklists,
        bundle.history,
      );
      setJobs(syncEngine.getJobs(session?.tenant.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh jobs');
    }
  }

  async function handleLogout() {
    await authService.logout(() => syncEngine.wipeAllOnLogout());
    setSession(null);
    setJobs([]);
    setSelectedJob(null);
  }

  if (initializing) {
    return <BrandLoader />;
  }

  if (!session && !initialAuth) {
    return (
      <LoginScreen
        onLogin={async (email, password) => {
          const s = await authService.login(email, password);
          setSession(s);
          await refreshJobs();
        }}
      />
    );
  }

  const summary = syncEngine.getSyncSummary();

  if (screen === 'SyncStatus') {
    return (
      <SyncStatusScreen
        isOnline={isOnline}
        pendingCount={summary.pendingCount}
        failedCount={summary.failedCount}
        conflictCount={summary.conflictCount}
        queuedAttachmentsCount={summary.queuedAttachmentsCount}
        lastSyncedAt={summary.lastSyncedAt}
        conflicts={summary.conflicts}
        syncHistory={summary.syncHistory}
        onSyncNow={() => {
          void syncEngine.syncNow(transport, isOnline).then(() => setJobs(syncEngine.getJobs(session?.tenant.id)));
        }}
        onRetryFailed={() => {
          syncEngine.retryFailedOperations();
          void syncEngine.syncNow(transport, isOnline);
        }}
        onResolveConflict={(opId, res) => {
          syncEngine.resolveConflict(opId, res, 1);
        }}
      />
    );
  }

  if (screen === 'Navigation' && selectedJob) {
    const customer = syncEngine.getCustomer(selectedJob.customerId);
    return (
      <NavigationScreen
        address={customer?.addressSummary}
        onRecordArrivalLocation={(coords) => {
          syncEngine.queueLocationEvent({
            workOrderId: selectedJob.id,
            tenantId: selectedJob.tenantId,
            authorized: true,
            event: 'ARRIVED',
            ...coords,
          });
        }}
      />
    );
  }

  if (screen === 'JobDetails' && selectedJob) {
    return (
      <JobDetailsScreen
        job={selectedJob}
        customer={syncEngine.getCustomer(selectedJob.customerId)}
        asset={syncEngine.getAsset(selectedJob.assetId)}
        history={syncEngine.getJobHistory(selectedJob.id)}
        onTransitionStatus={(nextStatus) => {
          syncEngine.queueJobStatusUpdate({
            workOrderId: selectedJob.id,
            tenantId: selectedJob.tenantId,
            nextStatus,
          });
          setJobs(syncEngine.getJobs(session?.tenant.id));
        }}
        onSaveNotes={(notes) => {
          syncEngine.queueJobNotesUpdate({
            workOrderId: selectedJob.id,
            tenantId: selectedJob.tenantId,
            ...notes,
          });
        }}
        onAction={(target) => {
          if (target === 'Navigation') setScreen('Navigation');
        }}
      />
    );
  }

  return (
    <DashboardScreen
      jobs={jobs}
      assignedCount={jobs.length}
      pendingSyncCount={summary.pendingCount}
      conflictCount={summary.conflictCount}
      isOnline={isOnline}
      error={error}
      onRefresh={() => void refreshJobs()}
      onSelectJob={(job) => {
        setSelectedJob(job);
        setScreen('JobDetails');
      }}
      onNavigate={(target) => {
        if (target === 'SyncStatus') setScreen('SyncStatus');
      }}
      onLogout={() => void handleLogout()}
    />
  );
}
