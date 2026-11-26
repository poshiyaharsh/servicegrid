import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export interface MobileChecklistItem {
  id: string;
  label: string;
  completed: boolean;
}

export function ChecklistScreen({
  items,
  onToggle,
}: {
  items: MobileChecklistItem[];
  onToggle: (id: string) => void;
}) {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Job Checklist</Text>
      {items.map((item) => (
        <TouchableOpacity key={item.id} style={styles.row} onPress={() => onToggle(item.id)}>
          <Text style={styles.box}>{item.completed ? '[✓]' : '[ ]'}</Text>
          <Text style={styles.label}>{item.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#F8FAFC' },
  heading: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderColor: '#E2E8F0' },
  box: { fontSize: 15, fontWeight: '700', color: '#0D9488', marginRight: 10 },
  label: { fontSize: 14, color: '#0F172A' },
});
