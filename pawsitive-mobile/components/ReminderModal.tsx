import React from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors } from '@/constants/Colors';

type ReminderType = 'feeding' | 'walking' | 'medication' | 'grooming' | 'checkup' | 'custom';

export const REMINDER_TYPES = [
  { value: 'feeding', label: 'Feeding', icon: 'restaurant' },
  { value: 'walking', label: 'Walk', icon: 'walk' },
  { value: 'medication', label: 'Medicine', icon: 'medical' },
  { value: 'grooming', label: 'Groom', icon: 'cut' },
  { value: 'checkup', label: 'Vet', icon: 'medkit' },
  { value: 'custom', label: 'Custom', icon: 'add-circle' },
];

export const RECURRENCE_OPTIONS = [
  { value: 'once', label: 'Once' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

interface ReminderModalProps {
  visible: boolean;
  editingId: string | null;
  reminderType: ReminderType;
  title: string;
  time: Date;
  recurrence: string;
  endDate: Date | null;
  showTimePicker: boolean;
  showEndDatePicker: boolean;
  onClose: () => void;
  onTypeChange: (type: ReminderType) => void;
  onTitleChange: (text: string) => void;
  onTimeChange: (time: Date) => void;
  onRecurrenceChange: (value: string) => void;
  onEndDateChange: (date: Date | null) => void;
  onShowTimePicker: (show: boolean) => void;
  onShowEndDatePicker: (show: boolean) => void;
  onSubmit: () => void;
}

export default function ReminderModal({
  visible,
  editingId,
  reminderType,
  title,
  time,
  recurrence,
  endDate,
  showTimePicker,
  showEndDatePicker,
  onClose,
  onTypeChange,
  onTitleChange,
  onTimeChange,
  onRecurrenceChange,
  onEndDateChange,
  onShowTimePicker,
  onShowEndDatePicker,
  onSubmit,
}: ReminderModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingId ? 'Edit Reminder' : 'New Reminder'}
            </Text>
            <TouchableOpacity onPress={onClose}>
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
                  onPress={() => onTypeChange(type.value as ReminderType)}
                >
                  <Ionicons
                    name={type.icon as any}
                    size={20}
                    color={reminderType === type.value ? '#FFF' : Colors.primary.brown}
                  />
                  <Text
                    style={[
                      styles.typeButtonText,
                      reminderType === type.value && styles.typeButtonTextSelected,
                    ]}
                  >
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
                reminderType !== 'custom' && styles.inputDisabled,
              ]}
              value={title}
              onChangeText={onTitleChange}
              placeholder={
                reminderType === 'custom'
                  ? 'Enter custom title'
                  : 'Auto-filled from type'
              }
              placeholderTextColor={Colors.neutral.textLight}
              editable={reminderType === 'custom'}
            />

            {/* Time */}
            <Text style={styles.label}>Time</Text>
            <TouchableOpacity
              style={styles.timeButton}
              onPress={() => onShowTimePicker(true)}
            >
              <Ionicons name="time-outline" size={20} color={Colors.primary.brown} />
              <Text style={styles.timeButtonText}>
                {time.toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                })}
              </Text>
            </TouchableOpacity>

            {showTimePicker && (
              <View style={styles.timePickerContainer}>
                <DateTimePicker
                  value={time}
                  mode="time"
                  display="spinner"
                  textColor="#000000"
                  onChange={(_event: any, selectedTime?: Date) => {
                    if (Platform.OS === 'android') {
                      onShowTimePicker(false);
                    }
                    if (selectedTime) {
                      onTimeChange(selectedTime);
                    }
                  }}
                />
                {Platform.OS === 'ios' && (
                  <TouchableOpacity
                    style={styles.doneButton}
                    onPress={() => onShowTimePicker(false)}
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
                  onPress={() => onRecurrenceChange(option.value)}
                >
                  <Text
                    style={[
                      styles.recurrenceButtonText,
                      recurrence === option.value &&
                        styles.recurrenceButtonTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* End Date (only show for recurring reminders) */}
            {recurrence !== 'once' && (
              <>
                <Text style={[styles.label, { marginTop: 20 }]}>Ends</Text>
                <TouchableOpacity
                  style={styles.endDateButton}
                  onPress={() => onShowEndDatePicker(true)}
                >
                  <View style={styles.endDateContent}>
                    <Ionicons
                      name="calendar-outline"
                      size={20}
                      color={Colors.primary.brown}
                    />
                    <Text style={styles.endDateText}>
                      {endDate
                        ? endDate.toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : 'Never'}
                    </Text>
                  </View>
                  {endDate && (
                    <TouchableOpacity
                      onPress={() => onEndDateChange(null)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons
                        name="close-circle"
                        size={20}
                        color={Colors.neutral.textLight}
                      />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>

                {showEndDatePicker && (
                  <View style={styles.timePickerContainer}>
                    <DateTimePicker
                      value={endDate || new Date()}
                      mode="date"
                      display="spinner"
                      textColor="#000000"
                      minimumDate={new Date()}
                      onChange={(_event: any, selectedDate?: Date) => {
                        if (Platform.OS === 'android') {
                          onShowEndDatePicker(false);
                        }
                        if (selectedDate) {
                          onEndDateChange(selectedDate);
                        }
                      }}
                    />
                    {Platform.OS === 'ios' && (
                      <TouchableOpacity
                        style={styles.doneButton}
                        onPress={() => onShowEndDatePicker(false)}
                      >
                        <Text style={styles.doneButtonText}>Done</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </>
            )}

            {/* Create Button */}
            <TouchableOpacity style={styles.createButton} onPress={onSubmit}>
              <Text style={styles.createButtonText}>
                {editingId ? 'Update Reminder' : 'Create Reminder'}
              </Text>
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.primary.brown,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary.brown,
    marginBottom: 8,
    marginTop: 16,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    width: '31%',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.neutral.background,
    borderWidth: 1,
    borderColor: Colors.neutral.border,
    alignItems: 'center',
    gap: 4,
  },
  typeButtonSelected: {
    backgroundColor: Colors.primary.orangeDark,
    borderColor: Colors.primary.orangeDark,
  },
  typeButtonText: {
    fontSize: 12,
    color: Colors.primary.brown,
  },
  typeButtonTextSelected: {
    color: '#FFF',
    fontWeight: '600',
  },
  input: {
    backgroundColor: Colors.neutral.background,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.neutral.border,
    color: Colors.primary.brown,
  },
  inputDisabled: {
    opacity: 0.6,
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
    flex: 1,
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
  recurrenceButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  recurrenceButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.neutral.background,
    borderWidth: 1,
    borderColor: Colors.neutral.border,
    alignItems: 'center',
  },
  recurrenceButtonSelected: {
    backgroundColor: Colors.primary.orangeDark,
    borderColor: Colors.primary.orangeDark,
  },
  recurrenceButtonText: {
    fontSize: 14,
    color: Colors.primary.brown,
  },
  recurrenceButtonTextSelected: {
    color: '#FFF',
    fontWeight: '600',
  },
  endDateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.neutral.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.neutral.border,
  },
  endDateContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  endDateText: {
    fontSize: 16,
    color: Colors.primary.brown,
    fontWeight: '500',
  },
  createButton: {
    backgroundColor: Colors.primary.orange,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
});
