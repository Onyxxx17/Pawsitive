import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';

// NOTE: Real video code is hidden for now so the app runs in Expo Go.

export default function TeleconsultScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🎥</Text>
      <Text style={styles.title}>Video Consultation</Text>
      <Text style={styles.message}>
        This feature is temporarily disabled.
      </Text>
      <Text style={styles.subtext}>
        (The video library 'agora' crashes Expo Go. 
        We will enable this later when we build the full app.)
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#fff',
    padding: 20
  },
  emoji: { fontSize: 60, marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: Colors.primary.brown, marginBottom: 10 },
  message: { fontSize: 16, color: '#333', textAlign: 'center' },
  subtext: { fontSize: 14, color: '#999', textAlign: 'center', marginTop: 20 }
});