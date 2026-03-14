import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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

const REMINDER_TYPE_CONFIG: Record<string, { icon: string; color: string; bgColor: string; softColor: string }> = {
  feeding: { icon: 'restaurant', color: '#C8702F', bgColor: '#FFE5D0', softColor: '#FFF7F0' },
  walking: { icon: 'walk', color: '#237A6B', bgColor: '#DDF5F0', softColor: '#F5FCFA' },
  medication: { icon: 'medical', color: '#7B55B7', bgColor: '#EFE6FF', softColor: '#FAF7FF' },
  grooming: { icon: 'cut', color: '#3877B7', bgColor: '#E5F1FF', softColor: '#F7FBFF' },
  checkup: { icon: 'medkit', color: '#3569B1', bgColor: '#E7F0FF', softColor: '#F5F9FF' },
  custom: { icon: 'notifications', color: '#A96B25', bgColor: '#FFF1DC', softColor: '#FFFBF5' },
};

const QUICK_ACTIONS = [
  { icon: 'food-drumstick', label: 'Fed', tint: '#F4E5D4' },
  { icon: 'water', label: 'Water', tint: '#E1F0FB' },
  { icon: 'walk', label: 'Walk', tint: '#E3F4EA' },
  { icon: 'pill', label: 'Meds', tint: '#F2E8FB' },
];

