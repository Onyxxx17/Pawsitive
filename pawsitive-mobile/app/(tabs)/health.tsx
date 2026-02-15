import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Alert } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

const Card = ({ children, style }: any) => (
  <View style={[styles.card, style]}>{children}</View>
);

export default function HealthScreen() {
  
  const handleCallVet = () => {
    Alert.alert("Connecting...", "Starting video call with Dr. Sarah Smith");
  };

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={{ paddingBottom: 120 }} 
      showsVerticalScrollIndicator={false}
    >
      
      {/* 1. Header */}
      <View style={styles.headerSection}>
        <Text style={styles.pageTitle}>Health Overview</Text>
        <Text style={styles.lastUpdate}>Last updated: Today, 9:00 AM</Text>
      </View>

      {/* 2. Clean Score Card (No Border Frame) */}
      <Card style={styles.scoreCard}>
        <View style={styles.scoreLeft}>
          <View style={styles.scoreRing}>
            <Text style={styles.scoreText}>92</Text>
            <Text style={styles.scoreSub}>/100</Text>
          </View>
        </View>
        <View style={styles.scoreRight}>
          <Text style={styles.statusTitle}>Excellent Condition</Text>
          <Text style={styles.statusDesc}>
            Mochi's vitals are stable. Keep up the hydration and daily walks!
          </Text>
          <TouchableOpacity style={styles.detailBtn}>
            <Text style={styles.detailBtnText}>View Report</Text>
          </TouchableOpacity>
        </View>
      </Card>

      {/* 3. Vitals Grid */}
      <Text style={styles.sectionTitle}>Vitals</Text>
      <View style={styles.grid}>
        <Card style={styles.vitalCard}>
          <View style={[styles.iconCircle, { backgroundColor: '#E3F2FD' }]}>
            <MaterialCommunityIcons name="weight" size={24} color="#2196F3" />
          </View>
          <Text style={styles.vitalValue}>5.2 kg</Text>
          <Text style={styles.vitalLabel}>Weight</Text>
        </Card>

        <Card style={styles.vitalCard}>
          <View style={[styles.iconCircle, { backgroundColor: '#FFEBEE' }]}>
            <MaterialCommunityIcons name="heart-pulse" size={24} color="#F44336" />
          </View>
          <Text style={styles.vitalValue}>80 bpm</Text>
          <Text style={styles.vitalLabel}>Heart Rate</Text>
        </Card>

        <Card style={styles.vitalCard}>
          <View style={[styles.iconCircle, { backgroundColor: '#E8F5E9' }]}>
            <MaterialCommunityIcons name="thermometer" size={24} color="#4CAF50" />
          </View>
          <Text style={styles.vitalValue}>38.5°C</Text>
          <Text style={styles.vitalLabel}>Temp</Text>
        </Card>

        <Card style={styles.vitalCard}>
          <View style={[styles.iconCircle, { backgroundColor: '#FFF3E0' }]}>
            <MaterialCommunityIcons name="sleep" size={24} color="#FF9800" />
          </View>
          <Text style={styles.vitalValue}>12h</Text>
          <Text style={styles.vitalLabel}>Sleep</Text>
        </Card>
      </View>

      {/* 4. Tele-Vet Section */}
      <Text style={styles.sectionTitle}>Tele-Vet</Text>
      <Card style={styles.vetCard}>
        <View style={styles.vetHeader}>
          <Image 
            source={{ uri: 'https://i.pravatar.cc/150?u=vet' }} 
            style={styles.vetAvatar} 
          />
          <View style={styles.vetInfo}>
            <Text style={styles.vetName}>Dr. Sarah Smith</Text>
            <Text style={styles.vetSpec}>Senior Veterinarian • Available</Text>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={14} color="#FFD700" />
              <Text style={styles.ratingText}>4.9 (120 reviews)</Text>
            </View>
          </View>
        </View>

        <View style={styles.vetActions}>
          <TouchableOpacity style={styles.callButton} onPress={handleCallVet}>
            <Ionicons name="videocam" size={20} color="#fff" />
            <Text style={styles.callBtnText}>Video Call ($25)</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.chatButton}>
            <Ionicons name="chatbubble-ellipses" size={20} color={Colors.primary.brown} />
          </TouchableOpacity>
        </View>
      </Card>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.neutral.background, padding: 20 },
  
  headerSection: { marginBottom: 20 },
  pageTitle: { fontSize: 28, fontWeight: '800', color: Colors.primary.brown },
  lastUpdate: { fontSize: 13, color: Colors.neutral.textLight, marginTop: 4 },

  card: { backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },

  // Clean Score Card (No Border)
  scoreCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 20, 
    // No Border Width/Color here
  },
  scoreLeft: { marginRight: 20 },
  scoreRing: { 
    width: 80, height: 80, borderRadius: 40, 
    borderWidth: 6, borderColor: Colors.health.excellent, 
    justifyContent: 'center', alignItems: 'center', 
    backgroundColor: '#fff' 
  },
  scoreText: { fontSize: 26, fontWeight: '800', color: Colors.primary.brown },
  scoreSub: { fontSize: 10, color: Colors.neutral.textLight },
  scoreRight: { flex: 1 },
  statusTitle: { fontSize: 18, fontWeight: '700', color: Colors.primary.brown, marginBottom: 4 },
  statusDesc: { fontSize: 13, color: Colors.neutral.textLight, marginBottom: 12, lineHeight: 18 },
  detailBtn: { 
    backgroundColor: Colors.primary.orange + '20', 
    paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, alignSelf: 'flex-start' 
  },
  detailBtnText: { color: Colors.primary.orangeDark, fontSize: 12, fontWeight: '600' },

  // Vitals Grid
  sectionTitle: { fontSize: 20, fontWeight: '700', color: Colors.primary.brown, marginBottom: 12, marginTop: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  vitalCard: { width: '48%', alignItems: 'center', paddingVertical: 20 },
  iconCircle: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  vitalValue: { fontSize: 20, fontWeight: '700', color: Colors.primary.brown },
  vitalLabel: { fontSize: 14, color: Colors.neutral.textLight },

  // Vet Card
  vetCard: { padding: 20, marginBottom: 40 },
  vetHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  vetAvatar: { width: 60, height: 60, borderRadius: 30, marginRight: 15 },
  vetInfo: { flex: 1 },
  vetName: { fontSize: 18, fontWeight: '700', color: Colors.primary.brown },
  vetSpec: { fontSize: 13, color: Colors.neutral.textLight, marginBottom: 4 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontSize: 12, color: Colors.neutral.textLight, fontWeight: '600' },

  vetActions: { flexDirection: 'row', gap: 12 },
  callButton: { flex: 1, backgroundColor: Colors.primary.orangeDark, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 14, borderRadius: 14, gap: 8 },
  callBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  chatButton: { width: 50, backgroundColor: Colors.neutral.background, justifyContent: 'center', alignItems: 'center', borderRadius: 14, borderWidth: 1, borderColor: Colors.neutral.border },
});