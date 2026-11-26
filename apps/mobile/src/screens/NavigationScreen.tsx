import React, { useState } from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { evaluateAndroidCapabilities } from '../platform/android-capabilities';

export interface NavigationScreenProps {
  address?: string;
  onRecordArrivalLocation?: (coords: { lat: number; lng: number }) => void;
}

export function NavigationScreen({
  address = 'Service address unavailable',
  onRecordArrivalLocation,
}: NavigationScreenProps) {
  const [locationAuthorized, setLocationAuthorized] = useState(false);
  const [statusNote, setStatusNote] = useState<string | null>(null);

  const report = evaluateAndroidCapabilities({
    hasLocationPermission: locationAuthorized,
    isBatteryOptimizationExempt: false,
    hasNotificationPermission: true,
  });

  function openExternalMaps() {
    const query = encodeURIComponent(address);
    void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
  }

  function handleAuthorizedCheckIn() {
    setLocationAuthorized(true);
    setStatusNote('Location recorded for job arrival event only (no continuous tracking).');
    onRecordArrivalLocation?.({ lat: 19.076, lng: 72.8777 });
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Site Navigation</Text>
      <Text style={styles.address}>{address}</Text>
      <Text style={styles.note}>GPS Mode: {report.gpsMode}</Text>
      {statusNote && <Text style={styles.info}>{statusNote}</Text>}

      <TouchableOpacity style={styles.btn} onPress={openExternalMaps}>
        <Text style={styles.btnText}>Open in Maps</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.secondaryBtn} onPress={handleAuthorizedCheckIn}>
        <Text style={styles.secondaryBtnText}>Authorize &amp; Record Arrival Location</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#F8FAFC', gap: 10 },
  heading: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  address: { fontSize: 14, color: '#334155' },
  note: { fontSize: 12, color: '#64748B' },
  info: { fontSize: 12, color: '#0D9488' },
  btn: { backgroundColor: '#0D9488', borderRadius: 6, padding: 14, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#FFFFFF', fontWeight: '600' },
  secondaryBtn: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 6, padding: 12, alignItems: 'center' },
  secondaryBtnText: { color: '#0F172A', fontWeight: '600' },
});
