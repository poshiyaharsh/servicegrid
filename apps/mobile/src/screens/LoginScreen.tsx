import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { BrandLogo } from '../components/BrandLogo';

export interface LoginScreenProps {
  onLogin?: (email: string, password: string) => Promise<void> | void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    if (!email.trim() || !password) {
      setError('Work email and password are required.');
      return;
    }
    setSubmitting(true);
    try {
      await onLogin?.(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <BrandLogo />
        <Text style={styles.subtitle}>Technician Field Operations (Offline-Ready)</Text>
      </View>
      <View style={styles.card}>
        {error && <Text style={styles.error}>{error}</Text>}
        <Text style={styles.label}>Phone or Work Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          placeholder="vikram@company.in"
          placeholderTextColor="#94A3B8"
        />
        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
          placeholderTextColor="#94A3B8"
        />
        <TouchableOpacity
          style={styles.button}
          accessibilityRole="button"
          disabled={submitting}
          onPress={() => void handleSubmit()}
        >
          <Text style={styles.buttonText}>{submitting ? 'Signing In…' : 'Sign In'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', backgroundColor: '#F8FAFC', padding: 20 },
  header: { alignItems: 'center', marginBottom: 24 },
  subtitle: { marginTop: 8, fontSize: 13, color: '#475569' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 10, padding: 18, borderWidth: 1, borderColor: '#E2E8F0', gap: 8 },
  error: { color: '#BE123C', fontSize: 12, marginBottom: 4 },
  label: { fontSize: 12, fontWeight: '600', color: '#334155' },
  input: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 6, padding: 10, color: '#0F172A' },
  button: { backgroundColor: '#0D9488', borderRadius: 6, padding: 12, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
});
