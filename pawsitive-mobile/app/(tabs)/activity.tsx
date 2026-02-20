import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Platform,
  Animated,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { usePet } from '../../context/PetContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import { 
  registerForPushNotificationsAsync, 
  scheduleReminderNotification,
  cancelNotification,
} from '@/utils/notifications';

type Reminder = {
  id: string;
  title: string;
  type: string;
  next_trigger_at: string;
  is_active: boolean;
  is_completed?: boolean;
  recurrence?: any;
  notification_id?: string;
};

type ReminderType = 'feeding' | 'walking' | 'medication' | 'grooming' | 'checkup' | 'custom';

const REMINDER_TYPES = [
  { value: 'feeding', label: 'Feeding', icon: 'restaurant' },
  { value: 'walking', label: 'Walk', icon: 'walk' },
  { value: 'medication', label: 'Medicine', icon: 'medical' },
  { value: 'grooming', label: 'Groom', icon: 'cut' },
  { value: 'checkup', label: 'Vet', icon: 'medkit' },
  { value: 'custom', label: 'Custom', icon: 'add-circle' },
];

const RECURRENCE_OPTIONS = [
  { value: 'once', label: 'Once' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

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
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekStart, setWeekStart] = useState(getWeekStart(new Date()));
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  
  // Form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [reminderType, setReminderType] = useState<ReminderType>('feeding');
  const [time, setTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [recurrence, setRecurrence] = useState('daily');

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
      .gte('next_trigger_at', startOfDay.toISOString())
      .lte('next_trigger_at', endOfDay.toISOString())
      .order('next_trigger_at', { ascending: true });

    if (!error && data) {
      setReminders(data);
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

    const recurrenceData = recurrence !== 'once' ? { type: recurrence } : null;

    if (editingId) {
      // Update existing reminder
      // First, get the existing reminder to cancel its notification
      const existingReminder = reminders.find(r => r.id === editingId);
      if (existingReminder?.notification_id) {
        await cancelNotification(existingReminder.notification_id);
      }

      // Schedule new notification with pet name
      const notificationId = await scheduleReminderNotification(
        editingId,
        title.trim(),
        reminderDateTime,
        reminderType,
        activePet?.name
      );

      const { error } = await supabase
        .from('reminders')
        .update({
          title: title.trim(),
          type: reminderType,
          next_trigger_at: reminderDateTime.toISOString(),
          recurrence: recurrenceData,
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
          recurrence: recurrenceData,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        Alert.alert('Error', error.message);
      } else if (data) {
        // Schedule notification for the new reminder with pet name
        const notificationId = await scheduleReminderNotification(
          data.id,
          title.trim(),
          reminderDateTime,
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
    setRecurrence('daily');
  };

  const handleEditReminder = (reminder: Reminder) => {
    setEditingId(reminder.id);
    setTitle(reminder.title);
    setReminderType(reminder.type as ReminderType);
    
    // Parse the time from the reminder
    const reminderDate = new Date(reminder.next_trigger_at);
    setTime(reminderDate);
    
    setRecurrence(reminder.recurrence?.type || 'once');
    setModalVisible(true);
  };

  const handleDeleteReminder = (id: string, title: string) => {
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
            const reminder = reminders.find(r => r.id === id);
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
                            {reminder.recurrence && ` • ${reminder.recurrence.type}`}
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
                            {reminder.recurrence && ` • ${reminder.recurrence.type}`}
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
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingId ? 'Edit Reminder' : 'New Reminder'}</Text>
              <TouchableOpacity onPress={() => {
                setModalVisible(false);
                resetForm();
              }}>
                <Ionicons name="close" size={28} color={Colors.primary.brown} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Reminder Type */}
              <Text style={styles.label}>Type</Text>
              <View style={styles.typeGrid}>
                {REMINDER_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.typeButton,
                      reminderType === type.value && styles.typeButtonSelected,
                    ]}
                    onPress={() => handleTypeChange(type.value as ReminderType)}
                  >
                    <Ionicons
                      name={type.icon as any}
                      size={20}
                      color={reminderType === type.value ? '#FFF' : Colors.primary.brown}
                    />
                    <Text style={[
                      styles.typeButtonText,
                      reminderType === type.value && styles.typeButtonTextSelected,
                    ]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Title */}
              <Text style={styles.label}>Title</Text>
              <TextInput
                style={[
                  styles.input,
                  reminderType !== 'custom' && styles.inputDisabled
                ]}
                value={title}
                onChangeText={setTitle}
                placeholder={reminderType === 'custom' ? "Enter custom title" : "Auto-filled from type"}
                placeholderTextColor={Colors.neutral.textLight}
                editable={reminderType === 'custom'}
              />

              {/* Time */}
              <Text style={styles.label}>Time</Text>
              <TouchableOpacity
                style={styles.timeButton}
                onPress={() => setShowTimePicker(true)}
              >
                <Ionicons name="time-outline" size={20} color={Colors.primary.brown} />
                <Text style={styles.timeButtonText}>
                  {time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                </Text>
              </TouchableOpacity>

              {showTimePicker && (
                <View style={styles.timePickerContainer}>
                  <DateTimePicker
                    value={time}
                    mode="time"
                    display="spinner"
                    onChange={(_event: any, selectedTime?: Date) => {
                      if (Platform.OS === 'android') {
                        setShowTimePicker(false);
                      }
                      if (selectedTime) {
                        setTime(selectedTime);
                      }
                    }}
                  />
                  {Platform.OS === 'ios' && (
                    <TouchableOpacity
                      style={styles.doneButton}
                      onPress={() => setShowTimePicker(false)}
                    >
                      <Text style={styles.doneButtonText}>Done</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Repeat */}
              <Text style={styles.label}>Repeat</Text>
              <View style={styles.recurrenceButtons}>
                {RECURRENCE_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.recurrenceButton,
                      recurrence === option.value && styles.recurrenceButtonSelected,
                    ]}
                    onPress={() => setRecurrence(option.value)}
                  >
                    <Text style={[
                      styles.recurrenceButtonText,
                      recurrence === option.value && styles.recurrenceButtonTextSelected,
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Create Button */}
              <TouchableOpacity
                style={styles.createButton}
                onPress={handleCreateReminder}
              >
                <Text style={styles.createButtonText}>
                  {editingId ? 'Update Reminder' : 'Create Reminder'}
                </Text>
              </TouchableOpacity>

              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: Colors.primary.brown },
  label: { fontSize: 14, fontWeight: '600', color: Colors.primary.brown, marginBottom: 8, marginTop: 12 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: Colors.neutral.background,
    borderWidth: 1,
    borderColor: Colors.neutral.border,
    gap: 6,
  },
  typeButtonSelected: { backgroundColor: Colors.primary.orangeDark, borderColor: Colors.primary.orangeDark },
  typeButtonText: { fontSize: 14, color: Colors.primary.brown },
  typeButtonTextSelected: { color: '#FFF', fontWeight: '600' },
  input: {
    backgroundColor: Colors.neutral.background,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: Colors.primary.brown,
    borderWidth: 1,
    borderColor: Colors.neutral.border,
  },
  inputDisabled: {
    backgroundColor: '#F5F5F5',
    color: Colors.neutral.textLight,
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.neutral.background,
    borderRadius: 12,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.neutral.border,
  },
  timeButtonText: { 
    fontSize: 16, 
    color: Colors.primary.brown,
    fontWeight: '500',
  },
  timePickerContainer: {
    backgroundColor: Colors.neutral.background,
    borderRadius: 16,
    padding: 20,
    marginTop: 12,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: Colors.neutral.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  doneButton: {
    backgroundColor: Colors.primary.orangeDark,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 16,
  },
  doneButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  recurrenceButtons: { flexDirection: 'row', gap: 8 },
  recurrenceButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.neutral.background,
    borderWidth: 1,
    borderColor: Colors.neutral.border,
    alignItems: 'center',
  },
  recurrenceButtonSelected: { backgroundColor: Colors.primary.orangeDark, borderColor: Colors.primary.orangeDark },
  recurrenceButtonText: { fontSize: 14, color: Colors.primary.brown },
  recurrenceButtonTextSelected: { color: '#FFF', fontWeight: '600' },
  createButton: { backgroundColor: Colors.primary.orange, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 24 },
  createButtonText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
});