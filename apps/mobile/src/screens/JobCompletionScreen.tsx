import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export function JobCompletionScreen({
  notes,
  onChangeNotes,
  onComplete,
}: {
  notes: string;
  onChangeNotes: (val: string) => void;
  onComplete: () => void;
}) {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Complete Work Order</Text>
      <TextInput
        style={styles.input}
        multiline
        value={notes}
        onChangeText={onChangeNotes}
        placeholder="Enter technician completion summary…"
        placeholderTextColor="#94A3B8"
      />
      <TouchableOpacity style={styles.btn} onPress={onComplete}>
        <Text style={styles.btnText}>Mark Job Completed</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#F8FAFC', gap: 12 },
  heading: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  input: { minHeight: 110, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 6, padding: 12, textAlignVertical: 'top', color: '#0F172A' },
  btn: { backgroundColor: '#059669', borderRadius: 6, padding: 14, alignItems: 'center' },
  btnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
});
