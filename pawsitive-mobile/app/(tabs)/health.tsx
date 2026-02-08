import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Card from '@/components/ui/Card';
import { Colors } from '@/constants/Colors';

export default function HealthScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Health Overview</Text>
        
        {/* Weight & Trends */}
        <Card style={styles.trendCard}>
          <Text style={styles.sectionTitle}>Weight History</Text>
          <View style={styles.trendRow}>
            <View style={styles.trendItem}>
              <Text style={styles.trendValue}>5.2kg</Text>
              <Text style={styles.trendLabel}>Current</Text>
            </View>
            <View style={[styles.trendStatus, { backgroundColor: Colors.health.excellent + '20' }]}>
              <Text style={styles.trendStatusText}>Stable</Text>
            </View>
          </View>
        </Card>

        {/* Vitals */}
        <Card style={styles.vitalsCard}>
          <Text style={styles.sectionTitle}>Recent Vitals</Text>
          <View style={styles.vitalsGrid}>
            {[
              { label: 'Heart Rate', value: '120 bpm', color: Colors.health.good },
              { label: 'Temperature', value: '38.5°C', color: Colors.health.excellent },
              { label: 'Activity', value: 'High', color: Colors.health.good },
            ].map((vital, index) => (
              <View key={index} style={styles.vitalItem}>
                <View style={[styles.vitalDot, { backgroundColor: vital.color }]} />
                <Text style={styles.vitalLabel}>{vital.label}</Text>
                <Text style={styles.vitalValue}>{vital.value}</Text>
              </View>
            ))}
          </View>
        </Card>

        {/* TeleVet - PROMINENT */}
        <TouchableOpacity style={styles.televetButton}>
        <View style={[styles.televetGradient, { 
            backgroundColor: Colors.primary.orange,
            borderColor: Colors.primary.brown,
            borderWidth: 1 
        }]}>
            <Ionicons name="call-outline" size={28} color="white" />
            <Text style={styles.televetTitle}>TeleVet Consultation</Text>
            <Text style={styles.televetSubtitle}>24/7 Vet Support</Text>
            <Ionicons name="chevron-forward" size={20} color="white" />
        </View>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.neutral.background },
  content: { padding: 20 },
  title: { fontSize: 28, fontWeight: '800', color: Colors.primary.brown, marginBottom: 28, paddingTop: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.primary.brown, marginBottom: 16 },
  trendCard: { marginBottom: 20, padding: 20 },
  trendRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  trendItem: { flex: 1 },
  trendValue: { fontSize: 28, fontWeight: '800', color: Colors.primary.brown },
  trendLabel: { fontSize: 14, color: Colors.neutral.textLight },
  trendStatus: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  trendStatusText: { color: Colors.primary.brown, fontWeight: '700', fontSize: 14 },
  vitalsCard: { marginBottom: 24, padding: 20 },
  vitalsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  vitalItem: { flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: '48%' },
  vitalDot: { width: 12, height: 12, borderRadius: 6, marginRight: 12 },
  vitalLabel: { fontSize: 15, color: Colors.neutral.textLight, flex: 1 },
  vitalValue: { fontSize: 16, fontWeight: '700', color: Colors.primary.brown },
  televetButton: { marginBottom: 20 },
  televetGradient: {
    flexDirection: 'row', alignItems: 'center',
    padding: 20, borderRadius: 20, gap: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 12, elevation: 8,
  },
  televetTitle: { fontSize: 18, fontWeight: '800', color: 'white', flex: 1 },
  televetSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
});
