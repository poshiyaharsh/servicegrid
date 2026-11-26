import React, { useMemo, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type { LocalJob } from '../offline/offline-sync-engine';

export interface DashboardScreenProps {
  jobs?: LocalJob[];
  assignedCount: number;
  pendingSyncCount: number;
  conflictCount?: number;
  isOnline: boolean;
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  onSelectJob?: (job: LocalJob) => void;
  onNavigate: (screen: string) => void;
  onLogout?: () => void;
}

export function DashboardScreen({
  jobs = [],
  assignedCount,
  pendingSyncCount,
  conflictCount = 0,
  isOnline,
  loading = false,
  error = null,
  onRefresh,
  onSelectJob,
  onNavigate,
  onLogout,
}: DashboardScreenProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'TODAY' | 'IN_PROGRESS' | 'PRIORITY' | 'COMPLETED'>('ALL');

  const counts = useMemo(() => {
    const todayPrefix = new Date().toISOString().slice(0, 10);
    const nowIso = new Date().toISOString();
    return {
      today: jobs.filter((j) => j.scheduledStartAt?.startsWith(todayPrefix)).length,
      upcoming: jobs.filter((j) => j.scheduledStartAt && j.scheduledStartAt > nowIso && j.status !== 'COMPLETED').length,
      inProgress: jobs.filter((j) => j.status === 'IN_PROGRESS' || j.status === 'EN_ROUTE').length,
      completed: jobs.filter((j) => j.status === 'COMPLETED').length,
      overdue: jobs.filter((j) => j.scheduledStartAt && j.scheduledStartAt < nowIso && j.status !== 'COMPLETED').length,
      priority: jobs.filter((j) => j.priority === 'HIGH' || j.priority === 'URGENT').length,
    };
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    const q = search.trim().toLowerCase();
    const todayPrefix = new Date().toISOString().slice(0, 10);
    return jobs.filter((j) => {
      if (filter === 'TODAY' && !j.scheduledStartAt?.startsWith(todayPrefix)) return false;
      if (filter === 'IN_PROGRESS' && j.status !== 'IN_PROGRESS' && j.status !== 'EN_ROUTE') return false;
      if (filter === 'PRIORITY' && j.priority !== 'HIGH' && j.priority !== 'URGENT') return false;
      if (filter === 'COMPLETED' && j.status !== 'COMPLETED') return false;
      if (q) {
        const hay = `${j.jobNumber} ${j.title} ${j.status} ${j.priority}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [jobs, search, filter]);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => onRefresh?.()} />}
    >
      <View style={styles.header}>
        <Text style={styles.heading}>FieldSutra Technician</Text>
        <View style={[styles.badge, isOnline ? styles.badgeOnline : styles.badgeOffline]}>
          <Text style={styles.badgeText}>{isOnline ? 'Online' : 'Offline Mode'}</Text>
        </View>
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.grid}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Assigned ({assignedCount})</Text>
          <Text style={styles.kpiValue}>{counts.today} Today / {counts.upcoming} Upcoming</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>In Progress / Priority</Text>
          <Text style={styles.kpiValue}>{counts.inProgress} Active • {counts.priority} Urgent</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Completed / Overdue</Text>
          <Text style={styles.kpiValue}>{counts.completed} Done • {counts.overdue} Overdue</Text>
        </View>
        <TouchableOpacity style={styles.kpiCard} onPress={() => onNavigate('SyncStatus')}>
          <Text style={styles.kpiLabel}>Sync Queue</Text>
          <Text style={styles.kpiValue}>
            {pendingSyncCount} Pending • {conflictCount} Conflicts
          </Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.search}
        placeholder="Search job #, title, priority…"
        value={search}
        onChangeText={setSearch}
      />

      <View style={styles.filterRow}>
        {(['ALL', 'TODAY', 'IN_PROGRESS', 'PRIORITY', 'COMPLETED'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.chip, filter === f && styles.chipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.chipText, filter === f && styles.chipTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {filteredJobs.length === 0 ? (
        <Text style={styles.empty}>
          {loading ? 'Loading assigned jobs…' : 'No jobs match the current filter.'}
        </Text>
      ) : (
        filteredJobs.map((job) => (
          <TouchableOpacity key={job.id} style={styles.jobCard} onPress={() => onSelectJob?.(job)}>
            <Text style={styles.jobMeta}>{job.jobNumber} • {job.priority}</Text>
            <Text style={styles.jobTitle}>{job.title}</Text>
            <Text style={styles.jobStatus}>{job.status}</Text>
          </TouchableOpacity>
        ))
      )}

      <View style={styles.footerActions}>
        <TouchableOpacity style={styles.navBtn} onPress={() => onNavigate('SyncStatus')}>
          <Text style={styles.navText}>Sync &amp; Conflicts ({pendingSyncCount})</Text>
        </TouchableOpacity>
        {onLogout && (
          <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  heading: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeOnline: { backgroundColor: '#CCFBF1' },
  badgeOffline: { backgroundColor: '#FEF3C7' },
  badgeText: { fontSize: 12, fontWeight: '600', color: '#0F172A' },
  errorBanner: { backgroundColor: '#FFE4E6', borderRadius: 6, padding: 10, marginBottom: 12 },
  errorText: { color: '#BE123C', fontSize: 12 },
  grid: { gap: 8, marginBottom: 12 },
  kpiCard: { backgroundColor: '#FFF', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  kpiLabel: { fontSize: 12, color: '#64748B' },
  kpiValue: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginTop: 2 },
  search: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 6, padding: 10, marginBottom: 10 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: '#E2E8F0' },
  chipActive: { backgroundColor: '#0D9488' },
  chipText: { fontSize: 11, fontWeight: '600', color: '#334155' },
  chipTextActive: { color: '#FFFFFF' },
  empty: { fontSize: 13, color: '#64748B', textAlign: 'center', marginVertical: 20 },
  jobCard: { backgroundColor: '#FFF', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', padding: 14, marginBottom: 8 },
  jobMeta: { fontSize: 11, color: '#64748B', fontWeight: '600' },
  jobTitle: { fontSize: 15, fontWeight: '600', color: '#0F172A', marginTop: 2 },
  jobStatus: { fontSize: 12, color: '#0D9488', fontWeight: '600', marginTop: 4 },
  footerActions: { gap: 8, marginTop: 12, marginBottom: 24 },
  navBtn: { backgroundColor: '#0D9488', borderRadius: 6, padding: 12, alignItems: 'center' },
  navText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
  logoutBtn: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 6, padding: 12, alignItems: 'center' },
  logoutText: { color: '#0F172A', fontWeight: '600', fontSize: 14 },
});
