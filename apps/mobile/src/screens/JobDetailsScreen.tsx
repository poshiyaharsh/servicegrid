import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { LocalJob } from '../offline/offline-sync-engine';

export interface JobDetailsScreenProps {
  job: LocalJob;
  onAction: (targetScreen: string) => void;
}

export function JobDetailsScreen({ job, onAction }: JobDetailsScreenProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.jobNum}>{job.jobNumber}</Text>
      <Text style={styles.title}>{job.title}</Text>
      <Text style={styles.status}>Status: {job.status}</Text>
      <View style={styles.actions}>
        {[
          ['CustomerDetails', 'Customer Details'],
          ['Navigation', 'Navigate to Site'],
          ['Checklist', 'Job Checklist'],
          ['CameraCapture', 'Before / After Photos'],
          ['VoiceNotes', 'Voice Notes'],
          ['SpareParts', 'Spare Parts Usage'],
          ['CustomerSignature', 'Customer Signature'],
          ['JobCompletion', 'Complete Job'],
        ].map(([screen, label]) => (
          <TouchableOpacity key={screen} style={styles.btn} onPress={() => onAction(screen!)}>
            <Text style={styles.btnText}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#F8FAFC' },
  jobNum: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  title: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginTop: 4 },
  status: { fontSize: 13, color: '#0D9488', fontWeight: '600', marginTop: 4 },
  actions: { marginTop: 16, gap: 8 },
  btn: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 6, padding: 12 },
  btnText: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
});
