import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export function CustomerSignatureScreen({ onSaveSignature }: { onSaveSignature: () => void }) {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Customer Signature</Text>
      <View style={styles.pad}>
        <Text style={styles.padHint}>Signature capture canvas</Text>
      </View>
      <TouchableOpacity style={styles.btn} onPress={onSaveSignature}>
        <Text style={styles.btnText}>Save Signature</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#F8FAFC', gap: 12 },
  heading: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  pad: { height: 180, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  padHint: { color: '#94A3B8', fontSize: 13 },
  btn: { backgroundColor: '#0D9488', borderRadius: 6, padding: 14, alignItems: 'center' },
  btnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
});
