import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { OutboxOperation } from '@servicegrid/offline-sync';
import type { SyncHistoryEntry } from '../offline/offline-sync-engine';

export interface SyncStatusScreenProps {
  isOnline?: boolean;
  pendingCount: number;
  failedCount: number;
  conflictCount: number;
  queuedAttachmentsCount: number;
  lastSyncedAt: string | null;
  conflicts?: OutboxOperation[];
  syncHistory?: SyncHistoryEntry[];
  onSyncNow: () => void;
  onRetryFailed?: () => void;
  onResolveConflict?: (operationId: string, resolution: 'ACCEPT_SERVER' | 'RETRY_WITH_SERVER_VERSION') => void;
}

export function SyncStatusScreen({
  isOnline = true,
  pendingCount,
  failedCount,
  conflictCount,
  queuedAttachmentsCount,
  lastSyncedAt,
  conflicts = [],
  syncHistory = [],
  onSyncNow,
  onRetryFailed,
  onResolveConflict,
}: SyncStatusScreenProps) {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.heading}>Synchronization Status</Text>
      <View style={styles.card}>
        <Text style={styles.row}>Network: {isOnline ? 'Online' : 'Offline (Queued Locally)'}</Text>
        <Text style={styles.row}>Pending Outbox Operations: {pendingCount}</Text>
        <Text style={styles.row}>Queued Attachments: {queuedAttachmentsCount}</Text>
        <Text style={styles.row}>Failed (Retrying): {failedCount}</Text>
        <Text style={styles.row}>Conflicts Requiring Review: {conflictCount}</Text>
        <Text style={styles.meta}>Last Synced: {lastSyncedAt ?? 'Never'}</Text>
      </View>

      <TouchableOpacity style={styles.btn} onPress={onSyncNow}>
        <Text style={styles.btnText}>Sync Now</Text>
      </TouchableOpacity>

      {failedCount > 0 && onRetryFailed && (
        <TouchableOpacity style={styles.secondaryBtn} onPress={onRetryFailed}>
          <Text style={styles.secondaryBtnText}>Retry Failed Operations</Text>
        </TouchableOpacity>
      )}

      {conflicts.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Conflicts Requiring Resolution</Text>
          {conflicts.map((c) => (
            <View key={c.operationId} style={styles.conflictItem}>
              <Text style={styles.row}>{c.action} on {c.entityId}</Text>
              <Text style={styles.meta}>{c.lastError ?? 'Server version changed'}</Text>
              {onResolveConflict && (
                <View style={styles.conflictActions}>
                  <TouchableOpacity
                    style={styles.secondaryBtn}
                    onPress={() => onResolveConflict(c.operationId, 'ACCEPT_SERVER')}
                  >
                    <Text style={styles.secondaryBtnText}>Accept Server</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.btn}
                    onPress={() => onResolveConflict(c.operationId, 'RETRY_WITH_SERVER_VERSION')}
                  >
                    <Text style={styles.btnText}>Reapply Mine</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      {syncHistory.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Recent Sync History</Text>
          {syncHistory.slice(0, 5).map((h) => (
            <Text key={h.id} style={styles.meta}>
              {new Date(h.createdAtIso).toLocaleTimeString()} — {h.summary}
            </Text>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#F8FAFC' },
  heading: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 12 },
  card: { backgroundColor: '#FFF', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', padding: 16, gap: 6, marginBottom: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  row: { fontSize: 14, color: '#0F172A', fontWeight: '500' },
  meta: { fontSize: 12, color: '#64748B', marginTop: 4 },
  btn: { backgroundColor: '#0D9488', borderRadius: 6, padding: 14, alignItems: 'center', marginBottom: 8 },
  btnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
  secondaryBtn: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 6, padding: 12, alignItems: 'center', marginBottom: 8 },
  secondaryBtnText: { color: '#0F172A', fontWeight: '600', fontSize: 13 },
  conflictItem: { borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 8, marginTop: 8 },
  conflictActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
});
