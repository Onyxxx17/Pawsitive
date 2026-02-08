import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import Card from '@/components/ui/Card';
import { Colors } from '@/constants/Colors';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <ScrollView 
        style={styles.container}
        contentContainerStyle={[
          styles.content, 
          { paddingTop: insets.top + 20 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* WOW Header */}
        <View style={styles.headerGradient}>
          <Text style={styles.welcomeText}>Good morning!</Text>
          <Text style={styles.welcomeSubtext}>Mochi is happy to see you 🐶</Text>
        </View>

        {/* Enhanced Pet Card */}
        <Card style={styles.petCard}>
          <View style={styles.petHeader}>
            <View style={styles.pawContainer}>
              <Ionicons name="paw" size={42} color={Colors.primary.orange} />
            </View>
            <View style={styles.petInfo}>
              <Text style={styles.petName}>Mochi</Text>
              <Text style={styles.petDetails}>Poodle • 2y • 5.2kg</Text>
            </View>
            <View style={[styles.healthBadge, { backgroundColor: Colors.health.excellent }]}>
              <Text style={styles.healthScore}>8.7</Text>
              <Text style={styles.trend}>↑ +0.5</Text>
            </View>
          </View>
          
          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={styles.progressFill} />
            </View>
            <Text style={styles.progressText}>87% Health Score</Text>
          </View>
        </Card>

        {/* Sparkle Stats */}
        <Card style={styles.statsCard}>
          <Text style={styles.sectionTitle}>This Week ✨</Text>
          <View style={styles.statsGrid}>
            {[
              { label: 'Walks', value: '12/14', color: Colors.health.excellent },
              { label: 'Feedings', value: '14/14', color: Colors.health.good },
              { label: 'Playtime', value: '10/14', color: Colors.health.fair }
            ].map((stat, index) => (
              <View key={index} style={styles.statItem}>
                <View style={[styles.statDot, { backgroundColor: stat.color }]} />
                <Text style={styles.statLabel}>{stat.label}</Text>
                <Text style={styles.statValue}>{stat.value}</Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Glassmorphism Actions */}
        <Card style={[styles.actionsCard, styles.glassCard]}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {[
              { label: 'Feed', icon: 'restaurant', subtitle: 'Breakfast' },
              { label: 'Walk', icon: 'walk', subtitle: '30 min' },
              { label: 'Check', icon: 'pulse', subtitle: 'Vitals' },
              { label: 'TeleVet', icon: 'call', subtitle: '24/7' },
            ].map((action, index) => (
              <TouchableOpacity key={index} style={styles.actionButton}>
                <Ionicons name={action.icon as any} size={26} color={Colors.primary.orange} />
                <View style={styles.actionTextContainer}>
                  <Text style={styles.actionLabel}>{action.label}</Text>
                  <Text style={styles.actionSubtitle}>{action.subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.primary.orange} />
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.neutral.background },
  container: { flex: 1 },
  content: { paddingHorizontal: 20 },
  
  headerGradient: {
    backgroundColor: Colors.primary.orange,  // ← Fixed: proper color
    padding: 24,
    borderRadius: 24,
    marginBottom: 20,
    shadowColor: '#FDD2B2',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  welcomeText: { fontSize: 28, fontWeight: '800', color: Colors.primary.brown, marginBottom: 4 },
  welcomeSubtext: { fontSize: 16, color: Colors.neutral.textLight },
  
  petCard: { marginBottom: 28 },
  petHeader: { flexDirection: 'row', alignItems: 'center', paddingTop: 12 },
  pawContainer: { 
    width: 56, height: 56, borderRadius: 28, 
    backgroundColor: Colors.primary.orange + '22',
    justifyContent: 'center', alignItems: 'center',
  },
  petInfo: { flex: 1, marginLeft: 20 },
  petName: { fontSize: 28, fontWeight: '800', color: Colors.primary.brown },
  petDetails: { fontSize: 17, color: Colors.neutral.textLight, marginTop: 2 },
  healthBadge: {
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 24, minWidth: 68, alignItems: 'center',
  },
  healthScore: { fontSize: 20, fontWeight: '800', color: 'white' },
  trend: { fontSize: 12, color: 'white', marginTop: 2 },
  
  progressContainer: { marginTop: 20 },
  progressBar: { height: 8, backgroundColor: Colors.neutral.border, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', width: '87%', backgroundColor: Colors.health.excellent, borderRadius: 4 },
  progressText: { fontSize: 15, color: Colors.neutral.textLight, marginTop: 8, textAlign: 'center' },
  
  statsCard: { marginBottom: 28 },
  sectionTitle: { fontSize: 22, fontWeight: '800', color: Colors.primary.brown, marginBottom: 20 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  statItem: { alignItems: 'center', flex: 1 },
  statDot: { width: 12, height: 12, borderRadius: 6, marginBottom: 6 },
  statLabel: { fontSize: 14, color: Colors.neutral.textLight, marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: '700', color: Colors.primary.brown },
  
  actionsCard: { marginBottom: 28 },
  glassCard: {
    backgroundColor: Colors.neutral.card,
    borderWidth: 1,
    borderColor: Colors.neutral.border,
  },
  actionsGrid: { gap: 12 },
  actionButton: {
    flexDirection: 'row', 
    alignItems: 'center',
    padding: 20, 
    borderRadius: 20,
    gap: 16, 
    height: 72,
    backgroundColor: Colors.primary.orange + '22',
    borderWidth: 1,
    borderColor: Colors.primary.orange + '44',
  },
  actionTextContainer: { flex: 1 },
  actionLabel: { fontSize: 17, fontWeight: '700', color: Colors.primary.brown },
  actionSubtitle: { fontSize: 13, color: Colors.neutral.textLight, marginTop: 2 },
});
