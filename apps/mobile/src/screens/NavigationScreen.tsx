import React from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export function NavigationScreen({ address, latitude, longitude }: { address: string; latitude?: number; longitude?: number }) {
  const openMaps = () => {
    const query = latitude && longitude ? `${latitude},${longitude}` : encodeURIComponent(address);
    void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Site Navigation</Text>
      <Text style={styles.address}>{address}</Text>
      <TouchableOpacity style={styles.btn} onPress={openMaps}>
        <Text style={styles.btnText}>Open in Maps</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#F8FAFC' },
  heading: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  address: { fontSize: 14, color: '#475569', marginVertical: 12 },
  btn: { backgroundColor: '#0D9488', borderRadius: 6, padding: 14, alignItems: 'center' },
  btnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
});
