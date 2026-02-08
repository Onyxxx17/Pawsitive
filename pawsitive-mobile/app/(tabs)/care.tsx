import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Card from '@/components/ui/Card';
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';

export default function CareScreen() {
  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.headerTitle}>Care Schedule</Text>
        
        <Card style={styles.scheduleCard}>
          <View style={styles.cardHeader}>
             <View style={styles.iconContainer}>
               <Ionicons name="calendar" size={24} color={Colors.primary.brown} />
             </View>
             <View>
              <Text style={styles.subtitle}>Next Vet Visit</Text>
              <Text style={styles.date}>Feb 15, 2026</Text>
             </View>
          </View>
        </Card>

        <Card style={styles.scheduleCard}>
          <View style={styles.cardHeader}>
             <View style={styles.iconContainer}>
               <Ionicons name="cut" size={24} color={Colors.primary.brown} />
             </View>
             <View>
              <Text style={styles.subtitle}>Grooming</Text>
              <Text style={styles.date}>Every 6 weeks</Text>
             </View>
          </View>
        </Card>

        <Card style={styles.scheduleCard}>
          <View style={styles.cardHeader}>
             <View style={styles.iconContainer}>
               <Ionicons name="medkit" size={24} color={Colors.primary.brown} />
             </View>
             <View>
              <Text style={styles.subtitle}>Vaccinations</Text>
              <Text style={styles.date}>Due Mar 2026</Text>
             </View>
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.neutral.background },
  headerTitle: { fontSize: 28, fontWeight: '800', color: Colors.primary.brown, marginBottom: 20 },
  scrollContent: { padding: 20, paddingBottom: 120 },
  scheduleCard: { marginBottom: 16, padding: 20 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  iconContainer: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.primary.orange + '20', justifyContent: 'center', alignItems: 'center' },
  subtitle: { fontSize: 14, color: Colors.neutral.textLight, marginBottom: 4, fontWeight: '600' },
  date: { fontSize: 18, fontWeight: '800', color: Colors.primary.brown }
});