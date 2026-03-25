import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Alert,
  Animated,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { usePet } from '../../context/PetContext';
import { 
  rehydrateWebReminderNotifications,
  registerForPushNotificationsAsync, 
  scheduleReminderNotification,
  cancelNotification,
} from '@/utils/notifications';
import { Platform } from 'react-native';
import ReminderModal, { REMINDER_TYPES } from '@/components/ReminderModal';
import CalendarImportModal from '@/components/CalendarImportModal';
import CalendarEventCard from '@/components/CalendarEventCard';
import { useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';

type Reminder = {
  id: string;
  title: string;
  type: string;
  next_trigger_at: string;
  is_active: boolean;
  is_completed?: boolean;
  recurrence_type?: 'once' | 'daily' | 'weekly' | 'monthly';
  recurrence_end_date?: string | null;
  notification_id?: string;
};

type CalendarEvent = {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  description?: string;
  location?: string;
  is_all_day: boolean;
  has_notification: boolean;
  external_event_id: string;
};

type ReminderType = 'feeding' | 'walking' | 'medication' | 'grooming' | 'checkup' | 'custom';

const REMINDER_ACCENTS: Record<string, { bg: string; soft: string; tint: string }> = {
  feeding: { bg: '#FFE5D0', soft: '#FFF7F0', tint: '#C8702F' },
  walking: { bg: '#DDF5F0', soft: '#F5FCFA', tint: '#237A6B' },
  medication: { bg: '#EFE6FF', soft: '#FAF7FF', tint: '#7B55B7' },
  grooming: { bg: '#E5F1FF', soft: '#F7FBFF', tint: '#3877B7' },
  checkup: { bg: '#E7F0FF', soft: '#F5F9FF', tint: '#3569B1' },
  custom: { bg: '#FFF1DC', soft: '#FFFBF5', tint: '#A96B25' },
};

// Helper function to get the start of the week (Sunday)
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.setDate(diff));
}

// Get array of 7 days starting from weekStart
function getWeekDays(weekStart: Date): Date[] {
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + i);
    days.push(day);
  }
  return days;
}

