import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, Text, View } from 'react-native';

export interface MobileBrandLoaderProps {
  label?: string;
}

/**
 * React Native mobile startup loader (Loader Variant 5).
 * Uses native Animated API with OS reduced-motion support.
 */
export function BrandLoader({ label = 'Syncing FieldSutra workspace…' }: MobileBrandLoaderProps) {
  const [reduceMotion, setReduceMotion] = useState(false);
  const anims = useRef([
    new Animated.Value(0.4),
    new Animated.Value(0.4),
    new Animated.Value(0.4),
    new Animated.Value(0.4),
  ]).current;

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      anims.forEach((a) => a.setValue(0.95));
      return;
    }

    const loops = anims.map((anim, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 160),
          Animated.timing(anim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0.35,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
      ),
    );

    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [anims, reduceMotion]);

  return (
    <View style={styles.container} accessible accessibilityRole="progressbar" accessibilityLabel={label}>
      <View style={styles.grid}>
        <View style={styles.row}>
          <Animated.View style={[styles.square, styles.navy, { opacity: anims[0] }]} />
          <Animated.View style={[styles.circle, styles.teal, { opacity: anims[1] }]} />
        </View>
        <View style={styles.row}>
          <Animated.View style={[styles.square, styles.navy, { opacity: anims[3] }]} />
          <Animated.View style={[styles.square, styles.slate, { opacity: anims[2] }]} />
        </View>
      </View>
      <Text style={styles.brand}>FieldSutra</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    padding: 24,
  },
  grid: {
    gap: 5,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 5,
  },
  square: {
    width: 20,
    height: 20,
    borderRadius: 5,
  },
  circle: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  navy: { backgroundColor: '#0F172A' },
  teal: { backgroundColor: '#0D9488' },
  slate: { backgroundColor: '#334155' },
  brand: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  label: {
    marginTop: 4,
    fontSize: 13,
    color: '#64748B',
  },
});
