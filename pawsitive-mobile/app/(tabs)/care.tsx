import React from 'react';
import { View, Text, SafeAreaView, StyleSheet, ScrollView } from 'react-native';
import Card from '@/components/ui/Card';
import { Colors } from '@/constants/Colors';

export default function CareScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Care Schedule</Text>
        
        <Card style={styles.scheduleCard}>
          <Text style={styles.subtitle}>Next Vet Visit</Text>
          <Text style={styles.date}>Feb 15, 2026</Text>
        </Card>

        <Card style={styles.scheduleCard}>
          <Text style={styles.subtitle}>Grooming</Text>
          <Text style={styles.date}>Every 6 weeks</Text>
        </Card>

        <Card style={styles.scheduleCard}>
          <Text style={styles.subtitle}>Vaccinations</Text>
          <Text style={styles.date}>Due Mar 2026</Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.neutral.background },
  content: { padding: 20, paddingBottom: 100 },
  title: { fontSize: 28, fontWeight: '700', color: Colors.primary.brown, marginBottom: 24, paddingTop: 12 },
  subtitle: { fontSize: 16, color: Colors.neutral.textLight, marginBottom: 4 },
  date: { fontSize: 20, fontWeight: '600', color: Colors.primary.brown },
  scheduleCard: { marginBottom: 16, padding: 20 },
});
