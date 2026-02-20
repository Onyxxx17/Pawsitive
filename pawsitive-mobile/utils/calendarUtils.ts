import * as Calendar from 'expo-calendar';
import { Platform, Alert } from 'react-native';

export interface CalendarEvent {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  notes?: string;
  location?: string;
  allDay: boolean;
  calendarId: string;
  externalId?: string;
  hasNotification?: boolean;
}

/**
 * Request calendar permissions for iOS and Android
 */
export async function requestCalendarPermissions(): Promise<boolean> {
  try {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert(
        'Calendar Access Required',
        'Please enable calendar access in Settings to view and manage your events.',
        [{ text: 'OK' }]
      );
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error requesting calendar permissions:', error);
    return false;
  }
}

/**
 * Get all available calendars on the device
 */
export async function getUserCalendars(): Promise<Calendar.Calendar[]> {
  try {
    const hasPermission = await requestCalendarPermissions();
    if (!hasPermission) return [];

    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    console.log('📅 Found', calendars.length, 'calendars');
    
    return calendars;
  } catch (error) {
    console.error('Error fetching calendars:', error);
    return [];
  }
}

/**
 * Get events from specific calendars within a date range
 */
export async function getCalendarEvents(
  calendarIds: string[],
  startDate: Date,
  endDate: Date
): Promise<CalendarEvent[]> {
  try {
    const events = await Calendar.getEventsAsync(calendarIds, startDate, endDate);
    
    return events.map(event => {
      // Preserve the original timezone by creating Date objects directly from the timestamp
      const eventStartDate = new Date(event.startDate);
      const eventEndDate = new Date(event.endDate);
      
      console.log('📅 Event:', event.title, '| Start:', eventStartDate.toLocaleString(), '| End:', eventEndDate.toLocaleString());
      
      return {
        id: event.id,
        title: event.title,
        startDate: eventStartDate,
        endDate: eventEndDate,
        notes: event.notes || undefined,
        location: event.location || undefined,
        allDay: event.allDay || false,
        calendarId: event.calendarId,
        externalId: event.id,
        hasNotification: false, // Will be set from our database
      };
    });
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    return [];
  }
}

/**
 * Create a new event in the user's calendar
 */
export async function createCalendarEvent(
  calendarId: string,
  eventDetails: {
    title: string;
    startDate: Date;
    endDate: Date;
    notes?: string;
    location?: string;
    allDay?: boolean;
  }
): Promise<string | null> {
  try {
    const eventId = await Calendar.createEventAsync(calendarId, {
      title: eventDetails.title,
      startDate: eventDetails.startDate,
      endDate: eventDetails.endDate,
      notes: eventDetails.notes,
      location: eventDetails.location,
      allDay: eventDetails.allDay || false,
      // Don't specify timeZone to use device's local timezone
    });
    
    console.log('✅ Created calendar event:', eventId);
    return eventId;
  } catch (error) {
    console.error('Error creating calendar event:', error);
    return null;
  }
}

/**
 * Update an existing calendar event
 */
export async function updateCalendarEvent(
  eventId: string,
  eventDetails: {
    title?: string;
    startDate?: Date;
    endDate?: Date;
    notes?: string;
    location?: string;
    allDay?: boolean;
  }
): Promise<boolean> {
  try {
    await Calendar.updateEventAsync(eventId, eventDetails);
    console.log('✅ Updated calendar event:', eventId);
    return true;
  } catch (error) {
    console.error('Error updating calendar event:', error);
    return false;
  }
}

/**
 * Delete a calendar event
 */
export async function deleteCalendarEvent(eventId: string): Promise<boolean> {
  try {
    await Calendar.deleteEventAsync(eventId);
    console.log('✅ Deleted calendar event:', eventId);
    return true;
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    return false;
  }
}

/**
 * Get the default calendar for creating events
 */
export async function getDefaultCalendar(): Promise<string | null> {
  try {
    const calendars = await getUserCalendars();
    
    // Try to find the default calendar
    const defaultCal = calendars.find(cal => cal.isPrimary) || 
                       calendars.find(cal => cal.allowsModifications) ||
                       calendars[0];
    
    return defaultCal?.id || null;
  } catch (error) {
    console.error('Error getting default calendar:', error);
    return null;
  }
}
