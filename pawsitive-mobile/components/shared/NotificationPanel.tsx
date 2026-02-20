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
            <Text style={styles.notificationTitle}>Upcoming Reminders</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={Colors.primary.brown} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.notificationList} showsVerticalScrollIndicator={false}>
            {upcomingReminders.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="checkmark-circle-outline" size={48} color={Colors.primary.orange} />
                <Text style={styles.emptyText}>No upcoming reminders</Text>
                <Text style={styles.emptySubtext}>You're all caught up!</Text>
              </View>
            ) : (
              upcomingReminders.map((reminder) => (
                <TouchableOpacity 
                  key={reminder.id}
                  style={styles.reminderCard}
                  onPress={() => handleReminderTap(reminder)}
                >
                  <View style={styles.reminderIcon}>
                    <Ionicons 
                      name={getIconForType(reminder.type)} 
                      size={20} 
                      color={Colors.primary.orange} 
                    />
                  </View>
                  <View style={styles.reminderContent}>
                    <Text style={styles.reminderTitle}>{reminder.title}</Text>
                    <Text style={styles.reminderTime}>
                      {formatDate(reminder.next_trigger_at)} at {formatTime(reminder.next_trigger_at)}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={Colors.neutral.textLight} />
                </TouchableOpacity>
              ))
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-start',
    paddingTop: 100,
  },
  notificationPanel: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  notificationTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary.brown,
  },
  notificationList: {
    maxHeight: 400,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary.brown,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.neutral.textLight,
    marginTop: 4,
  },
  reminderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    gap: 12,
  },
  reminderIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF5E6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reminderContent: {
    flex: 1,
  },
  reminderTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primary.brown,
    marginBottom: 4,
  },
  reminderTime: {
    fontSize: 13,
    color: Colors.neutral.textLight,
  },
});
