import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { usePet } from '../../context/PetContext';

export default function HomeScreen() {
  const router = useRouter();
  const { activePet } = usePet(); // 👈 Using Dynamic Pet Data

  const greeting = { title: 'Good Morning', icon: 'weather-sunny' };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      
      {/* Dynamic Greeting Card */}
      <TouchableOpacity style={styles.greetingCard} activeOpacity={0.9}>
        <View style={styles.greetingTextContainer}>
          <Text style={styles.greetingTitle}>{greeting.title},</Text>
          <Text style={styles.ownerName}>{activePet?.name || 'Buddy'} 🐾</Text>
        </View>
        <View style={styles.avatarContainer}>
          <Image source={{ uri: activePet?.avatar }} style={styles.largeAvatar} />
        </View>
      </TouchableOpacity>

      {/* Upcoming Section */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Upcoming for {activePet?.name}</Text>
        <TouchableOpacity onPress={() => router.push('/activity')}><Text style={styles.seeAllText}>Calendar ›</Text></TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
        <View style={[styles.reminderCard, { backgroundColor: '#E3F2FD' }]}>
          <View style={styles.reminderTop}><Ionicons name="medkit" size={20} color="#2196F3" /><Text style={styles.reminderTime}>10:00 AM</Text></View>
          <Text style={styles.reminderTitle}>Vaccination</Text>
          <Text style={styles.reminderSub}>Vet Clinic</Text>
        </View>
        <View style={[styles.reminderCard, { backgroundColor: Colors.primary.orange }]}> 
          <View style={styles.reminderTop}><Ionicons name="walk" size={20} color={Colors.primary.brown} /><Text style={styles.reminderTime}>5:00 PM</Text></View>
          <Text style={styles.reminderTitle}>Evening Walk</Text>
        </View>
      </ScrollView>

      {/* Quick Log */}
      <Text style={styles.sectionTitle}>Quick Log</Text>
      <View style={styles.grid}>
        {[{ icon: 'food-drumstick', label: 'Fed' }, { icon: 'water', label: 'Water' }, { icon: 'walk', label: 'Walk' }, { icon: 'pill', label: 'Meds' }].map((item, index) => (
          <TouchableOpacity key={index} style={styles.actionBtn} onPress={() => Alert.alert("Logged", `${item.label} recorded for ${activePet?.name}!`)}>
            <MaterialCommunityIcons name={item.icon as any} size={24} color={Colors.primary.brown} />
            <Text style={styles.actionLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.neutral.background },
  content: { padding: 20, paddingBottom: 120 },
  greetingCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, marginBottom: 25, backgroundColor: '#fff', borderRadius: 24, elevation: 3 },
  greetingTextContainer: { flex: 1 },
  greetingTitle: { fontSize: 16, color: Colors.neutral.textLight },
  ownerName: { fontSize: 22, fontWeight: '800', color: Colors.neutral.text, marginTop: 4 },
  avatarContainer: { position: 'relative' },
  largeAvatar: { width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: '#fff' },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.neutral.text },
  seeAllText: { fontSize: 14, color: Colors.primary.orangeDark, fontWeight: '600' },
  horizontalScroll: { marginBottom: 25 },
  reminderCard: { width: 160, padding: 16, borderRadius: 20, marginRight: 15 },
  reminderTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  reminderTime: { fontSize: 12, fontWeight: 'bold', opacity: 0.8 },
  reminderTitle: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  reminderSub: { fontSize: 12, opacity: 0.8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 15 },
  actionBtn: { width: '47%', backgroundColor: '#fff', padding: 15, borderRadius: 16, alignItems: 'center', flexDirection: 'row', gap: 10, elevation: 2 },
  actionLabel: { fontWeight: '600', color: Colors.neutral.text },
});