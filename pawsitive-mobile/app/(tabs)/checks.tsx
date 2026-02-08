import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Card from '@/components/ui/Card';
import { Colors } from '@/constants/Colors';

const checks = [
  { title: 'Water Intake', completed: true, icon: 'water-outline', subtitle: '500ml' },
  { title: 'Morning Walk', completed: true, icon: 'walk-outline', subtitle: '25 min' },
  { title: 'Breakfast', completed: true, icon: 'restaurant-outline', subtitle: 'Kibble' },
  { title: 'Medication', completed: false, icon: 'medkit-outline', subtitle: 'Evening dose' },
  { title: 'Playtime', completed: false, icon: 'play-outline', subtitle: 'Evening' },
];

export default function ChecksScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <Text style={styles.title}>Daily Checklist</Text>
      <FlatList
        data={checks}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.checkItem} activeOpacity={0.7}>
            <Card style={[styles.checkCard, item.completed && styles.completedCard]}>
              <View style={styles.checkContent}>
                <Ionicons 
                  name={item.icon as any} 
                  size={28} 
                  color={item.completed ? Colors.health.excellent : Colors.neutral.textLight} 
                />
                <View style={styles.checkTextContainer}>
                  <Text style={[styles.checkTitle, item.completed && styles.completedText]}>{item.title}</Text>
                  <Text style={styles.checkSubtitle}>{item.subtitle}</Text>
                </View>
                {item.completed ? (
                  <Ionicons name="checkmark-circle" size={28} color={Colors.health.excellent} />
                ) : (
                  <View style={styles.pendingCircle} />
                )}
              </View>
            </Card>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.neutral.background },
  title: { fontSize: 28, fontWeight: '800', color: Colors.primary.brown, marginBottom: 28, paddingHorizontal: 20, paddingTop: 12 },
  list: { paddingHorizontal: 20},
  checkItem: { marginBottom: 12 },
  checkCard: { padding: 20 },
  completedCard: { backgroundColor: Colors.health.excellent + '10' },
  checkContent: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  checkTextContainer: { flex: 1 },
  checkTitle: { fontSize: 18, fontWeight: '700', color: Colors.primary.brown },
  completedText: { color: Colors.health.excellent },
  checkSubtitle: { fontSize: 14, color: Colors.neutral.textLight, marginTop: 2 },
  pendingCircle: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: Colors.neutral.textLight },
});