export default function HomeScreen() {
  const router = useRouter();
  const { activePet, loading: petsLoading } = usePet();
  const [upcomingReminders, setUpcomingReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();

    if (hour >= 5 && hour < 12) {
      return { title: 'Good Morning', icon: 'weather-sunny' as const, accent: '#FFF4CF' };
    }
    if (hour >= 12 && hour < 17) {
      return { title: 'Good Afternoon', icon: 'partly-sunny' as const, accent: '#FFE7C7' };
    }
    if (hour >= 17 && hour < 21) {
      return { title: 'Good Evening', icon: 'moon' as const, accent: '#E9DDF6' };
    }
    return { title: 'Good Night', icon: 'moon' as const, accent: '#E3DCF4' };
  }, []);

  const fetchUpcomingReminders = useCallback(async () => {
    try {
      setLoading(true);

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

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const upcoming = (data || [])
        .filter((reminder) => {
          const triggerDate = new Date(reminder.next_trigger_at);

          if (reminder.recurrence_end_date) {
            const endDate = new Date(reminder.recurrence_end_date);
            if (today > endDate) return false;
          }

          if (reminder.recurrence_type && reminder.recurrence_type !== 'once') {
            if (reminder.recurrence_type === 'daily') return true;
            if (reminder.recurrence_type === 'weekly') return true;
            if (reminder.recurrence_type === 'monthly') return true;
          }

          return triggerDate >= now;
        })
        .slice(0, 3);

      setUpcomingReminders(upcoming);
    } catch (error) {
      console.error('Error fetching upcoming reminders:', error);
    } finally {
      setLoading(false);
    }
  }, [activePet?.id]);

  useEffect(() => {
    if (activePet?.id && activePet.id !== 'default') {
      fetchUpcomingReminders();
    }
  }, [activePet?.id, fetchUpcomingReminders]);

  useFocusEffect(
    useCallback(() => {
      if (activePet?.id && activePet.id !== 'default') {
        fetchUpcomingReminders();
      }
    }, [activePet?.id, fetchUpcomingReminders]),
  );

  const nextReminder = upcomingReminders[0];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {petsLoading ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Loading your pets...</Text>
        </View>
      ) : activePet?.id === 'default' ? (
        <View style={styles.emptyPetWrap}>
          <LinearGradient colors={['#FFF4E7', '#F2E0CD']} style={styles.emptyPetCard}>
            <View style={styles.emptyPetIconWrap}>
              <Ionicons name="paw" size={42} color={Colors.primary.brown} />
            </View>
            <Text style={styles.emptyTitle}>No pets yet</Text>
            <Text style={styles.emptySub}>Add your first pet to unlock reminders, health logs, and daily care tools.</Text>
            <TouchableOpacity
              style={styles.addPetButton}
              onPress={() => router.push('/create-pet')}
              activeOpacity={0.8}
            >
              <Text style={styles.addPetButtonText}>Add Your First Pet</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      ) : (
        <>
          <LinearGradient
            colors={['#F6E7D8', '#EEDFD1']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <View style={styles.heroTopRow}>
              <View style={[styles.greetingBadge, { backgroundColor: greeting.accent }]}>
                <Ionicons name={greeting.icon} size={16} color={Colors.primary.brown} />
                <Text style={styles.greetingBadgeText}>{greeting.title}</Text>
              </View>
              <TouchableOpacity style={styles.heroCalendarButton} onPress={() => router.push('/activity')}>
                <Ionicons name="calendar-outline" size={18} color={Colors.primary.brown} />
              </TouchableOpacity>
            </View>

            <Text style={styles.heroTitle}>How is {activePet?.name} doing today?</Text>
            <Text style={styles.heroSubtitle}>
              Keep routines steady, stay ahead of reminders, and log the basics in a few taps.
            </Text>

            <View style={styles.heroBottomRow}>
              <Image source={{ uri: activePet?.avatar }} style={styles.largeAvatar} />
              <View style={styles.heroBottomText}>
                <Text style={styles.heroHighlightLabel}>Next up</Text>
                <Text style={styles.heroHighlightValue}>
                  {loading
                    ? 'Loading reminders...'
                    : nextReminder
                      ? nextReminder.title
                      : 'Nothing urgent right now'}
                </Text>
                <Text style={styles.heroHighlightMeta}>
                  {nextReminder
                    ? `${new Date(nextReminder.next_trigger_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })} • ${new Date(nextReminder.next_trigger_at).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                      })}`
                    : 'A calm day is a good day.'}
                </Text>
              </View>
            </View>
          </LinearGradient>

          <View style={styles.summaryStrip}>
            <View style={styles.summaryChip}>
              <Text style={styles.summaryValue}>{upcomingReminders.length}</Text>
              <Text style={styles.summaryLabel}>Upcoming</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryChip}>
              <Text style={styles.summaryValue}>{QUICK_ACTIONS.length}</Text>
              <Text style={styles.summaryLabel}>Quick logs</Text>
            </View>
            <View style={styles.summaryDivider} />
            <TouchableOpacity style={styles.summaryChip} onPress={() => router.push('/health')}>
              <Text style={styles.summaryValue}>Health</Text>
              <Text style={styles.summaryLabel}>Open dashboard</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionEyebrow}>Today&apos;s flow</Text>
              <Text style={styles.sectionTitle}>Upcoming for {activePet?.name}</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/activity')}>
              <Text style={styles.seeAllText}>Open calendar</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingCard}>
              <Text style={styles.emptyText}>Loading reminders...</Text>
            </View>
          ) : upcomingReminders.length === 0 ? (
            <TouchableOpacity
              style={styles.emptyReminderCard}
              onPress={() => router.push('/activity')}
              activeOpacity={0.8}
            >
              <View style={styles.emptyReminderIcon}>
                <Ionicons name="sparkles-outline" size={24} color={Colors.primary.brown} />
              </View>
              <Text style={styles.emptyTitle}>Nothing scheduled right now</Text>
              <Text style={styles.emptySub}>It looks like {activePet?.name} has a quiet day. Add a reminder anytime.</Text>
            </TouchableOpacity>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
              {upcomingReminders.map((reminder) => {
                const config = REMINDER_TYPE_CONFIG[reminder.type] || REMINDER_TYPE_CONFIG.custom;
                const triggerDate = new Date(reminder.next_trigger_at);
                const timeStr = triggerDate.toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                });

                return (
                  <TouchableOpacity
                    key={reminder.id}
                    style={[styles.reminderCard, { backgroundColor: config.softColor }]}
                    onPress={() => {
                      router.push({
                        pathname: '/activity',
                        params: {
                          selectedDate: triggerDate.toISOString(),
                          timestamp: Date.now().toString(),
                        },
                      });
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={styles.reminderHeader}>
                      <View style={[styles.reminderIconWrap, { backgroundColor: config.bgColor }]}>
                        <Ionicons name={config.icon as any} size={18} color={config.color} />
                      </View>
                      <Text style={[styles.reminderTime, { color: config.color }]}>{timeStr}</Text>
                    </View>
                    <Text style={styles.reminderTitle} numberOfLines={2}>
                      {reminder.title}
                    </Text>
                    <Text style={styles.reminderDate}>
                      {triggerDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </Text>
                    {reminder.recurrence_type && reminder.recurrence_type !== 'once' ? (
                      <View style={styles.recurrencePill}>
                        <Text style={styles.recurrenceText}>
                          {reminder.recurrence_type.charAt(0).toUpperCase() + reminder.recurrence_type.slice(1)}
                        </Text>
                      </View>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionEyebrow}>Fast actions</Text>
              <Text style={styles.sectionTitle}>Quick log</Text>
            </View>
          </View>

          <View style={styles.grid}>
            {QUICK_ACTIONS.map((item) => (
              <TouchableOpacity
                key={item.label}
                style={styles.actionBtn}
                onPress={() => Alert.alert('Logged', `${item.label} recorded for ${activePet?.name}!`)}
                activeOpacity={0.8}
              >
                <View style={[styles.actionIconWrap, { backgroundColor: item.tint }]}>
                  <MaterialCommunityIcons name={item.icon as any} size={22} color={Colors.primary.brown} />
                </View>
                <View>
                  <Text style={styles.actionLabel}>{item.label}</Text>
                  <Text style={styles.actionSubtext}>Tap to record</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F4ED',
  },
  content: {
    padding: 20,
    paddingBottom: 120,
  },
  heroCard: {
    borderRadius: 30,
    padding: 22,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E8D8C9',
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  greetingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  greetingBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary.brown,
  },
  heroCalendarButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    color: Colors.primary.brown,
    marginBottom: 8,
    maxWidth: '92%',
  },
  heroSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: '#72645B',
    marginBottom: 20,
    maxWidth: '92%',
  },
  heroBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  heroBottomText: {
    flex: 1,
  },
  heroHighlightLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    color: Colors.neutral.textLight,
    marginBottom: 6,
  },
  heroHighlightValue: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
    color: Colors.primary.brown,
    marginBottom: 6,
  },
  heroHighlightMeta: {
    fontSize: 13,
    lineHeight: 18,
    color: Colors.neutral.textLight,
  },
  largeAvatar: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: '#E8DDD2',
  },
  summaryStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4ECE3',
    borderRadius: 24,
    paddingVertical: 16,
    paddingHorizontal: 14,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: '#E8DCCF',
  },
  summaryChip: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primary.brown,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.neutral.textLight,
  },
  summaryDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#DDD0C2',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 14,
  },
  sectionEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: Colors.primary.orangeDark,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.neutral.text,
  },
  seeAllText: {
    fontSize: 14,
    color: Colors.primary.brown,
    fontWeight: '700',
  },
  horizontalScroll: {
    marginBottom: 26,
  },
  reminderCard: {
    width: 196,
    padding: 16,
    borderRadius: 24,
    marginRight: 14,
    borderWidth: 1,
    borderColor: '#E9DDD1',
  },
  reminderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  reminderIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reminderTime: {
    fontSize: 13,
    fontWeight: '800',
  },
  reminderTitle: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '800',
    color: Colors.primary.brown,
    marginBottom: 8,
  },
  reminderDate: {
    fontSize: 13,
    color: Colors.neutral.textLight,
    marginBottom: 10,
  },
  recurrencePill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.72)',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  recurrenceText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary.brown,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  actionBtn: {
    width: '47.5%',
    backgroundColor: '#FBF7F2',
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#E9DED2',
  },
  actionIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionLabel: {
    fontWeight: '700',
    fontSize: 15,
    color: Colors.neutral.text,
    marginBottom: 2,
  },
  actionSubtext: {
    fontSize: 12,
    color: Colors.neutral.textLight,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
  },
  loadingCard: {
    backgroundColor: '#FFF9F3',
    borderRadius: 22,
    paddingVertical: 26,
    paddingHorizontal: 18,
    alignItems: 'center',
    marginBottom: 26,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.neutral.textLight,
  },
  emptyPetWrap: {
    paddingTop: 16,
  },
  emptyPetCard: {
    borderRadius: 30,
    padding: 24,
    alignItems: 'center',
  },
  emptyPetIconWrap: {
    width: 82,
    height: 82,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.64)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  emptyReminderCard: {
    backgroundColor: '#FFF9F3',
    padding: 24,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 26,
    borderWidth: 1,
    borderColor: '#EADCCC',
  },
  emptyReminderIcon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: '#F3E3D2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.neutral.text,
    marginTop: 2,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.neutral.textLight,
    marginTop: 8,
    textAlign: 'center',
  },
  addPetButton: {
    backgroundColor: Colors.primary.brown,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 18,
    marginTop: 22,
  },
  addPetButtonText: {
    color: '#FFF9F2',
    fontSize: 16,
    fontWeight: '700',
  },
});
