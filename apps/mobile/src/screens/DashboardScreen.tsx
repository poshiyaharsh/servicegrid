import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export interface DashboardScreenProps {
  assignedCount: number;
  pendingSyncCount: number;
  isOnline: boolean;
  onNavigate: (screen: string) => void;
}

export function DashboardScreen({
  assignedCount,
  pendingSyncCount,
  isOnline,
  onNavigate,
}: DashboardScreenProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Technician Dashboard</Text>
      <Text style={styles.status}>{isOnline ? 'Online' : 'Offline Mode (SQLite Active)'}</Text>
      <View style={styles.row}>
        <TouchableOpacity style={styles.card} onPress={() => onNavigate('MyJobs')}>
          <Text style={styles.metric}>{assignedCount}</Text>
          <Text style={styles.label}>Assigned Jobs</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.card} onPress={() => onNavigate('SyncStatus')}>
          <Text style={styles.metric}>{pendingSyncCount}</Text>
          <Text style={styles.label}>Pending Sync</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.navBtn} onPress={() => onNavigate('Attendance')}>
        <Text style={styles.navBtnText}>Mark Attendance</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.navBtn} onPress={() => onNavigate('Profile')}>
        <Text style={styles.navBtnText}>Technician Profile</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#F8FAFC' },
  heading: { fontSize: 20, fontWeight: '700', color: '#0F172A' },
  status: { marginTop: 4, fontSize: 12, color: '#0D9488', fontWeight: '600' },
  row: { flexDirection: 'row', gap: 12, marginTop: 16 },
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
  },
  metric: { fontSize: 24, fontWeight: '700', color: '#0F172A' },
  label: { fontSize: 12, color: '#64748B', marginTop: 4 },
  navBtn: {
    marginTop: 12,
    backgroundColor: '#0F172A',
    borderRadius: 6,
    padding: 12,
    alignItems: 'center',
  },
  navBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
});
