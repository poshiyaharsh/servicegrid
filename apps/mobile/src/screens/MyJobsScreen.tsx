import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { LocalJob } from '../offline/offline-sync-engine';

export interface MyJobsScreenProps {
  jobs: LocalJob[];
  onSelectJob: (job: LocalJob) => void;
}

export function MyJobsScreen({ jobs, onSelectJob }: MyJobsScreenProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>My Jobs</Text>
      <FlatList
        data={jobs}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.empty}>No assigned jobs cached locally.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => onSelectJob(item)}>
            <Text style={styles.jobNum}>{item.jobNumber} • {item.priority}</Text>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.status}>{item.status}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#F8FAFC' },
  heading: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 12 },
  empty: { fontSize: 13, color: '#64748B', marginTop: 20, textAlign: 'center' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 10,
  },
  jobNum: { fontSize: 11, color: '#64748B', fontWeight: '600' },
  title: { fontSize: 15, fontWeight: '600', color: '#0F172A', marginTop: 4 },
  status: { fontSize: 12, color: '#0D9488', fontWeight: '600', marginTop: 6 },
});
