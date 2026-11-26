import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export interface MobileBrandLogoProps {
  dark?: boolean;
  showWordmark?: boolean;
}

export function BrandLogo({ dark = false, showWordmark = true }: MobileBrandLogoProps) {
  const baseColor = dark ? '#F8FAFC' : '#0F172A';
  const accentColor = dark ? '#14B8A6' : '#0D9488';
  const mutedColor = dark ? '#94A3B8' : '#334155';

  return (
    <View style={styles.row} accessible accessibilityLabel="FieldSutra">
      <View style={styles.grid}>
        <View style={styles.gridRow}>
          <View style={[styles.square, { backgroundColor: baseColor }]} />
          <View style={[styles.circle, { backgroundColor: accentColor }]} />
        </View>
        <View style={styles.gridRow}>
          <View style={[styles.square, { backgroundColor: baseColor }]} />
          <View style={[styles.square, { backgroundColor: mutedColor }]} />
        </View>
      </View>
      {showWordmark && (
        <Text style={[styles.wordmark, { color: baseColor }]}>
          Field<Text style={{ color: accentColor }}>Sutra</Text>
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  grid: {
    gap: 3,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 3,
  },
  square: {
    width: 14,
    height: 14,
    borderRadius: 3.5,
  },
  circle: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  wordmark: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
});
