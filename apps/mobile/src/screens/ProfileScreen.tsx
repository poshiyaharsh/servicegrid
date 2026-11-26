import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BrandLogo } from '../components/BrandLogo';

export function ProfileScreen({ fullName, email, branchName }: { fullName: string; email: string; branchName: string }) {
  return (
    <View style={styles.container}>
      <BrandLogo />
      <Text style={styles.name}>{fullName}</Text>
      <Text style={styles.meta}>{email}</Text>
      <Text style={styles.meta}>Branch: {branchName}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#F8FAFC', gap: 8 },
  name: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginTop: 12 },
  meta: { fontSize: 14, color: '#475569' },
});
