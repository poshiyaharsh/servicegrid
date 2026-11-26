import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export interface SyncStatusScreenProps {
  pendingCount: number;
  failedCount: number;
  conflictCount: number;
  queuedAttachmentsCount: number;
  lastSyncedAt: string | null;
  onSyncNow: () => void;
}

export function SyncStatusScreen({
  pendingCount,
  failedCount,
  conflictCount,
  queuedAttachmentsCount,
  lastSyncedAt,
  onSyncNow,
}: SyncStatusScreenProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Synchronization Status</Text>
      <View style={styles.card}>
        <Text style={styles.row}>Pending Outbox Operations: {pendingCount}</Text>
        <Text style={styles.row}>Queued Attachments: {queuedAttachmentsCount}</Text>
        <Text style={styles.row}>Failed (Retrying): {failedCount}</Text>
        <Text style={styles.row}>Conflicts Requiring Review: {conflictCount}</Text>
        <Text style={styles.meta}>Last Synced: {lastSyncedAt ?? 'Never'}</Text>
      </View>
      <TouchableOpacity style={styles.btn} onPress={onSyncNow}>
        <Text style={styles.btnText}>Sync Now</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#F8FAFC', gap: 12 },
  heading: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  card: { backgroundColor: '#FFF', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', padding: 16, gap: 6 },
  row: { fontSize: 14, color: '#0F172A', fontWeight: '500' },
  meta: { fontSize: 12, color: '#64748B', marginTop: 4 },
  btn: { backgroundColor: '#0D9488', borderRadius: 6, padding: 14, alignItems: 'center' },
  btnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
});
