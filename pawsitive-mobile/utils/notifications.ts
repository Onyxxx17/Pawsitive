import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// Configure how notifications should be handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Request notification permissions from the user
 */
export async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Reminders',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#E8A87C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}

/**
 * Schedule a notification for a reminder with recurrence support
 */
export async function scheduleReminderNotification(
  reminderId: string,
  title: string,
  triggerDate: Date,
  recurrenceType: string,
  type: string,
  petName?: string
): Promise<string | null> {
  try {
    // Customize notification content based on type
    const typeMessages: { [key: string]: { emoji: string; body: string } } = {
      feeding: { 
        emoji: '🍽️', 
        body: petName ? `Time to feed ${petName}!` : 'Feeding time!' 
      },
      walking: { 
        emoji: '🚶', 
        body: petName ? `Time to walk ${petName}!` : 'Walk time!' 
      },
      medication: { 
        emoji: '💊', 
        body: petName ? `Give ${petName} their medication` : 'Medication time!' 
      },
      grooming: { 
        emoji: '✂️', 
        body: petName ? `Time to groom ${petName}!` : 'Grooming time!' 
      },
      checkup: { 
        emoji: '🏥', 
        body: petName ? `${petName}'s vet appointment!` : 'Vet checkup time!' 
      },
      custom: { 
        emoji: '🐾', 
        body: petName ? `Reminder for ${petName}` : 'Pet reminder!' 
      },
    };

    const messageConfig = typeMessages[type] || typeMessages.custom;
    const notificationTitle = `${messageConfig.emoji} ${title}`;

    let trigger: any;

    if (recurrenceType === 'once') {
      // One-time notification
      const triggerMs = triggerDate.getTime() - Date.now();
      
      if (triggerMs <= 0) {
        console.log('⚠️ Cannot schedule notification for past time');
        return null;
      }

      trigger = {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.floor(triggerMs / 1000),
      };
    } else {
      // Repeating notification (daily, weekly, monthly)
      const hour = triggerDate.getHours();
      const minute = triggerDate.getMinutes();

      if (recurrenceType === 'daily') {
        // Repeats every day at the same time
        trigger = {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
          repeats: true,
        };
      } else if (recurrenceType === 'weekly') {
        // Repeats every week on the same day
        const weekday = triggerDate.getDay() + 1; // expo uses 1-7 (Sunday = 1)
        trigger = {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday,
          hour,
          minute,
          repeats: true,
        };
      } else if (recurrenceType === 'monthly') {
        // Repeats every month on the same day
        const day = triggerDate.getDate();
        trigger = {
          type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
          day,
          hour,
          minute,
          repeats: true,
        };
      }
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: notificationTitle,
        body: messageConfig.body,
        data: { reminderId, type, petName, recurrenceType },
        sound: true,
      },
      trigger,
    });

    console.log('✅ Notification scheduled:', notificationId, 'for', triggerDate.toLocaleString(), `(${recurrenceType})`);
    return notificationId;
  } catch (error) {
    console.error('❌ Error scheduling notification:', error);
    return null;
  }
}

/**
 * Cancel a scheduled notification
 */
export async function cancelNotification(notificationId: string) {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
    console.log('🗑️ Notification cancelled:', notificationId);
  } catch (error) {
    console.error('❌ Error cancelling notification:', error);
  }
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('🗑️ All notifications cancelled');
  } catch (error) {
    console.error('❌ Error cancelling all notifications:', error);
  }
}

/**
 * Get all scheduled notifications
 */
export async function getScheduledNotifications() {
  try {
    const notifications = await Notifications.getAllScheduledNotificationsAsync();
    console.log('📋 Scheduled notifications:', notifications.length);
    return notifications;
  } catch (error) {
    console.error('❌ Error getting scheduled notifications:', error);
    return [];
  }
}
