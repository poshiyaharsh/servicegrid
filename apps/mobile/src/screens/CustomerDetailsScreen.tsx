import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { LocalCustomer } from '../offline/offline-sync-engine';

export function CustomerDetailsScreen({ customer }: { customer: LocalCustomer }) {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>{customer.displayName}</Text>
      <Text style={styles.meta}>Phone: {customer.primaryPhone}</Text>
      {customer.addressSummary && <Text style={styles.meta}>Address: {customer.addressSummary}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#F8FAFC' },
  heading: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  meta: { fontSize: 14, color: '#475569', marginTop: 8 },
});
