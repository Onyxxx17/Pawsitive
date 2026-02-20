import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import * as Calendar from 'expo-calendar';
import { supabase } from '@/lib/supabase';
import {
  getUserCalendars,
  getCalendarEvents,
  requestCalendarPermissions,
} from '@/utils/calendarUtils';

interface CalendarImportModalProps {
  visible: boolean;
  onClose: () => void;
  onImportComplete: (eventCount: number) => void;
}

interface CalendarWithSelection extends Calendar.Calendar {
  isSelected: boolean;
}

export default function CalendarImportModal({
  visible,
  onClose,
  onImportComplete,
}: CalendarImportModalProps) {
  const [calendars, setCalendars] = useState<CalendarWithSelection[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (visible) {
      loadCalendars();
    }
  }, [visible]);

  const loadCalendars = async () => {
    setLoading(true);
    try {
      const hasPermission = await requestCalendarPermissions();
      if (!hasPermission) {
        onClose();
        return;
      }

      const userCalendars = await getUserCalendars();
      const calendarsWithSelection = userCalendars.map(cal => ({
        ...cal,
        isSelected: false,
      }));
      
      setCalendars(calendarsWithSelection);
    } catch (error) {
      console.error('Error loading calendars:', error);
      Alert.alert('Error', 'Failed to load calendars');
    } finally {
      setLoading(false);
    }
  };

  const toggleCalendar = (calendarId: string) => {
    setCalendars(prev => prev.map(cal => 
      cal.id === calendarId 
        ? { ...cal, isSelected: !cal.isSelected }
        : cal
    ));
  };

  const handleImport = async () => {
    const selectedCalendars = calendars.filter(cal => cal.isSelected);
    
    if (selectedCalendars.length === 0) {
      Alert.alert('No Calendars Selected', 'Please select at least one calendar to import events from');
      return;
    }

    setImporting(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'You must be logged in to import calendar events');
        setImporting(false);
        return;
      }

      // Get events from selected calendars for the next 60 days
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 60);

      const calendarIds = selectedCalendars.map(cal => cal.id);
      const events = await getCalendarEvents(calendarIds, startDate, endDate);
      
      console.log('📅 Found', events.length, 'events to import');
      
      let successCount = 0;
      let errorCount = 0;

      // Import each event to database
      for (const event of events) {
        try {
          // Store timestamps in local timezone by using the Date object directly
          // The database will store it correctly with TIMESTAMPTZ
          const { error } = await supabase
            .from('calendar_events')
            .upsert({
              user_id: user.id,
              external_calendar_id: event.calendarId,
              external_event_id: event.id,
              title: event.title,
              description: event.notes || null,
              start_time: event.startDate.toISOString(), // This preserves the timezone offset
              end_time: event.endDate.toISOString(),
              location: event.location || null,
              is_all_day: event.allDay,
              has_notification: false,
              last_synced_at: new Date().toISOString(),
            }, {
              onConflict: 'user_id,external_event_id',
            });

          if (error) {
            console.error('Error importing event:', event.title, error);
            errorCount++;
          } else {
            successCount++;
          }
        } catch (err) {
          console.error('Exception importing event:', err);
          errorCount++;
        }
      }

      console.log(`✅ Import complete: ${successCount} succeeded, ${errorCount} failed`);
      
      // Pass event count back to parent
      onImportComplete(successCount);
      onClose();
      
      Alert.alert(
        'Import Successful! 🎉',
        `Imported ${successCount} event${successCount !== 1 ? 's' : ''} from your calendar.\n\nYou can now view and manage them in the Activity tab.${errorCount > 0 ? `\n\n${errorCount} event(s) failed to import.` : ''}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error importing events:', error);
      Alert.alert('Import Failed', 'Failed to import calendar events. Please try again.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color={Colors.neutral.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Import Calendar</Text>
          <View style={styles.placeholder} />
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary.brown} />
            <Text style={styles.loadingText}>Loading calendars...</Text>
          </View>
        ) : (
          <>
            <ScrollView style={styles.content}>
              <Text style={styles.subtitle}>
                Select which calendars to import events from. Events will be viewable in your Activity calendar.
              </Text>

              {calendars.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="calendar-outline" size={64} color={Colors.neutral.textLight} />
                  <Text style={styles.emptyText}>No calendars found</Text>
                  <Text style={styles.emptySubtext}>Make sure you have calendars set up on your device</Text>
                </View>
              ) : (
                calendars.map(calendar => (
                  <TouchableOpacity
                    key={calendar.id}
                    style={styles.calendarItem}
                    onPress={() => toggleCalendar(calendar.id)}
                  >
                    <View style={styles.calendarInfo}>
                      <View style={[styles.calendarColor, { backgroundColor: calendar.color }]} />
                      <View style={styles.calendarDetails}>
                        <Text style={styles.calendarName}>{calendar.title}</Text>
                        <Text style={styles.calendarSource}>{calendar.source.name}</Text>
                      </View>
                    </View>
                    <Switch
                      value={calendar.isSelected}
                      onValueChange={() => toggleCalendar(calendar.id)}
                      trackColor={{ 
                        false: Colors.neutral.border, 
                        true: Colors.primary.brown + '40' 
                      }}
                      thumbColor={calendar.isSelected ? Colors.primary.brown : Colors.neutral.text}
                    />
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            {/* Import Button */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={[
                  styles.importButton,
                  { opacity: calendars.some(cal => cal.isSelected) && !importing ? 1 : 0.5 }
                ]}
                onPress={handleImport}
                disabled={!calendars.some(cal => cal.isSelected) || importing}
              >
                {importing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="download" size={20} color="#fff" />
                    <Text style={styles.importButtonText}>
                      Import Events
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              
              <Text style={styles.helpText}>
                💡 Events will be imported without notifications. You can enable notifications for specific events later.
              </Text>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral.border,
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.neutral.text,
  },
  placeholder: {
    width: 44,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.neutral.textLight,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.neutral.textLight,
    marginBottom: 24,
    lineHeight: 22,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.neutral.textLight,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.neutral.textLight,
    marginTop: 8,
    textAlign: 'center',
  },
  calendarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  calendarInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  calendarColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  calendarDetails: {
    flex: 1,
  },
  calendarName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.neutral.text,
    marginBottom: 2,
  },
  calendarSource: {
    fontSize: 14,
    color: Colors.neutral.textLight,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral.border,
  },
  importButton: {
    backgroundColor: Colors.primary.brown,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  importButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  helpText: {
    fontSize: 12,
    color: Colors.neutral.textLight,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 18,
  },
});
