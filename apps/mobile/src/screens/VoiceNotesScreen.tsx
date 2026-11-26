import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export function VoiceNotesScreen({ onRecord }: { onRecord: () => void }) {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Voice Notes</Text>
      <Text style={styles.hint}>Record audio diagnostic notes offline; queued for sync.</Text>
      <TouchableOpacity style={styles.btn} onPress={onRecord}>
        <Text style={styles.btnText}>Record Voice Note</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#F8FAFC', gap: 12 },
  heading: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  hint: { fontSize: 13, color: '#475569' },
  btn: { backgroundColor: '#0D9488', borderRadius: 6, padding: 14, alignItems: 'center' },
  btnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
});
