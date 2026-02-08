import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Card from '@/components/ui/Card';
import { Colors } from '@/constants/Colors';

export default function HomeScreen() {
  
  // Time of Day Logic
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      return { title: 'Good Morning!', icon: 'sunny', color: '#FDB813', subtitle: 'Start the day with a stretch' };
    } else if (hour >= 12 && hour < 17) {
      return { title: 'Good Afternoon!', icon: 'sunny-outline', color: '#F57C00', subtitle: 'Time for a mid-day walk?' };
    } else if (hour >= 17 && hour < 20) {
      return { title: 'Good Evening!', icon: 'partly-sunny', color: '#FF7043', subtitle: 'Dinner time for Mochi' };
    } else {
      return { title: 'Good Night!', icon: 'moon', color: '#5C6BC0', subtitle: 'Sweet dreams, Mochi' };
    }
  };

  const greeting = getGreeting();

  return (
    <View style={styles.container}>
      <ScrollView 
        // FIX: Removed "insets.top". Normal padding is enough because the Header is above.
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        
        {/* Greeting Card */}
        <Card style={styles.greetingCard}>
          <View style={styles.greetingTextContainer}>
            <Text style={styles.greetingTitle}>{greeting.title}</Text>
            <Text style={styles.greetingSubtitle}>{greeting.subtitle}</Text>
          </View>
          <View style={styles.iconContainer}>
            <Ionicons name={greeting.icon as any} size={48} color={greeting.color} />
          </View>
        </Card>

        {/* Pet Card */}
        <Card style={styles.petCard}>
          <View style={styles.petHeader}>
            <View style={styles.pawContainer}>
              <Ionicons name="paw" size={42} color={Colors.primary.orange} />
            </View>
            <View style={styles.petInfo}>
              <Text style={styles.petName}>Mochi</Text>
              <Text style={styles.petDetails}>Poodle • 2y • 5.2kg</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={Colors.neutral.textLight} />
          </View>
        </Card>

        {/* Action Buttons */}
        <View style={styles.actionsGrid}>
           <Card style={styles.actionButton}>
              <View style={[styles.actionIconCircle, { backgroundColor: Colors.primary.orange + '20' }]}>
                <Ionicons name="camera" size={28} color={Colors.primary.brown} />
              </View>
              <Text style={styles.actionText}>Scan Health</Text>
           </Card>
           <Card style={styles.actionButton}>
              <View style={[styles.actionIconCircle, { backgroundColor: Colors.health.good + '20' }]}>
                 <Ionicons name="nutrition" size={28} color={Colors.primary.brown} />
              </View>
              <Text style={styles.actionText}>Log Food</Text>
           </Card>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.neutral.background },
  // content padding handles the spacing from the header
  content: { padding: 20, paddingBottom: 120 }, 
  
  greetingCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 24, marginBottom: 24, backgroundColor: '#fff',
    borderWidth: 1, borderColor: Colors.neutral.border,
    borderRadius: 24, // Consistent rounding
  },
  greetingTextContainer: { flex: 1 },
  greetingTitle: { fontSize: 26, fontWeight: '800', color: Colors.primary.brown },
  greetingSubtitle: { fontSize: 15, color: Colors.neutral.textLight, marginTop: 4 },
  iconContainer: { paddingLeft: 16 },

  petCard: { padding: 20, marginBottom: 24 },
  petHeader: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  pawContainer: { width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.neutral.background, justifyContent: 'center', alignItems: 'center' },
  petInfo: { flex: 1 },
  petName: { fontSize: 24, fontWeight: '800', color: Colors.primary.brown },
  petDetails: { fontSize: 14, color: Colors.neutral.textLight },

  actionsGrid: { flexDirection: 'row', gap: 16 },
  actionButton: { flex: 1, padding: 20, alignItems: 'center', justifyContent: 'center', gap: 12 },
  actionIconCircle: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  actionText: { fontWeight: '700', color: Colors.primary.brown, fontSize: 16 }
});