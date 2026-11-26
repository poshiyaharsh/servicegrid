import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export function AttendanceScreen({
  checkedIn,
  onToggleAttendance,
}: {
  checkedIn: boolean;
  onToggleAttendance: () => void;
}) {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Daily Attendance</Text>
      <Text style={styles.status}>Current Status: {checkedIn ? 'Checked In' : 'Checked Out'}</Text>
      <TouchableOpacity style={styles.btn} onPress={onToggleAttendance}>
        <Text style={styles.btnText}>{checkedIn ? 'Check Out' : 'Check In'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#F8FAFC', gap: 12 },
  heading: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  status: { fontSize: 14, color: '#475569' },
  btn: { backgroundColor: '#0D9488', borderRadius: 6, padding: 14, alignItems: 'center' },
  btnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
});
