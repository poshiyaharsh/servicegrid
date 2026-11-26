import { Platform } from 'react-native';

export interface AndroidRestrictionReport {
  platform: string;
  gpsMode: 'FINE_LOCATION' | 'MANUAL_FALLBACK';
  backgroundSyncPolicy: 'UNRESTRICTED' | 'BATTERY_OPTIMIZED_WARNING';
  notificationsEnabled: boolean;
  notes: string[];
}

/**
 * Evaluates Android OS/OEM restrictions explicitly rather than assuming uniform
 * background sync, GPS, or push notification behavior across devices.
 */
export function evaluateAndroidCapabilities(input: {
  hasLocationPermission: boolean;
  isBatteryOptimizationExempt: boolean;
  hasNotificationPermission: boolean;
}): AndroidRestrictionReport {
  const notes: string[] = [];

  if (!input.hasLocationPermission) {
    notes.push('Location permission denied: customer navigation will open external Maps intent.');
  }
  if (Platform.OS === 'android' && !input.isBatteryOptimizationExempt) {
    notes.push(
      'Android Doze/OEM battery optimization active: foreground/app-open sync is guaranteed; background sync may be deferred.',
    );
  }
  if (!input.hasNotificationPermission) {
    notes.push('Notification permission disabled: urgent dispatch alerts will appear in-app on refresh.');
  }

  return {
    platform: Platform.OS,
    gpsMode: input.hasLocationPermission ? 'FINE_LOCATION' : 'MANUAL_FALLBACK',
    backgroundSyncPolicy: input.isBatteryOptimizationExempt
      ? 'UNRESTRICTED'
      : 'BATTERY_OPTIMIZED_WARNING',
    notificationsEnabled: input.hasNotificationPermission,
    notes,
  };
}
