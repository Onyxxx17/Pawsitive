import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';

type Reminder = {
  id: string;
  title: string;
  type: string;
  next_trigger_at: string;
  pet_id: string;
};

interface NotificationPanelProps {
  visible: boolean;
  onClose: () => void;
}

export default function NotificationPanel({ visible, onClose }: NotificationPanelProps) {
  const [upcomingReminders, setUpcomingReminders] = useState<Reminder[]>([]);
  const router = useRouter();

  useEffect(() => {
    if (visible) {
      fetchUpcomingReminders();
    }
  }, [visible]);

  const fetchUpcomingReminders = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .eq('is_completed', false)
      .gte('next_trigger_at', now.toISOString())
      .lte('next_trigger_at', tomorrow.toISOString())
      .order('next_trigger_at', { ascending: true })
      .limit(10);

    if (error) {
      console.error('Error fetching reminder notifications:', error);
      return;
    }

    if (data) {
      setUpcomingReminders(data);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const getIconForType = (type: string) => {
    const icons: { [key: string]: any } = {
      feeding: 'restaurant',
      walking: 'walk',
      medication: 'medical',
      grooming: 'cut',
      checkup: 'medkit',
      custom: 'notifications',
    };
    return icons[type] || 'notifications';
  };

  const getReminderAccent = (type: string) => {
    const accents: Record<string, { bg: string; tint: string; soft: string }> = {
      feeding: { bg: '#FFF0E2', tint: '#C8702F', soft: '#FFF8F2' },
      walking: { bg: '#E5F6F2', tint: '#237A6B', soft: '#F4FBF9' },
      medication: { bg: '#F4EBFF', tint: '#7B55B7', soft: '#FAF7FF' },
      grooming: { bg: '#EAF4FF', tint: '#3877B7', soft: '#F7FBFF' },
      checkup: { bg: '#E8F1FF', tint: '#3569B1', soft: '#F5F9FF' },
      custom: { bg: '#FFF4E3', tint: '#A96B25', soft: '#FFFBF5' },
    };

    return accents[type] || accents.custom;
  };

  const formatTypeLabel = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const handleReminderTap = (reminder: Reminder) => {
    onClose();
    router.push('/(tabs)/activity');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity activeOpacity={1} style={styles.notificationPanel}>
          <View style={styles.notificationHeader}>
            <View style={styles.headerCopy}>
              <View style={styles.headerBadge}>
                <Ionicons name="notifications" size={16} color={Colors.primary.brown} />
                <Text style={styles.headerBadgeText}>Reminder inbox</Text>
              </View>
              <Text style={styles.notificationTitle}>Upcoming reminders</Text>
              <Text style={styles.notificationSubtitle}>
                {upcomingReminders.length > 0
                  ? `${upcomingReminders.length} scheduled in the next day`
                  : 'No pending reminders for the next day'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={22} color={Colors.primary.brown} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.notificationList} showsVerticalScrollIndicator={false}>
            {upcomingReminders.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconWrap}>
                  <Ionicons name="checkmark-done-circle" size={34} color={Colors.primary.brown} />
                </View>
                <Text style={styles.emptyText}>No upcoming reminders</Text>
                <Text style={styles.emptySubtext}>
                  {`You're all caught up. New reminders will show up here when they are due soon.`}
                </Text>
              </View>
            ) : (
              upcomingReminders.map((reminder) => {
                const accent = getReminderAccent(reminder.type);

                return (
                <TouchableOpacity 
                  key={reminder.id}
                  style={[styles.reminderCard, { backgroundColor: accent.soft }]}
                  onPress={() => handleReminderTap(reminder)}
                >
                  <View style={[styles.reminderIcon, { backgroundColor: accent.bg }]}>
                    <Ionicons 
                      name={getIconForType(reminder.type)} 
                      size={20} 
                      color={accent.tint} 
                    />
                  </View>
                  <View style={styles.reminderContent}>
                    <View style={styles.reminderMetaRow}>
                      <View style={[styles.typePill, { backgroundColor: accent.bg }]}>
                        <Text style={[styles.typePillText, { color: accent.tint }]}>
                          {formatTypeLabel(reminder.type)}
                        </Text>
                      </View>
                      <Text style={styles.reminderDateLabel}>{formatDate(reminder.next_trigger_at)}</Text>
                    </View>
                    <Text style={styles.reminderTitle}>{reminder.title}</Text>
                    <Text style={styles.reminderTime}>{formatTime(reminder.next_trigger_at)}</Text>
                  </View>
                  <View style={styles.chevronWrap}>
                    <Ionicons name="chevron-forward" size={18} color={Colors.primary.brown} />
                  </View>
                </TouchableOpacity>
              )})
            )}
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(48, 36, 27, 0.34)',
    justifyContent: 'flex-start',
    paddingTop: 92,
    paddingHorizontal: 14,
  },
  notificationPanel: {
    backgroundColor: '#FFF9F3',
    borderRadius: 28,
    maxHeight: '78%',
    borderWidth: 1,
    borderColor: '#EDDCCA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 8,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 18,
  },
  headerCopy: {
    flex: 1,
    paddingRight: 16,
  },
  headerBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F3E4D3',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 12,
  },
  headerBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary.brown,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  notificationTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.primary.brown,
    marginBottom: 6,
  },
  notificationSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.neutral.textLight,
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E9DCCF',
  },
  notificationList: {
    maxHeight: 440,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 56,
    paddingHorizontal: 24,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: '#F5E7D8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primary.brown,
    marginTop: 18,
  },
  emptySubtext: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.neutral.textLight,
    marginTop: 8,
    textAlign: 'center',
  },
  reminderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderRadius: 22,
    marginBottom: 12,
    gap: 12,
  },
  reminderIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reminderContent: {
    flex: 1,
  },
  reminderMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
  },
  typePill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  typePillText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  reminderDateLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.neutral.textLight,
  },
  reminderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary.brown,
    marginBottom: 4,
  },
  reminderTime: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.neutral.textLight,
  },
  chevronWrap: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.72)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
