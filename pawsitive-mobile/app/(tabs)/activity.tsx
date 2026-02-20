import React, { useState, useEffect, useRef } from 'react';
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
  registerForPushNotificationsAsync, 
  scheduleReminderNotification,
  cancelNotification,
} from '@/utils/notifications';
import ReminderModal, { REMINDER_TYPES } from '@/components/ReminderModal';
import { useLocalSearchParams } from 'expo-router';

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

type ReminderType = 'feeding' | 'walking' | 'medication' | 'grooming' | 'checkup' | 'custom';

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
  
  // Initialize with selected date from params if available
  const initialDate = params.selectedDate 
    ? new Date(params.selectedDate as string) 
    : new Date();
  
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [weekStart, setWeekStart] = useState(getWeekStart(initialDate));
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  
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
  }, [activePet, selectedDate]);

  // Request notification permissions on mount
  useEffect(() => {
    registerForPushNotificationsAsync();
  }, []);

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

  return (
    <View style={styles.container}>
      {/* Week Navigation */}
      <View style={styles.weekHeader}>
        <TouchableOpacity onPress={() => changeWeek(-1)} style={styles.navButton}>
          <Ionicons name="chevron-back" size={24} color={Colors.primary.brown} />
        </TouchableOpacity>
        <View style={styles.monthContainer}>
          <TouchableOpacity onPress={goToToday}>
            <Text style={styles.monthText}>
              {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={goToToday} style={styles.todayButton}>
            <Ionicons name="today" size={16} color={Colors.primary.orange} />
            <Text style={styles.todayButtonText}>Today</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={() => changeWeek(1)} style={styles.navButton}>
          <Ionicons name="chevron-forward" size={24} color={Colors.primary.brown} />
        </TouchableOpacity>
      </View>

      {/* Weekly Calendar Strip */}
      <Animated.View 
        style={[styles.calendarStrip, { transform: [{ translateX: pan }] }]}
        {...panResponder.panHandlers}
      >
        {getWeekDays(weekStart).map((date, index) => {
          const dayLetter = ['S','M','T','W','T','F','S'][date.getDay()];
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
              activeOpacity={0.7}
            >
              <Text style={[
                styles.dayText,
                (isTodayDate || isSelectedDate) && styles.activeText,
                isPast && styles.pastText,
              ]}>
                {dayLetter}
              </Text>
              <Text style={[
                styles.dateText,
                (isTodayDate || isSelectedDate) && styles.activeText,
                isPast && styles.pastText,
              ]}>
                {dayNumber}
              </Text>
            </TouchableOpacity>
          );
        })}
      </Animated.View>

      {/* Selected Date Info */}
      <View style={styles.selectedDateHeader}>
        <Text style={styles.selectedDateText}>
          {selectedDate.toLocaleDateString('en-US', { 
            weekday: 'long', 
            month: 'long', 
            day: 'numeric' 
          })}
        </Text>
        {!isPastDate(selectedDate) && (
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => {
              resetForm(); // Reset form before opening modal for new reminder
              setModalVisible(true);
            }}
          >
            <Ionicons name="add-circle" size={32} color={Colors.primary.orangeDark} />
          </TouchableOpacity>
        )}
      </View>

      {/* Reminders List */}
      <ScrollView style={styles.remindersList} showsVerticalScrollIndicator={false}>
        {reminders.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color={Colors.neutral.textLight} />
            <Text style={styles.emptyText}>No reminders for this day</Text>
            <Text style={styles.emptySubtext}>Tap + to create one</Text>
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
                    <View key={reminder.id} style={styles.reminderCard}>
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
                        <View style={[styles.reminderIcon]}>
                          <Ionicons 
                            name={getIconForType(reminder.type) as any} 
                            size={20} 
                            color='#FFF'
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

            {/* Completed Reminders */}
            {reminders.filter(r => r.is_completed).length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Completed</Text>
                {reminders
                  .filter(r => r.is_completed)
                  .map((reminder) => (
                    <View key={reminder.id} style={styles.reminderCard}>
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
                        <View style={[styles.reminderIcon, styles.inactiveIcon]}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.neutral.background, padding: 16 },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  navButton: { padding: 8 },
  monthContainer: { alignItems: 'center', flex: 1 },
  monthText: { fontSize: 18, fontWeight: '600', color: Colors.primary.brown, textAlign: 'center' },
  todayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  todayButtonText: { fontSize: 12, color: Colors.primary.orange, fontWeight: '500' },
  calendarStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingVertical: 10,
  },
  dayItem: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    flex: 1,
    marginHorizontal: 3,
  },
  todayItem: {
    backgroundColor: Colors.primary.brown,
  },
  selectedItem: {
    backgroundColor: Colors.primary.orangeDark,
  },
  pastItem: {
    opacity: 0.4,
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
  selectedDateHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  selectedDateText: { fontSize: 16, fontWeight: '600', color: Colors.primary.brown },
  addButton: { padding: 4 },
  remindersList: { flex: 1 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary.brown,
    marginTop: 8,
    marginBottom: 12,
  },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, color: Colors.neutral.textLight, marginTop: 12 },
  emptySubtext: { fontSize: 14, color: Colors.neutral.textLight, marginTop: 4 },
  reminderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
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
    borderRadius: 20,
    backgroundColor: Colors.primary.orange,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  inactiveIcon: { backgroundColor: Colors.neutral.border },
  reminderInfo: { flex: 1 },
  reminderTitle: { fontSize: 16, fontWeight: '600', color: Colors.primary.brown, marginBottom: 4 },
  inactiveText: { color: Colors.neutral.textLight, textDecorationLine: 'line-through' },
  reminderTime: { fontSize: 14, color: Colors.neutral.textLight },
  deleteButton: {
    padding: 8,
  },
});