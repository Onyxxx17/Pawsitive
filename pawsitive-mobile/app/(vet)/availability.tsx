import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Alert,
  Switch,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { useVet } from '@/context/VetContext';
import DateTimePicker from '@react-native-community/datetimepicker';

type DayAvailability = {
  id?: string;
  day_of_week: number;
  start_time: string; // HH:MM format
  end_time: string;   // HH:MM format
  is_enabled: boolean;
  slot_duration_min: 15 | 30 | 60;
};

const DAYS = [
  { name: 'Sunday', value: 0, short: 'Sun' },
  { name: 'Monday', value: 1, short: 'Mon' },
  { name: 'Tuesday', value: 2, short: 'Tue' },
  { name: 'Wednesday', value: 3, short: 'Wed' },
  { name: 'Thursday', value: 4, short: 'Thu' },
  { name: 'Friday', value: 5, short: 'Fri' },
  { name: 'Saturday', value: 6, short: 'Sat' },
];

const SLOT_DURATIONS = [
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
  { label: '60 min', value: 60 },
] as const;

export default function VetAvailabilityScreen() {
  const { vetId } = useVet();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [availability, setAvailability] = useState<DayAvailability[]>([]);
  const [showTimePicker, setShowTimePicker] = useState<{
    dayIndex: number;
    type: 'start' | 'end';
  } | null>(null);

  useEffect(() => {
    loadAvailability();
  }, []);

  /**
   * Load current vet's availability from Supabase
   * Creates default disabled entries for missing days
   */
  const loadAvailability = async () => {
    try {
      setLoading(true);
      if (!vetId) {
        Alert.alert('Error', 'Vet session not found');
        return;
      }

      const { data, error } = await supabase
        .from('vet_availability')
        .select('*')
        .eq('vet_id', vetId)
        .order('day_of_week', { ascending: true });

      if (error) throw error;

      // Create map of existing availability
      const availMap = new Map<number, any>(
        data?.map(item => [item.day_of_week, item]) || []
      );

      // Initialize all 7 days
      const allDays: DayAvailability[] = DAYS.map(day => {
        const existing = availMap.get(day.value);
        if (existing) {
          return {
            id: existing.id,
            day_of_week: day.value,
            start_time: existing.start_time, // Already in HH:MM format from DB
            end_time: existing.end_time,
            is_enabled: true,
            slot_duration_min: existing.slot_duration_min || 30,
          };
        } else {
          // Default: disabled, 9am-5pm, 30min slots
          return {
            day_of_week: day.value,
            start_time: '09:00',
            end_time: '17:00',
            is_enabled: false,
            slot_duration_min: 30,
          };
        }
      });

      setAvailability(allDays);
    } catch (error: any) {
      console.error('Error loading availability:', error);
      Alert.alert('Error', 'Failed to load availability settings');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Toggle day on/off
   */
  const toggleDay = (dayIndex: number) => {
    setAvailability(prev =>
      prev.map((day, idx) =>
        idx === dayIndex ? { ...day, is_enabled: !day.is_enabled } : day
      )
    );
  };

  /**
   * Update start or end time for a day
   */
  const updateTime = (dayIndex: number, type: 'start' | 'end', date: Date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const timeString = `${hours}:${minutes}`;

    setAvailability(prev =>
      prev.map((day, idx) => {
        if (idx !== dayIndex) return day;
        
        const updated = {
          ...day,
          [type === 'start' ? 'start_time' : 'end_time']: timeString,
        };

        // Validate after update
        if (!validateTimeRange(updated.start_time, updated.end_time)) {
          Alert.alert('Invalid Time', 'End time must be after start time');
          return day; // Return unchanged
        }

        return updated;
      })
    );
  };

  /**
   * Update slot duration for a day
   */
  const updateSlotDuration = (dayIndex: number, duration: 15 | 30 | 60) => {
    setAvailability(prev =>
      prev.map((day, idx) => {
        if (idx !== dayIndex) return day;

        // Validate duration divides time range
        const isValid = validateSlotDuration(day.start_time, day.end_time, duration);
        if (!isValid) {
          Alert.alert(
            'Invalid Duration',
            `${duration}-minute slots don't divide evenly into your time range. Please adjust your hours or choose a different slot length.`
          );
          return day;
        }

        return { ...day, slot_duration_min: duration };
      })
    );
  };

  /**
   * Validate end_time > start_time
   */
  const validateTimeRange = (start: string, end: string): boolean => {
    const [startHour, startMin] = start.split(':').map(Number);
    const [endHour, endMin] = end.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    return endMinutes > startMinutes;
  };

  /**
   * Validate slot duration divides time range evenly
   */
  const validateSlotDuration = (start: string, end: string, slotDuration: number): boolean => {
    const [startHour, startMin] = start.split(':').map(Number);
    const [endHour, endMin] = end.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    const totalMinutes = endMinutes - startMinutes;
    
    return totalMinutes > 0 && totalMinutes % slotDuration === 0;
  };

  /**
   * Calculate number of slots
   */
  const calculateSlotCount = (start: string, end: string, slotDuration: number): number => {
    const [startHour, startMin] = start.split(':').map(Number);
    const [endHour, endMin] = end.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    const totalMinutes = endMinutes - startMinutes;
    
    return Math.floor(totalMinutes / slotDuration);
  };

  /**
   * Save availability to Supabase
   * Uses UPSERT pattern: delete all existing rows, insert enabled days
   */
  const saveAvailability = async () => {
    try {
      setSaving(true);
      if (!vetId) {
        Alert.alert('Error', 'Vet session not found');
        return;
      }

      // Filter enabled days
      const enabledDays = availability.filter(day => day.is_enabled);

      // Validate all enabled days
      for (const day of enabledDays) {
        if (!validateTimeRange(day.start_time, day.end_time)) {
          Alert.alert(
            'Validation Error',
            `${DAYS[day.day_of_week].name}: End time must be after start time`
          );
          setSaving(false);
          return;
        }

        if (!validateSlotDuration(day.start_time, day.end_time, day.slot_duration_min)) {
          Alert.alert(
            'Validation Error',
            `${DAYS[day.day_of_week].name}: ${day.slot_duration_min}-min slots don't divide evenly into time range`
          );
          setSaving(false);
          return;
        }
      }

      // Step 1: Delete all existing availability for this vet
      const { error: deleteError } = await supabase
        .from('vet_availability')
        .delete()
        .eq('vet_id', vetId);

      if (deleteError) throw deleteError;

      // Step 2: Insert enabled days only
      if (enabledDays.length > 0) {
        const insertData = enabledDays.map(day => ({
          vet_id: vetId,
          day_of_week: day.day_of_week,
          start_time: day.start_time,
          end_time: day.end_time,
          slot_duration_min: day.slot_duration_min,
        }));

        const { error: insertError } = await supabase
          .from('vet_availability')
          .insert(insertData);

        if (insertError) throw insertError;
      }

      Alert.alert(
        'Success',
        enabledDays.length === 0
          ? 'All availability cleared. Patients cannot book with you until you set available hours.'
          : `Availability saved! You're available ${enabledDays.length} day${enabledDays.length > 1 ? 's' : ''} per week.`
      );

      // Reload to sync with DB
      loadAvailability();
    } catch (error: any) {
      console.error('Error saving availability:', error);
      Alert.alert('Error', error.message || 'Failed to save availability');
    } finally {
      setSaving(false);
    }
  };

  /**
   * Parse HH:MM string to Date object (for DateTimePicker)
   */
  const parseTimeToDate = (timeString: string): Date => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary.brown} />
        <Text style={styles.loadingText}>Loading availability...</Text>
      </View>
    );
  }

  // Get current week preview
  const getCurrentWeekDates = () => {
    const today = new Date();
    const currentDay = today.getDay(); // 0-6
    const weekDates = [];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - currentDay + i);
      weekDates.push(date);
    }
    
    return weekDates;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const isDateInPast = (dayOfWeek: number): boolean => {
    const today = new Date();
    const currentDayOfWeek = today.getDay();
    return dayOfWeek < currentDayOfWeek;
  };

  const currentWeekDates = getCurrentWeekDates();
  const enabledDaysCount = availability.filter(d => d.is_enabled).length;
  const todayDayOfWeek = new Date().getDay();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Weekly Schedule</Text>
          <Text style={styles.headerSubtitle}>
            {enabledDaysCount > 0 
              ? `${enabledDaysCount} day${enabledDaysCount > 1 ? 's' : ''} per week`
              : 'No days scheduled'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={saveAvailability}
          disabled={saving}
          style={[styles.saveButtonContainer, saving && styles.saveButtonDisabled]}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Ionicons name="checkmark" size={20} color="#FFF" />
              <Text style={styles.saveButtonText}>Save</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoContent}>
            <Ionicons name="information-circle" size={22} color="#007AFF" />
            <Text style={styles.infoText}>
              Set your weekly recurring hours. This schedule repeats every week and patients can enter consultation within these times.
            </Text>
          </View>
        </View>

        {/* Section Title */}
        <Text style={styles.sectionTitle}>Your Weekly Hours</Text>

        {/* Day Cards */}
        {DAYS.map((day, index) => {
          const dayData = availability[index];
          const isExpanded = dayData.is_enabled;
          const slotCount = isExpanded
            ? calculateSlotCount(dayData.start_time, dayData.end_time, dayData.slot_duration_min)
            : 0;
          const isToday = todayDayOfWeek === day.value;
          const isPast = isDateInPast(day.value);

          return (
            <View key={day.value} style={[
              styles.dayCard,
              isToday && styles.dayCardToday,
              isPast && styles.dayCardPast,
            ]}>
              {/* Day Header */}
              <View style={styles.dayHeader}>
                <View style={styles.dayHeaderLeft}>
                  <View style={styles.dayNameRow}>
                    <Text style={[styles.dayName, isPast && styles.dayNamePast]}>
                      {day.name}
                    </Text>
                    {isToday && (
                      <View style={styles.todayBadge}>
                        <Text style={styles.todayBadgeText}>Today</Text>
                      </View>
                    )}
                    {isPast && (
                      <Text style={styles.pastLabel}>(Past)</Text>
                    )}
                  </View>
                  {isExpanded && !isPast && (
                    <Text style={styles.dayTimePreview}>
                      {dayData.start_time} - {dayData.end_time}
                    </Text>
                  )}
                </View>
                <Switch
                  value={dayData.is_enabled}
                  onValueChange={() => {
                    if (!isPast) toggleDay(index);
                  }}
                  disabled={isPast}
                  trackColor={{ false: '#E5E5EA', true: '#007AFF' }}
                  thumbColor="#FFF"
                  ios_backgroundColor="#E5E5EA"
                />
              </View>

              {/* Expanded Content - Only for enabled, non-past days */}
              {isExpanded && !isPast && (
                <View style={styles.expandedContent}>
                  {/* Time Range */}
                  <View style={styles.timeRow}>
                    <View style={styles.timeInputGroup}>
                      <Text style={styles.inputLabel}>START</Text>
                      <TouchableOpacity
                        style={styles.timePickerButton}
                        onPress={() => setShowTimePicker({ dayIndex: index, type: 'start' })}
                      >
                        <Text style={styles.timePickerText}>{dayData.start_time}</Text>
                        <Ionicons name="chevron-down" size={16} color="#8E8E93" />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.timeSeparator}>
                      <Ionicons name="arrow-forward" size={16} color="#C7C7CC" />
                    </View>

                    <View style={styles.timeInputGroup}>
                      <Text style={styles.inputLabel}>END</Text>
                      <TouchableOpacity
                        style={styles.timePickerButton}
                        onPress={() => setShowTimePicker({ dayIndex: index, type: 'end' })}
                      >
                        <Text style={styles.timePickerText}>{dayData.end_time}</Text>
                        <Ionicons name="chevron-down" size={16} color="#8E8E93" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Slot Duration */}
                  <View style={styles.slotDurationSection}>
                    <Text style={styles.slotDurationLabel}>Appointment Length</Text>
                    <View style={styles.slotPills}>
                      {SLOT_DURATIONS.map(slot => (
                        <TouchableOpacity
                          key={slot.value}
                          style={[
                            styles.slotPill,
                            dayData.slot_duration_min === slot.value && styles.slotPillActive,
                          ]}
                          onPress={() => updateSlotDuration(index, slot.value)}
                        >
                          <Text
                            style={[
                              styles.slotPillText,
                              dayData.slot_duration_min === slot.value && styles.slotPillTextActive,
                            ]}
                          >
                            {slot.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Slot Summary */}
                  {slotCount > 0 && (
                    <View style={styles.slotSummary}>
                      <Ionicons name="calendar-outline" size={16} color="#007AFF" />
                      <Text style={styles.slotSummaryText}>
                        {slotCount} appointment slot{slotCount > 1 ? 's' : ''} available
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          );
        })}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Time Picker Modal - iOS */}
      {showTimePicker && Platform.OS === 'ios' && (
        <View style={styles.timePickerModal}>
          <View style={styles.timePickerHeader}>
            <TouchableOpacity onPress={() => setShowTimePicker(null)}>
              <Text style={styles.timePickerCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.timePickerTitle}>
              Select {showTimePicker.type === 'start' ? 'Start' : 'End'} Time
            </Text>
            <TouchableOpacity
              onPress={() => setShowTimePicker(null)}
            >
              <Text style={styles.timePickerDone}>Done</Text>
            </TouchableOpacity>
          </View>
          <DateTimePicker
            value={parseTimeToDate(
              showTimePicker.type === 'start'
                ? availability[showTimePicker.dayIndex].start_time
                : availability[showTimePicker.dayIndex].end_time
            )}
            mode="time"
            is24Hour={false}
            display="spinner"
            onChange={(event, selectedTime) => {
              if (selectedTime) {
                updateTime(showTimePicker.dayIndex, showTimePicker.type, selectedTime);
              }
            }}
            style={styles.timePickerIOS}
          />
        </View>
      )}

      {/* Time Picker - Android */}
      {showTimePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={parseTimeToDate(
            showTimePicker.type === 'start'
              ? availability[showTimePicker.dayIndex].start_time
              : availability[showTimePicker.dayIndex].end_time
          )}
          mode="time"
          is24Hour={false}
          display="default"
          onChange={(event, selectedTime) => {
            setShowTimePicker(null);
            if (event.type === 'set' && selectedTime) {
              updateTime(showTimePicker.dayIndex, showTimePicker.type, selectedTime);
            }
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 12,
    fontWeight: '500',
  },
  
  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#FFF',
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '700',
    color: '#000',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#8E8E93',
    marginTop: 2,
    fontWeight: '400',
  },
  saveButtonContainer: {
    position: 'absolute',
    right: 20,
    top: 65,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  
  // Content
  content: {
    flex: 1,
    paddingTop: 16,
  },
  
  // Info Card
  infoCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 16,
    borderRadius: 12,
  },
  infoContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#3C3C43',
    lineHeight: 20,
    opacity: 0.6,
  },
  
  // Section
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000',
    marginHorizontal: 20,
    marginBottom: 12,
  },
  
  // Day Cards
  dayCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
  },
  dayCardToday: {
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  dayCardPast: {
    opacity: 0.5,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  dayHeaderLeft: {
    flex: 1,
  },
  dayNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  dayName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  dayNamePast: {
    color: '#8E8E93',
  },
  todayBadge: {
    backgroundColor: '#E5F1FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  todayBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#007AFF',
    textTransform: 'uppercase',
  },
  pastLabel: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '400',
  },
  dayTimePreview: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '400',
    marginTop: 2,
  },
  
  // Expanded Content
  expandedContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  
  // Time Pickers
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 12,
  },
  timeInputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timePickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
  },
  timePickerText: {
    fontSize: 17,
    fontWeight: '400',
    color: '#000',
  },
  timeSeparator: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 20,
  },
  
  // Slot Duration
  slotDurationSection: {
    marginTop: 20,
  },
  slotDurationLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  slotPills: {
    flexDirection: 'row',
    gap: 8,
  },
  slotPill: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
  },
  slotPillActive: {
    backgroundColor: '#007AFF',
  },
  slotPillText: {
    fontSize: 15,
    fontWeight: '400',
    color: '#000',
  },
  slotPillTextActive: {
    color: '#FFF',
    fontWeight: '600',
  },
  
  // Slot Summary
  slotSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 6,
  },
  slotSummaryText: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '400',
  },
  
  // Time Picker Modal (iOS)
  timePickerModal: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  timePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  timePickerCancel: {
    fontSize: 17,
    color: '#8E8E93',
    fontWeight: '400',
  },
  timePickerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  timePickerDone: {
    fontSize: 17,
    color: '#007AFF',
    fontWeight: '600',
  },
  timePickerIOS: {
    height: 216,
    backgroundColor: '#FFF',
  },
  
  // Legacy
  saveButton: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2196F3',
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    gap: 12,
  },
  timePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  timeText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary.brown,
    flex: 1,
  },
  slotInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8F9FA',
    padding: 10,
    borderRadius: 8,
  },
  slotInfoText: {
    fontSize: 13,
    color: Colors.neutral.textLight,
    fontWeight: '500',
  },
});
