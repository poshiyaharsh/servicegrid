import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export function CameraCaptureScreen({
  onCapture,
}: {
  onCapture: (category: 'BEFORE_PHOTO' | 'AFTER_PHOTO') => void;
}) {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Camera Capture (Offline Queue)</Text>
      <TouchableOpacity style={styles.btn} onPress={() => onCapture('BEFORE_PHOTO')}>
        <Text style={styles.btnText}>Capture Before Photo</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.btn, styles.secondary]} onPress={() => onCapture('AFTER_PHOTO')}>
        <Text style={styles.btnText}>Capture After Photo</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#F8FAFC', gap: 12 },
  heading: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  btn: { backgroundColor: '#0D9488', borderRadius: 6, padding: 14, alignItems: 'center' },
  secondary: { backgroundColor: '#0F172A' },
  btnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
});
