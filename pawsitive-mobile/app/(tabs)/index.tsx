import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { usePet } from '../context/PetContext'; 

const Card = ({ children, style, onPress }: any) => (
  <TouchableOpacity 
    style={[styles.cardBase, style]} 
    onPress={onPress} 
    activeOpacity={onPress ? 0.7 : 1}
  >
    {children}
  </TouchableOpacity>
);

export default function HomeScreen() {
  const router = useRouter();
  const { activePet } = usePet(); // 👈 Get the Active Pet
  
  // Greeting Logic
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return { title: 'Good Morning', icon: 'weather-sunny', color: '#FDB813' };
    if (hour >= 12 && hour < 18) return { title: 'Good Afternoon', icon: 'weather-sunny', color: '#F57C00' };
    return { title: 'Good Evening', icon: 'weather-night', color: '#5C6BC0' };
  };
  const greeting = getGreeting();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      
      {/* 1. Dynamic Greeting Card */}
      <Card style={styles.greetingCard}>
        <View style={styles.greetingTextContainer}>
          <Text style={styles.greetingTitle}>{greeting.title},</Text>
          <Text style={styles.ownerName}>{activePet.name} 🐾</Text>
        </View>
        
        {/* 📸 Pet Avatar Display */}
        <View style={styles.avatarContainer}>
          <Image source={{ uri: activePet.avatar }} style={styles.largeAvatar} />
          <View style={styles.weatherBadge}>
             <MaterialCommunityIcons name={greeting.icon as any} size={16} color="#fff" />
          </View>
        </View>
      </Card>

      {/* 2. Upcoming */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Upcoming for {activePet.name}</Text>
        <TouchableOpacity onPress={() => router.push('/activity')}>
            <Text style={styles.seeAllText}>Calendar ›</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
        <Card style={[styles.reminderCard, { backgroundColor: '#E3F2FD' }]}>
          <View style={styles.reminderTop}>
             <Ionicons name="medkit" size={20} color="#2196F3" />
             <Text style={styles.reminderTime}>10:00 AM</Text>
          </View>
          <Text style={styles.reminderTitle}>Vaccination</Text>
          <Text style={styles.reminderSub}>Vet Clinic</Text>
        </Card>

        <Card style={[styles.reminderCard, { backgroundColor: Colors.primary.orange }]}> 
          <View style={styles.reminderTop}>
             <Ionicons name="walk" size={20} color={Colors.primary.brown} />
             <Text style={styles.reminderTime}>5:00 PM</Text>
          </View>
          <Text style={styles.reminderTitle}>Evening Walk</Text>
          <Text style={styles.reminderSub}>Target: 3km</Text>
        </Card>
      </ScrollView>

      {/* 3. Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Log</Text>
      <View style={styles.grid}>
        {[
          { icon: 'food-drumstick', label: 'Fed', color: Colors.health.good },
          { icon: 'water', label: 'Water', color: '#2196F3' },
          { icon: 'walk', label: 'Walk', color: Colors.primary.orangeDark },
          { icon: 'pill', label: 'Meds', color: Colors.health.poor },
        ].map((item, index) => (
          <TouchableOpacity 
            key={index} 
            style={styles.actionBtn}
            onPress={() => Alert.alert("Logged", `${item.label} recorded for ${activePet.name}!`)}
          >
            <View style={[styles.iconBox, { backgroundColor: item.color + '20' }]}>
              <MaterialCommunityIcons name={item.icon as any} size={24} color={item.color} />
            </View>
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
  
  cardBase: { backgroundColor: '#fff', borderRadius: 24, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  
  // Greeting Card Styles
  greetingCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, marginBottom: 25, borderWidth: 1, borderColor: Colors.neutral.border },
  greetingTextContainer: { flex: 1 },
  greetingTitle: { fontSize: 16, color: Colors.neutral.textLight },
  ownerName: { fontSize: 22, fontWeight: '800', color: Colors.neutral.text, marginTop: 4 },
  
  avatarContainer: { position: 'relative' },
  largeAvatar: { width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: '#fff' },
  weatherBadge: { position: 'absolute', bottom: 0, right: -4, backgroundColor: '#FDB813', width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },

  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.neutral.text },
  seeAllText: { fontSize: 14, color: Colors.primary.orangeDark, fontWeight: '600' },
  horizontalScroll: { marginBottom: 25 },
  
  reminderCard: { width: 160, padding: 16, borderRadius: 20, marginRight: 15 },
  reminderTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  reminderTime: { fontSize: 12, fontWeight: 'bold', opacity: 0.8, color: Colors.neutral.text },
  reminderTitle: { fontSize: 16, fontWeight: '700', marginBottom: 2, color: Colors.neutral.text },
  reminderSub: { fontSize: 12, color: Colors.neutral.text, opacity: 0.8 },
  
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 15 },
  actionBtn: { width: '47%', backgroundColor: '#fff', padding: 15, borderRadius: 16, alignItems: 'center', flexDirection: 'row', gap: 10, shadowColor: '#000', shadowOpacity: 0.05, elevation: 2 },
  iconBox: { padding: 10, borderRadius: 10 },
  actionLabel: { fontWeight: '600', color: Colors.neutral.text },
});