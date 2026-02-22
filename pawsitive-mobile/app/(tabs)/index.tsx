import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { usePet } from '../../context/PetContext';
import { supabase } from '@/lib/supabase';
import { useFocusEffect } from '@react-navigation/native';

type Reminder = {
  id: string;
  title: string;
  type: string;
  next_trigger_at: string;
  is_active: boolean;
  recurrence_type?: 'once' | 'daily' | 'weekly' | 'monthly';
  recurrence_end_date?: string | null;
};

const REMINDER_TYPE_CONFIG: Record<string, { icon: string; color: string; bgColor: string }> = {
  feeding: { icon: 'restaurant', color: '#FF6B6B', bgColor: '#FFE5E5' },
  walking: { icon: 'walk', color: '#4ECDC4', bgColor: '#E0F7F6' },
  medication: { icon: 'medical', color: '#a053bfff', bgColor: '#F4E8FB' },
  grooming: { icon: 'cut', color: '#3498DB', bgColor: '#E3F2FD' },
  checkup: { icon: 'medkit', color: '#2196F3', bgColor: '#E3F2FD' },
  custom: { icon: 'notifications', color: '#F39C12', bgColor: '#FFF4E0' },
};

export default function HomeScreen() {
  const router = useRouter();
  const { activePet, loading: petsLoading } = usePet(); // 👈 Using Dynamic Pet Data
  const [upcomingReminders, setUpcomingReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);

  // Dynamic greeting based on current time
  const getGreeting = () => {
    const hour = new Date().getHours();
    
    if (hour >= 5 && hour < 12) {
      return { title: 'Good Morning', icon: 'weather-sunny' };
    } else if (hour >= 12 && hour < 17) {
      return { title: 'Good Afternoon', icon: 'partly-sunny' };
    } else if (hour >= 17 && hour < 21) {
      return { title: 'Good Evening', icon: 'moon' };
    } else {
      return { title: 'Good Night', icon: 'moon' };
    }
  };

  const greeting = getGreeting();

  useEffect(() => {
    if (activePet?.id && activePet.id !== 'default') {
      fetchUpcomingReminders();
    }
  }, [activePet?.id]);

  // Refresh reminders when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (activePet?.id && activePet.id !== 'default') {
        fetchUpcomingReminders();
      }
    }, [activePet?.id])
  );

  const fetchUpcomingReminders = async () => {
    try {
      setLoading(true);
      
      // Check if we have a valid pet ID
      if (!activePet?.id || activePet.id === 'default') {
        setUpcomingReminders([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .eq('pet_id', activePet.id)
        .eq('is_active', true)
        .order('next_trigger_at', { ascending: true });

      if (error) throw error;

      // Filter and process reminders
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      const upcoming = (data || []).filter((reminder) => {
        const triggerDate = new Date(reminder.next_trigger_at);
        
        // Check if reminder has ended
        if (reminder.recurrence_end_date) {
          const endDate = new Date(reminder.recurrence_end_date);
          if (today > endDate) return false;
        }

        // For recurring reminders, check if they should appear today or in the future
        if (reminder.recurrence_type && reminder.recurrence_type !== 'once') {
          const triggerDay = new Date(triggerDate.getFullYear(), triggerDate.getMonth(), triggerDate.getDate());
          
          if (reminder.recurrence_type === 'daily') {
            return true; // Daily reminders are always upcoming
          } else if (reminder.recurrence_type === 'weekly') {
            return true; // Weekly reminders will repeat
          } else if (reminder.recurrence_type === 'monthly') {
            return true; // Monthly reminders will repeat
          }
        }
        
        // For one-time reminders or specific dates, only show if in the future
        return triggerDate >= now;
      }).slice(0, 2); // Get only the first 2

      setUpcomingReminders(upcoming);
    } catch (error) {
      console.error('Error fetching upcoming reminders:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      
      {/* Show loading state while pets are being fetched */}
      {petsLoading ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Loading your pets...</Text>
        </View>
      ) : activePet?.id === 'default' ? (
        // Show "Add a Pet" state only when loading is done and no pets exist
        <View style={styles.emptyState}>
          <Ionicons name="paw" size={80} color={Colors.neutral.textLight} />
          <Text style={styles.emptyTitle}>No pets yet</Text>
          <Text style={styles.emptySub}>Add your first pet to get started</Text>
          <TouchableOpacity 
            style={styles.addPetButton}
            onPress={() => router.push('/create-pet')}
            activeOpacity={0.7}
          >
            <Text style={styles.addPetButtonText}>Add Pet</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
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

          {loading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Loading...</Text>
            </View>
          ) : upcomingReminders.length === 0 ? (
            <TouchableOpacity 
              style={styles.emptyReminderCard} 
              onPress={() => router.push('/activity')}
              activeOpacity={0.7}
            >
              <Ionicons name="calendar-outline" size={32} color={Colors.neutral.textLight} />
              <Text style={styles.emptyTitle}>Nothing to do today</Text>
              <Text style={styles.emptySub}>Tap to add a reminder</Text>
            </TouchableOpacity>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
              {upcomingReminders.map((reminder) => {
                const config = REMINDER_TYPE_CONFIG[reminder.type] || REMINDER_TYPE_CONFIG.custom;
                const triggerDate = new Date(reminder.next_trigger_at);
                const timeStr = triggerDate.toLocaleTimeString('en-US', { 
                  hour: 'numeric', 
                  minute: '2-digit', 
                  hour12: true 
                });
                
                return (
                  <TouchableOpacity
                    key={reminder.id}
                    style={[styles.reminderCard, { backgroundColor: config.bgColor }]}
                    onPress={() => {
                      // Navigate to activity screen with the specific date
                      router.push({
                        pathname: '/activity',
                        params: { 
                          selectedDate: triggerDate.toISOString(),
                          timestamp: Date.now().toString(), // Force re-render with unique timestamp
                        }
                      });
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.reminderTop}>
                      <Ionicons name={config.icon as any} size={20} color={config.color} />
                      <Text style={[styles.reminderTime, { color: config.color }]}>{timeStr}</Text>
                    </View>
                    <Text style={[styles.reminderTitle, { color: config.color }]} numberOfLines={1}>
                      {reminder.title}
                    </Text>
                    {reminder.recurrence_type && reminder.recurrence_type !== 'once' && typeof reminder.recurrence_type === 'string' && (
                      <Text style={[styles.reminderSub, { color: config.color }]}>
                        {reminder.recurrence_type.charAt(0).toUpperCase() + reminder.recurrence_type.slice(1)}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

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
        </>
      )}
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
  emptyState: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 30,
  },
  emptyText: { 
    fontSize: 14, 
    color: Colors.neutral.textLight,
  },
  emptyReminderCard: { 
    backgroundColor: '#fff', 
    padding: 30, 
    borderRadius: 20, 
    alignItems: 'center', 
    justifyContent: 'center',
    marginBottom: 25,
    borderWidth: 2,
    borderColor: Colors.neutral.border,
    borderStyle: 'dashed',
  },
  emptyTitle: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: Colors.neutral.text,
    marginTop: 12,
  },
  emptySub: { 
    fontSize: 14, 
    color: Colors.neutral.textLight,
    marginTop: 4,
  },
  addPetButton: {
    backgroundColor: Colors.primary.orangeDark,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 16,
    marginTop: 20,
  },
  addPetButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});