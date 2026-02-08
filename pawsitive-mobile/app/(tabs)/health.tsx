import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Card from '@/components/ui/Card';
import { Colors } from '@/constants/Colors';
import { useRouter } from 'expo-router';

export default function HealthScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.content} 
        showsVerticalScrollIndicator={false}
      >
        {/* Overview */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <TouchableOpacity><Text style={styles.linkText}>History</Text></TouchableOpacity>
        </View>
        
        <Card style={styles.scoreCard}>
          <View style={styles.scoreRow}>
            <View>
              <Text style={styles.scoreLabel}>Health Score</Text>
              <Text style={styles.scoreValue}>92<Text style={styles.scoreTotal}>/100</Text></Text>
            </View>
            <View style={[styles.badge, { backgroundColor: Colors.health.excellent + '20' }]}>
              <Ionicons name="trending-up" size={16} color={Colors.health.excellent} />
              <Text style={[styles.badgeText, { color: Colors.health.excellent }]}>+2%</Text>
            </View>
          </View>
        </Card>

        {/* Insights */}
        <Text style={styles.sectionTitle}>Insights</Text>
        <Card style={styles.aiCard}>
          <View style={styles.aiItem}>
             <Ionicons name="water-outline" size={20} color={Colors.primary.brown} />
             <Text style={styles.aiText}>Water intake is slightly low today.</Text>
          </View>
          <View style={[styles.aiItem, { borderBottomWidth: 0 }]}>
             <Ionicons name="scale-outline" size={20} color={Colors.primary.brown} />
             <Text style={styles.aiText}>Weight stable. Good job on the walks!</Text>
          </View>
        </Card>

        {/* TeleVet */}
        <Text style={styles.sectionTitle}>TeleVet</Text>
        <Card style={styles.teleVetCard}>
          <View style={styles.teleVetHeader}>
            <View style={styles.doctorAvatar}>
              <Text style={{fontSize: 24}}>👨‍⚕️</Text>
            </View>
            <View>
              <Text style={styles.docName}>Dr. Tan</Text>
              <Text style={styles.docRole}>Pawsitive Clinic • Senior Vet</Text>
            </View>
            <View style={styles.onlineBadge}>
              <View style={styles.onlineDot} />
            </View>
          </View>

          <View style={styles.slotRow}>
            <View style={styles.slotPill}>
              <Ionicons name="time-outline" size={14} color={Colors.primary.brown} />
              <Text style={styles.slotText}>Today, 6:30 PM</Text>
            </View>
            <View style={styles.slotPill}>
              <Ionicons name="calendar-outline" size={14} color={Colors.primary.brown} />
              <Text style={styles.slotText}>Tomorrow</Text>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.bookBtn} 
            onPress={() => router.push('/teleconsult')}
          >
            <Text style={styles.bookBtnText}>Book Consultation</Text>
          </TouchableOpacity>
        </Card>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.neutral.background },
  content: { padding: 20, paddingBottom: 120 },
  
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: Colors.primary.brown, marginBottom: 12 },
  linkText: { color: Colors.primary.orange, fontWeight: '700' },
  
  scoreCard: { padding: 20, marginBottom: 24 },
  scoreRow: { flexDirection: 'row', justifyContent: 'space-between' },
  scoreLabel: { fontSize: 14, color: Colors.neutral.textLight },
  scoreValue: { fontSize: 42, fontWeight: '800', color: Colors.primary.brown },
  scoreTotal: { fontSize: 20, color: Colors.neutral.textLight },
  badge: { flexDirection: 'row', alignItems: 'center', padding: 8, borderRadius: 12, gap: 4 },
  badgeText: { fontWeight: '700', fontSize: 12 },

  aiCard: { padding: 20, marginBottom: 24 },
  aiItem: { flexDirection: 'row', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.neutral.border },
  aiText: { fontSize: 14, color: Colors.primary.brown },

  teleVetCard: { padding: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: Colors.neutral.border },
  teleVetHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  doctorAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: Colors.neutral.background, justifyContent: 'center', alignItems: 'center' },
  docName: { fontSize: 18, fontWeight: '800', color: Colors.primary.brown },
  docRole: { fontSize: 13, color: Colors.neutral.textLight },
  onlineBadge: { marginLeft: 'auto' },
  onlineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.health.excellent },
  
  slotRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  slotPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.neutral.background },
  slotText: { fontSize: 12, fontWeight: '600', color: Colors.primary.brown },
  
  bookBtn: { backgroundColor: Colors.primary.brown, padding: 16, borderRadius: 16, alignItems: 'center' },
  bookBtnText: { color: Colors.primary.orange, fontWeight: '700', fontSize: 16 },
});