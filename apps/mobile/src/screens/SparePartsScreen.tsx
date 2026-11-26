import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export interface SparePartUsageItem {
  sku: string;
  name: string;
  quantity: number;
}

export function SparePartsScreen({
  parts,
  onAddPart,
}: {
  parts: SparePartUsageItem[];
  onAddPart: () => void;
}) {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Spare Parts Usage</Text>
      {parts.map((p) => (
        <View key={p.sku} style={styles.row}>
          <Text style={styles.name}>{p.name} ({p.sku})</Text>
          <Text style={styles.qty}>× {p.quantity}</Text>
        </View>
      ))}
      <TouchableOpacity style={styles.btn} onPress={onAddPart}>
        <Text style={styles.btnText}>Log Spare Part</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#F8FAFC', gap: 10 },
  heading: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  row: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, backgroundColor: '#FFF', borderRadius: 6, borderWidth: 1, borderColor: '#E2E8F0' },
  name: { fontSize: 14, color: '#0F172A' },
  qty: { fontSize: 14, fontWeight: '700', color: '#0D9488' },
  btn: { backgroundColor: '#0D9488', borderRadius: 6, padding: 14, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
});
