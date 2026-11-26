import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { WorkOrderStatus } from '@servicegrid/types';
import type {
  LocalAsset,
  LocalCustomer,
  LocalJob,
  LocalJobHistory,
} from '../offline/offline-sync-engine';

export interface JobDetailsScreenProps {
  job: LocalJob;
  customer?: LocalCustomer;
  asset?: LocalAsset;
  history?: LocalJobHistory[];
  onTransitionStatus?: (nextStatus: WorkOrderStatus) => void;
  onSaveNotes?: (notes: {
    diagnosis?: string;
    repairPerformed?: string;
    completionNotes?: string;
  }) => void;
  onAction: (targetScreen: string) => void;
}

export function JobDetailsScreen({
  job,
  customer,
  asset,
  history = [],
  onTransitionStatus,
  onSaveNotes,
  onAction,
}: JobDetailsScreenProps) {
  const [diagnosis, setDiagnosis] = useState(job.diagnosis ?? '');
  const [repairPerformed, setRepairPerformed] = useState(job.repairPerformed ?? '');
  const [completionNotes, setCompletionNotes] = useState(job.completionNotes ?? '');

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.jobNum}>{job.jobNumber} • {job.priority}</Text>
      <Text style={styles.title}>{job.title}</Text>
      <Text style={styles.status}>Status: {job.status} (v{job.version})</Text>
      {job.description && <Text style={styles.desc}>{job.description}</Text>}
      {job.scheduledStartAt && (
        <Text style={styles.meta}>Scheduled: {new Date(job.scheduledStartAt).toLocaleString()}</Text>
      )}

      {customer && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Customer &amp; Site</Text>
          <Text style={styles.body}>{customer.displayName} • {customer.primaryPhone}</Text>
          {customer.addressSummary && <Text style={styles.meta}>{customer.addressSummary}</Text>}
        </View>
      )}

      {asset && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Equipment / Asset</Text>
          <Text style={styles.body}>
            {asset.category} {asset.brand ? `• ${asset.brand}` : ''} {asset.model ?? ''}
          </Text>
          {asset.serialNumber && <Text style={styles.meta}>S/N: {asset.serialNumber}</Text>}
        </View>
      )}

      {onTransitionStatus && (
        <View style={styles.statusActions}>
          {job.status === 'NEW' && (
            <TouchableOpacity style={styles.primaryBtn} onPress={() => onTransitionStatus('ASSIGNED')}>
              <Text style={styles.primaryBtnText}>Accept Job</Text>
            </TouchableOpacity>
          )}
          {(job.status === 'ASSIGNED' || job.status === 'SCHEDULED' || job.status === 'EN_ROUTE') && (
            <TouchableOpacity style={styles.primaryBtn} onPress={() => onTransitionStatus('IN_PROGRESS')}>
              <Text style={styles.primaryBtnText}>Start Job</Text>
            </TouchableOpacity>
          )}
          {job.status === 'IN_PROGRESS' && (
            <>
              <TouchableOpacity style={styles.btn} onPress={() => onTransitionStatus('ON_HOLD')}>
                <Text style={styles.btnText}>Pause Job</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => onTransitionStatus('COMPLETED')}>
                <Text style={styles.primaryBtnText}>Mark Completed</Text>
              </TouchableOpacity>
            </>
          )}
          {job.status === 'ON_HOLD' && (
            <TouchableOpacity style={styles.primaryBtn} onPress={() => onTransitionStatus('IN_PROGRESS')}>
              <Text style={styles.primaryBtnText}>Resume Job</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {onSaveNotes && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Field Diagnosis &amp; Repair Notes</Text>
          <TextInput
            style={styles.input}
            placeholder="Diagnosis"
            value={diagnosis}
            onChangeText={setDiagnosis}
          />
          <TextInput
            style={styles.input}
            placeholder="Repair performed"
            value={repairPerformed}
            onChangeText={setRepairPerformed}
          />
          <TextInput
            style={styles.input}
            placeholder="Completion notes"
            value={completionNotes}
            onChangeText={setCompletionNotes}
          />
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => onSaveNotes({ diagnosis, repairPerformed, completionNotes })}
          >
            <Text style={styles.primaryBtnText}>Save Notes Offline</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.actions}>
        {[
          ['Navigation', 'Navigate to Site'],
          ['Checklist', 'Job Checklist'],
          ['CameraCapture', 'Before / After Photos'],
          ['SpareParts', 'Spare Parts Usage'],
          ['CustomerSignature', 'Customer Signature'],
        ].map(([screen, label]) => (
          <TouchableOpacity key={screen} style={styles.btn} onPress={() => onAction(screen!)}>
            <Text style={styles.btnText}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {history.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Service History</Text>
          {history.map((h) => (
            <Text key={h.id} style={styles.meta}>
              {h.fromStatus ?? 'INIT'} → {h.toStatus} ({new Date(h.changedAt).toLocaleString()})
            </Text>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#F8FAFC' },
  jobNum: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  title: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginTop: 4 },
  status: { fontSize: 13, color: '#0D9488', fontWeight: '600', marginTop: 4 },
  desc: { fontSize: 13, color: '#334155', marginTop: 6 },
  meta: { fontSize: 12, color: '#64748B', marginTop: 4 },
  body: { fontSize: 14, color: '#0F172A', marginTop: 2 },
  card: { backgroundColor: '#FFF', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, marginTop: 12, gap: 6 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  statusActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  primaryBtn: { flex: 1, backgroundColor: '#0D9488', borderRadius: 6, padding: 12, alignItems: 'center' },
  primaryBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
  input: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 6, padding: 8, backgroundColor: '#F8FAFC' },
  actions: { marginTop: 12, gap: 8, marginBottom: 12 },
  btn: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 6, padding: 12, alignItems: 'center' },
  btnText: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
});