export default function ActivityScreen() {
  const { activePet } = usePet();
  const params = useLocalSearchParams();
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekStart, setWeekStart] = useState(getWeekStart(new Date()));
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [importModalVisible, setImportModalVisible] = useState(false);
  
  // Handle navigation with date parameter
  useFocusEffect(
    React.useCallback(() => {
      if (params.selectedDate && params.timestamp) {
        // Only update if we have both selectedDate and timestamp (coming from home screen)
        const newDate = new Date(params.selectedDate as string);
        setSelectedDate(newDate);
        setWeekStart(getWeekStart(newDate));
      }
    }, [params.selectedDate, params.timestamp])
  );
  
  // Form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [reminderType, setReminderType] = useState<ReminderType>('feeding');
  const [time, setTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [recurrence, setRecurrence] = useState('once');
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  // Swipe gesture
  const pan = useRef(new Animated.Value(0)).current;
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        pan.setValue(gestureState.dx);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > 50) {
          // Swipe right - previous week
          changeWeek(-1);
        } else if (gestureState.dx < -50) {
          // Swipe left - next week
          changeWeek(1);
        }
        Animated.spring(pan, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  useEffect(() => {
    if (activePet?.id && activePet.id !== 'default') {
      fetchReminders();
    }
    fetchCalendarEvents(); // Always fetch calendar events regardless of pet selection
  }, [activePet, selectedDate]);

  // Request notification permissions on mount
  useEffect(() => {
    registerForPushNotificationsAsync();
  }, []);

  useEffect(() => {
    const rehydrateWebSchedules = async () => {
      if (Platform.OS !== 'web') return;
      if (!activePet?.id || activePet.id === 'default') return;

      const { data, error } = await supabase
        .from('reminders')
        .select('id, title, type, next_trigger_at, recurrence_type, recurrence_end_date, notification_id, is_active, is_completed')
        .eq('pet_id', activePet.id)
        .eq('is_active', true);

      if (error) {
        console.error('❌ Failed to fetch reminders for web rehydration:', error);
        return;
      }

      await rehydrateWebReminderNotifications(data || [], activePet?.name);
    };

    rehydrateWebSchedules();
  }, [activePet?.id, activePet?.name]);

  const changeWeek = (direction: number) => {
    const newWeekStart = new Date(weekStart);
    newWeekStart.setDate(weekStart.getDate() + (direction * 7));
    setWeekStart(newWeekStart);
    
    // Update selected date to first day of new week
    const newSelectedDate = new Date(newWeekStart);
    setSelectedDate(newSelectedDate);
  };

  const goToToday = () => {
    const today = new Date();
    setSelectedDate(today);
    setWeekStart(getWeekStart(today));
  };

  const fetchReminders = async () => {
    if (!activePet?.id || activePet.id === 'default') return;

    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('pet_id', activePet.id)
      .eq('is_active', true)
      .order('next_trigger_at', { ascending: true });

    if (!error && data) {
      // Filter reminders to show on selected date
      const filteredReminders = data.filter(reminder => {
        const triggerDate = new Date(reminder.next_trigger_at);
        const recurrenceType = reminder.recurrence_type;

        // Check if past end date for recurring reminders
        if (recurrenceType && recurrenceType !== 'once' && reminder.recurrence_end_date) {
          const endDate = new Date(reminder.recurrence_end_date);
          endDate.setHours(23, 59, 59, 999);
          if (selectedDate > endDate) {
            return false; // Don't show if past end date
          }
        }

        // One-time reminders: only show if on selected date
        if (!recurrenceType || recurrenceType === 'once') {
          return triggerDate >= startOfDay && triggerDate <= endOfDay;
        }

        // Daily reminders: show on all days from trigger date to end date (or forever)
        if (recurrenceType === 'daily') {
          return triggerDate <= endOfDay; // Show if started
        }

        // Weekly reminders: show if same day of week
        if (recurrenceType === 'weekly') {
          const isSameDay = triggerDate.getDay() === selectedDate.getDay();
          const hasStarted = triggerDate <= endOfDay;
          return isSameDay && hasStarted;
        }

        // Monthly reminders: show if same date of month
        if (recurrenceType === 'monthly') {
          const isSameDate = triggerDate.getDate() === selectedDate.getDate();
          const hasStarted = triggerDate <= endOfDay;
          return isSameDate && hasStarted;
        }

        return false;
      });

      setReminders(filteredReminders);
    }
  };

  const fetchCalendarEvents = async () => {
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    console.log('📅 Fetching calendar events for:', selectedDate.toLocaleDateString());
    console.log('📅 Date range:', startOfDay.toISOString(), 'to', endOfDay.toISOString());

    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', user.id)
      .gte('start_time', startOfDay.toISOString())  // Event starts on or after start of day
      .lte('start_time', endOfDay.toISOString())   // Event starts on or before end of day
      .order('start_time', { ascending: true });

    if (!error && data) {
      console.log('✅ Found', data.length, 'calendar events');
      if (data.length > 0) {
        console.log('📋 Events:', data.map(e => ({ title: e.title, start: e.start_time })));
      }
      setCalendarEvents(data);
    } else if (error) {
      console.error('❌ Error fetching calendar events:', error);
    }
  };

  const handleImportComplete = async (eventCount: number) => {
    // Sync calendar events to database
    await syncCalendarEvents();
    fetchCalendarEvents();
  };

  const syncCalendarEvents = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get events from device calendars for next 60 days
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 60);

      // This would need calendar IDs - for now we'll just refresh from DB
      fetchCalendarEvents();
    } catch (error) {
      console.error('Error syncing calendar events:', error);
    }
  };

  const handleToggleEventNotification = async (eventId: string, enabled: boolean) => {
    const { error } = await supabase
      .from('calendar_events')
      .update({ has_notification: enabled })
      .eq('id', eventId);

    if (!error) {
      fetchCalendarEvents();
      // TODO: Schedule/cancel notification based on enabled flag
    } else {
      throw error;
    }
  };

  const handleEditEvent = (eventId: string) => {
    Alert.alert('Edit Event', 'Event editing coming soon!');
    // TODO: Implement event editing
  };

  const handleDeleteEvent = async (eventId: string) => {
    const { error } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', eventId);

    if (!error) {
      fetchCalendarEvents();
      Alert.alert('Success', 'Event deleted');
    } else {
      Alert.alert('Error', 'Failed to delete event');
    }
  };

  const handleCreateReminder = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }

    if (!activePet?.id || activePet.id === 'default') {
      Alert.alert('Error', 'Please select a pet first');
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Combine selected date with selected time
    const reminderDateTime = new Date(selectedDate);
    reminderDateTime.setHours(time.getHours(), time.getMinutes(), 0, 0);

    // Check if reminder is in the past
    const now = new Date();
    if (reminderDateTime <= now) {
      Alert.alert(
        'Invalid Time', 
        'Cannot create reminders for past dates or times. Please select a future time.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Validate end date is after start date for recurring reminders
    if (recurrence !== 'once' && endDate && endDate < selectedDate) {
      Alert.alert(
        'Invalid End Date',
        'End date must be after the start date.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (editingId) {
      // Update existing reminder
      // First, get the existing reminder to cancel its notification
      const existingReminder = reminders.find(r => r.id === editingId);
      if (existingReminder?.notification_id) {
        await cancelNotification(existingReminder.notification_id);
      }

      // Schedule new notification with recurrence and pet name
      const notificationId = await scheduleReminderNotification(
        editingId,
        title.trim(),
        reminderDateTime,
        recurrence,
        reminderType,
        activePet?.name
      );

      const { error } = await supabase
        .from('reminders')
        .update({
          title: title.trim(),
          type: reminderType,
          next_trigger_at: reminderDateTime.toISOString(),
          recurrence_type: recurrence,
          recurrence_end_date: endDate ? endDate.toISOString().split('T')[0] : null,
          notification_id: notificationId,
        })
        .eq('id', editingId);

      if (error) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Success', 'Reminder updated!');
        setModalVisible(false);
        resetForm();
        fetchReminders();
      }
    } else {
      // Create new reminder
      const { data, error } = await supabase
        .from('reminders')
        .insert({
          user_id: user.id,
          pet_id: activePet.id,
          title: title.trim(),
          type: reminderType,
          next_trigger_at: reminderDateTime.toISOString(),
          recurrence_type: recurrence,
          recurrence_end_date: endDate ? endDate.toISOString().split('T')[0] : null,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        Alert.alert('Error', error.message);
      } else if (data) {
        // Schedule notification for the new reminder with recurrence and pet name
        const notificationId = await scheduleReminderNotification(
          data.id,
          title.trim(),
          reminderDateTime,
          recurrence,
          reminderType,
          activePet?.name
        );

        // Update reminder with notification ID
        if (notificationId) {
          await supabase
            .from('reminders')
            .update({ notification_id: notificationId })
            .eq('id', data.id);
        }

        Alert.alert('Success', 'Reminder created!');
        setModalVisible(false);
        resetForm();
        fetchReminders();
      }
    }
  };

  const handleToggleReminder = async (id: string, currentCompleted: boolean) => {
    console.log('🔄 Toggling reminder:', id, 'Current completed:', currentCompleted, 'New value:', !currentCompleted);
    const now = new Date();
    const { error } = await supabase
      .from('reminders')
      .update({ 
        is_completed: !currentCompleted,
        completed_at: !currentCompleted ? now.toISOString() : null
      })
      .eq('id', id);

    if (!error) {
      console.log('✅ Reminder toggled successfully');
      fetchReminders();
    } else {
      console.log('❌ Error toggling reminder:', error);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setReminderType('feeding');
    // Set default time to current time rounded to next hour
    const defaultTime = new Date();
    defaultTime.setMinutes(0, 0, 0); // Round to top of current hour
    setTime(defaultTime);
    setRecurrence('once');
    setEndDate(null);
    setShowEndDatePicker(false);
  };

  const handleEditReminder = (reminder: Reminder) => {
    setEditingId(reminder.id);
    setTitle(reminder.title);
    setReminderType(reminder.type as ReminderType);
    
    // Parse the time from the reminder
    const reminderDate = new Date(reminder.next_trigger_at);
    setTime(reminderDate);
    
    setRecurrence(reminder.recurrence_type || 'once');
    
    // Load end date if it exists
    if (reminder.recurrence_end_date) {
      setEndDate(new Date(reminder.recurrence_end_date));
    } else {
      setEndDate(null);
    }
    
    setModalVisible(true);
  };

  const handleDeleteReminder = (id: string, title: string) => {
    const reminder = reminders.find(r => r.id === id);
    const isRecurring = reminder?.recurrence_type && reminder.recurrence_type !== 'once';

    if (isRecurring) {
      // For recurring reminders, ask which occurrences to delete
      Alert.alert(
        'Delete Recurring Reminder',
        `"${title}" is a recurring reminder. What would you like to delete?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'This & Future',
            style: 'destructive',
            onPress: async () => {
              // Set end date to yesterday (stops showing from today onwards)
              const yesterday = new Date(selectedDate);
              yesterday.setDate(yesterday.getDate() - 1);
              
              const { error } = await supabase
                .from('reminders')
                .update({
                  recurrence_end_date: yesterday.toISOString().split('T')[0]
                })
                .eq('id', id);

              if (error) {
                Alert.alert('Error', error.message);
              } else {
                fetchReminders();
              }
            },
          },
          {
            text: 'All Occurrences',
            style: 'destructive',
            onPress: async () => {
              // Cancel notification before deleting
              if (reminder?.notification_id) {
                await cancelNotification(reminder.notification_id);
              }

              const { error } = await supabase
                .from('reminders')
                .delete()
                .eq('id', id);

              if (error) {
                Alert.alert('Error', error.message);
              } else {
                fetchReminders();
              }
            },
          },
        ]
      );
    } else {
      // For one-time reminders, simple delete
      Alert.alert(
        'Delete Reminder',
        `Are you sure you want to delete "${title}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              // Cancel notification before deleting
              if (reminder?.notification_id) {
                await cancelNotification(reminder.notification_id);
              }

              const { error } = await supabase
                .from('reminders')
                .delete()
                .eq('id', id);

              if (error) {
                Alert.alert('Error', error.message);
              } else {
                fetchReminders();
              }
            },
          },
        ]
      );
    }
  };

  const handleTypeChange = (type: ReminderType) => {
    setReminderType(type);
    // Auto-fill title for pre-defined types
    if (type !== 'custom') {
      const selectedType = REMINDER_TYPES.find(t => t.value === type);
      if (selectedType) {
        setTitle(selectedType.label);
      }
    } else {
      // Clear title for custom type so user can type their own
      setTitle('');
    }
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() && 
           date.getMonth() === today.getMonth() && 
           date.getFullYear() === today.getFullYear();
  };

  const isSelected = (date: Date) => {
    return date.getDate() === selectedDate.getDate() &&
           date.getMonth() === selectedDate.getMonth() &&
           date.getFullYear() === selectedDate.getFullYear();
  };

  const isPastDate = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate < today;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const getIconForType = (type: string) => {
    const found = REMINDER_TYPES.find(t => t.value === type);
    return found?.icon || 'notifications';
  };

  const selectedDateLabel = useMemo(
    () =>
      selectedDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      }),
    [selectedDate],
  );

  const selectedMonthLabel = useMemo(
    () => selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    [selectedDate],
  );

  return (
    <View style={styles.container}>
      <View style={styles.plannerHero}>
        <View style={styles.plannerHeroTop}>
          <View style={styles.plannerCopy}>
            <View style={styles.plannerBadge}>
              <Ionicons name="calendar-clear-outline" size={16} color={Colors.primary.brown} />
              <Text style={styles.plannerBadgeText}>Planner</Text>
            </View>
            <Text style={styles.monthText}>{selectedMonthLabel}</Text>
            <Text style={styles.selectedDateText}>{selectedDateLabel}</Text>
          </View>
          <TouchableOpacity onPress={goToToday} style={styles.todayButton}>
            <Ionicons name="today-outline" size={16} color={Colors.primary.brown} />
            <Text style={styles.todayButtonText}>Today</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.weekHeader}>
          <TouchableOpacity onPress={() => changeWeek(-1)} style={styles.navButton}>
            <Ionicons name="chevron-back" size={20} color={Colors.primary.brown} />
          </TouchableOpacity>
          <Text style={styles.weekHint}>Swipe or tap through the week</Text>
          <TouchableOpacity onPress={() => changeWeek(1)} style={styles.navButton}>
            <Ionicons name="chevron-forward" size={20} color={Colors.primary.brown} />
          </TouchableOpacity>
        </View>

        <Animated.View
          style={[styles.calendarStrip, { transform: [{ translateX: pan }] }]}
          {...panResponder.panHandlers}
        >
          {getWeekDays(weekStart).map((date, index) => {
            const dayLetter = ['S', 'M', 'T', 'W', 'T', 'F', 'S'][date.getDay()];
            const dayNumber = date.getDate();
            const isTodayDate = isToday(date);
            const isSelectedDate = isSelected(date);
            const isPast = isPastDate(date);

            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dayItem,
                  isTodayDate && styles.todayItem,
                  isSelectedDate && styles.selectedItem,
                  isPast && styles.pastItem,
                ]}
                onPress={() => setSelectedDate(new Date(date))}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.dayText,
                    (isTodayDate || isSelectedDate) && styles.activeText,
                    isPast && styles.pastText,
                  ]}
                >
                  {dayLetter}
                </Text>
                <Text
                  style={[
                    styles.dateText,
                    (isTodayDate || isSelectedDate) && styles.activeText,
                    isPast && styles.pastText,
                  ]}
                >
                  {dayNumber}
                </Text>
                {isTodayDate && !isSelectedDate ? <View style={styles.todayDot} /> : null}
              </TouchableOpacity>
            );
          })}
        </Animated.View>
      </View>

      <View style={styles.selectedDateHeader}>
        <View>
          <Text style={styles.sectionEyebrow}>Agenda</Text>
          <Text style={styles.selectedDateAgendaText}>{selectedDateLabel}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.importIconButton}
            onPress={() => setImportModalVisible(true)}
          >
            <Ionicons name="download-outline" size={20} color={Colors.primary.brown} />
          </TouchableOpacity>
          {!isPastDate(selectedDate) && (
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => {
                resetForm();
                setModalVisible(true);
              }}
            >
              <Ionicons name="add" size={20} color="#FFF9F2" />
              <Text style={styles.addButtonText}>New</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Reminders List */}
      <ScrollView style={styles.remindersList} showsVerticalScrollIndicator={false}>
        {reminders.length === 0 && calendarEvents.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color={Colors.neutral.textLight} />
            <Text style={styles.emptyText}>No reminders or events for this day</Text>
            <Text style={styles.emptySubtext}>Tap + to create one or import from calendar</Text>
          </View>
        ) : (
          <>
            {/* Upcoming Reminders */}
            {reminders.filter(r => !r.is_completed).length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Upcoming</Text>
                {reminders
                  .filter(r => !r.is_completed)
                  .map((reminder) => (
                    <View
                      key={reminder.id}
                      style={[
                        styles.reminderCard,
                        { backgroundColor: (REMINDER_ACCENTS[reminder.type] || REMINDER_ACCENTS.custom).soft },
                      ]}
                    >
                      <TouchableOpacity
                        onPress={() => handleToggleReminder(reminder.id, reminder.is_completed || false)}
                        style={styles.checkbox}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        activeOpacity={0.6}
                      >
                        <Ionicons
                          name="square-outline"
                          size={20}
                          color={Colors.primary.orangeDark}
                        />
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        onPress={() => handleEditReminder(reminder)}
                        style={styles.reminderContent}
                      >
                        <View
                          style={[
                            styles.reminderIcon,
                            { backgroundColor: (REMINDER_ACCENTS[reminder.type] || REMINDER_ACCENTS.custom).bg },
                          ]}
                        >
                          <Ionicons 
                            name={getIconForType(reminder.type) as any} 
                            size={20} 
                            color={(REMINDER_ACCENTS[reminder.type] || REMINDER_ACCENTS.custom).tint}
                          />
                        </View>
                        
                        <View style={styles.reminderInfo}>
                          <Text style={styles.reminderTitle}>
                            {reminder.title}
                          </Text>
                          <Text style={styles.reminderTime}>
                            {formatTime(reminder.next_trigger_at)}
                            {reminder.recurrence_type && reminder.recurrence_type !== 'once' && ` • ${reminder.recurrence_type}`}
                          </Text>
                        </View>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleDeleteReminder(reminder.id, reminder.title)}
                        style={styles.deleteButton}
                      >
                        <Ionicons name="trash-outline" size={20} color={Colors.neutral.textLight} />
                      </TouchableOpacity>
                    </View>
                  ))}
              </>
            )}

            {/* Calendar Events */}
            {calendarEvents.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Calendar Events</Text>
                {calendarEvents.map((event) => (
                  <CalendarEventCard
                    key={event.id}
                    id={event.id}
                    title={event.title}
                    startTime={new Date(event.start_time)}
                    endTime={new Date(event.end_time)}
                    location={event.location}
                    description={event.description}
                    hasNotification={event.has_notification}
                    isAllDay={event.is_all_day}
                    onToggleNotification={handleToggleEventNotification}
                    onEdit={handleEditEvent}
                    onDelete={handleDeleteEvent}
                  />
                ))}
              </>
            )}

            {/* Completed Reminders */}
            {reminders.filter(r => r.is_completed).length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Completed</Text>
                {reminders
                  .filter(r => r.is_completed)
                  .map((reminder) => (
                    <View
                      key={reminder.id}
                      style={[
                        styles.reminderCard,
                        styles.completedReminderCard,
                        { backgroundColor: (REMINDER_ACCENTS[reminder.type] || REMINDER_ACCENTS.custom).soft },
                      ]}
                    >
                      <TouchableOpacity
                        onPress={() => handleToggleReminder(reminder.id, reminder.is_completed || false)}
                        style={styles.checkbox}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        activeOpacity={0.6}
                      >
                        <Ionicons
                          name="checkbox"
                          size={20}
                          color={Colors.health.excellent}
                        />
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        onPress={() => handleEditReminder(reminder)}
                        style={styles.reminderContent}
                      >
                        <View
                          style={[
                            styles.reminderIcon,
                            styles.inactiveIcon,
                            { backgroundColor: '#EFE7DE' },
                          ]}
                        >
                          <Ionicons 
                            name={getIconForType(reminder.type) as any} 
                            size={20} 
                            color={Colors.neutral.textLight}
                          />
                        </View>
                        
                        <View style={styles.reminderInfo}>
                          <Text style={[styles.reminderTitle, styles.inactiveText]}>
                            {reminder.title}
                          </Text>
                          <Text style={styles.reminderTime}>
                            {formatTime(reminder.next_trigger_at)}
                            {reminder.recurrence_type && reminder.recurrence_type !== 'once' && ` • ${reminder.recurrence_type}`}
                          </Text>
                        </View>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleDeleteReminder(reminder.id, reminder.title)}
                        style={styles.deleteButton}
                      >
                        <Ionicons name="trash-outline" size={20} color={Colors.neutral.textLight} />
                      </TouchableOpacity>
                    </View>
                  ))}
              </>
            )}
          </>
        )}
      </ScrollView>

      {/* Create Reminder Modal */}
      <ReminderModal
        visible={modalVisible}
        editingId={editingId}
        reminderType={reminderType}
        title={title}
        time={time}
        recurrence={recurrence}
        endDate={endDate}
        showTimePicker={showTimePicker}
        showEndDatePicker={showEndDatePicker}
        onClose={() => {
          setModalVisible(false);
          resetForm();
        }}
        onTypeChange={handleTypeChange}
        onTitleChange={setTitle}
        onTimeChange={setTime}
        onRecurrenceChange={setRecurrence}
        onEndDateChange={setEndDate}
        onShowTimePicker={setShowTimePicker}
        onShowEndDatePicker={setShowEndDatePicker}
        onSubmit={handleCreateReminder}
      />

      {/* Calendar Import Modal */}
      <CalendarImportModal
        visible={importModalVisible}
        onClose={() => setImportModalVisible(false)}
        onImportComplete={handleImportComplete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F4ED', padding: 16 },
  plannerHero: {
    backgroundColor: '#F4E8DB',
    borderRadius: 30,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E8D9C8',
    marginBottom: 18,
  },
  plannerHeroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 18,
  },
  plannerCopy: {
    flex: 1,
  },
  plannerBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF8EF',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 12,
  },
  plannerBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary.brown,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  navButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF8EF',
    borderWidth: 1,
    borderColor: '#EADDCF',
  },
  weekHint: {
    fontSize: 13,
    color: Colors.neutral.textLight,
    fontWeight: '600',
  },
  monthText: { fontSize: 26, fontWeight: '800', color: Colors.primary.brown },
  todayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#FFF8EF',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#EADDCF',
  },
  todayButtonText: { fontSize: 13, color: Colors.primary.brown, fontWeight: '700' },
  calendarStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  dayItem: {
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 18,
    backgroundColor: '#FBF6F0',
    flex: 1,
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: '#EAE0D5',
  },
  todayItem: {
    borderColor: '#D9C4AD',
  },
  selectedItem: {
    backgroundColor: Colors.primary.brown,
    borderColor: Colors.primary.brown,
  },
  pastItem: {
    opacity: 0.58,
  },
  dayText: {
    fontSize: 12,
    color: Colors.neutral.textLight,
    marginBottom: 6,
    fontWeight: '500',
  },
  dateText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary.brown,
  },
  activeText: {
    color: '#FFF',
  },
  pastText: {
    color: Colors.neutral.textLight,
  },
  todayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary.orangeDark,
    marginTop: 8,
  },
  selectedDateHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary.orangeDark,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  selectedDateAgendaText: { fontSize: 20, fontWeight: '800', color: Colors.primary.brown },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  importIconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF8EF',
    borderWidth: 1,
    borderColor: '#EADDCF',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary.brown,
    paddingHorizontal: 14,
    height: 42,
    borderRadius: 21,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFF9F2',
  },
  remindersList: { flex: 1 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primary.brown,
    marginTop: 10,
    marginBottom: 12,
  },
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 56,
    backgroundColor: '#FFF8EF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#EADDCF',
  },
  emptyText: { fontSize: 16, color: Colors.neutral.textLight, marginTop: 12 },
  emptySubtext: { fontSize: 14, color: Colors.neutral.textLight, marginTop: 6 },
  reminderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EADDCF',
  },
  completedReminderCard: {
    opacity: 0.88,
  },
  checkbox: {
    marginRight: 10,
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reminderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  reminderIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  inactiveIcon: { backgroundColor: Colors.neutral.border },
  reminderInfo: { flex: 1 },
  reminderTitle: { fontSize: 16, fontWeight: '700', color: Colors.primary.brown, marginBottom: 4 },
  inactiveText: { color: Colors.neutral.textLight, textDecorationLine: 'line-through' },
  reminderTime: { fontSize: 14, color: Colors.neutral.textLight, lineHeight: 20 },
  deleteButton: {
    padding: 8,
  },
});
