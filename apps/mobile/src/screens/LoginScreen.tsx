import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { BrandLogo } from '../components/BrandLogo';

export function LoginScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <BrandLogo />
        <Text style={styles.subtitle}>Technician Field Operations (Offline-Ready)</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>Phone or Work Email</Text>
        <TextInput style={styles.input} placeholder="vikram@company.in" placeholderTextColor="#94A3B8" />
        <Text style={styles.label}>Password</Text>
        <TextInput style={styles.input} secureTextEntry placeholder="••••••••" placeholderTextColor="#94A3B8" />
        <TouchableOpacity style={styles.button} accessibilityRole="button">
          <Text style={styles.buttonText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 13,
    color: '#475569',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  input: {
    height: 42,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    paddingHorizontal: 12,
    marginBottom: 14,
    color: '#0F172A',
  },
  button: {
    height: 44,
    backgroundColor: '#0D9488',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
