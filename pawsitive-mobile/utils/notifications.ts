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
 * Schedule a notification for a reminder
 */
export async function scheduleReminderNotification(
  reminderId: string,
  title: string,
  triggerDate: Date,
  type: string,
  petName?: string
): Promise<string | null> {
  try {
    const trigger = triggerDate.getTime() - Date.now();
    
    // Don't schedule if time is in the past
    if (trigger <= 0) {
      console.log('⚠️ Cannot schedule notification for past time');
      return null;
    }

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

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: notificationTitle,
        body: messageConfig.body,
        data: { reminderId, type, petName },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.floor(trigger / 1000),
      },
    });

    console.log('✅ Notification scheduled:', notificationId, 'for', triggerDate.toLocaleString());
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
