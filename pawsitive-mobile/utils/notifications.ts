import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

type WebRecurrence = 'once' | 'daily' | 'weekly' | 'monthly';

type WebScheduledNotification = {
  id: string;
  title: string;
  body: string;
  recurrenceType: WebRecurrence;
  nextTriggerAt: number;
  timeoutId: ReturnType<typeof setTimeout> | null;
  cancelled: boolean;
};

type RehydratableReminder = {
  id: string;
  title: string;
  type: string;
  next_trigger_at: string;
  recurrence_type?: 'once' | 'daily' | 'weekly' | 'monthly' | null;
  recurrence_end_date?: string | null;
  notification_id?: string | null;
  is_active?: boolean;
  is_completed?: boolean;
};

const webScheduledNotifications = new Map<string, WebScheduledNotification>();

// Configure how notifications should be handled when app is in foreground
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

const canUseBrowserNotifications = () => {
  return (
    Platform.OS === 'web' &&
    typeof globalThis !== 'undefined' &&
    typeof (globalThis as any).Notification !== 'undefined'
  );
};

const showBrowserNotification = (title: string, body: string) => {
  if (!canUseBrowserNotifications()) return;
  if ((globalThis as any).Notification.permission !== 'granted') return;

  try {
    new (globalThis as any).Notification(title, { body });
  } catch (error) {
    console.error('❌ Error showing browser notification:', error);
  }
};

const getNextTriggerDate = (fromDate: Date, recurrenceType: WebRecurrence): Date => {
  const nextDate = new Date(fromDate);

  if (recurrenceType === 'daily') {
    nextDate.setDate(nextDate.getDate() + 1);
    return nextDate;
  }

  if (recurrenceType === 'weekly') {
    nextDate.setDate(nextDate.getDate() + 7);
    return nextDate;
  }

  if (recurrenceType === 'monthly') {
    nextDate.setMonth(nextDate.getMonth() + 1);
    return nextDate;
  }

  return nextDate;
};

const ensureFutureTrigger = (candidate: Date, recurrenceType: WebRecurrence): Date => {
  let nextDate = new Date(candidate);
  const now = Date.now();

  if (recurrenceType === 'once') {
    return nextDate;
  }

  while (nextDate.getTime() <= now) {
    nextDate = getNextTriggerDate(nextDate, recurrenceType);
  }

  return nextDate;
};

const scheduleWebTimer = (notificationId: string) => {
  const scheduled = webScheduledNotifications.get(notificationId);
  if (!scheduled || scheduled.cancelled) return;

  const delayMs = Math.max(0, scheduled.nextTriggerAt - Date.now());

  scheduled.timeoutId = setTimeout(() => {
    const active = webScheduledNotifications.get(notificationId);
    if (!active || active.cancelled) return;

    showBrowserNotification(active.title, active.body);

    if (active.recurrenceType === 'once') {
      webScheduledNotifications.delete(notificationId);
      return;
    }

    const nextDate = getNextTriggerDate(new Date(active.nextTriggerAt), active.recurrenceType);
    active.nextTriggerAt = ensureFutureTrigger(nextDate, active.recurrenceType).getTime();
    scheduleWebTimer(notificationId);
  }, delayMs);
};

const scheduleWebReminderNotification = async (
  reminderId: string,
  title: string,
  triggerDate: Date,
  recurrenceType: string,
  type: string,
  petName?: string,
  preferredNotificationId?: string,
): Promise<string | null> => {
  if (!canUseBrowserNotifications()) {
    console.log('⚠️ Browser Notification API not supported');
    return null;
  }

  if ((globalThis as any).Notification.permission !== 'granted') {
    console.log('⚠️ Browser notification permission not granted');
    return null;
  }

  const validRecurrence: WebRecurrence =
    recurrenceType === 'daily' || recurrenceType === 'weekly' || recurrenceType === 'monthly'
      ? recurrenceType
      : 'once';

  if (validRecurrence === 'once' && triggerDate.getTime() <= Date.now()) {
    console.log('⚠️ Cannot schedule notification for past time');
    return null;
  }

  const typeMessages: { [key: string]: { emoji: string; body: string } } = {
    feeding: {
      emoji: '🍽️',
      body: petName ? `Time to feed ${petName}!` : 'Feeding time!',
    },
    walking: {
      emoji: '🚶',
      body: petName ? `Time to walk ${petName}!` : 'Walk time!',
    },
    medication: {
      emoji: '💊',
      body: petName ? `Give ${petName} their medication` : 'Medication time!',
    },
    grooming: {
      emoji: '✂️',
      body: petName ? `Time to groom ${petName}!` : 'Grooming time!',
    },
    checkup: {
      emoji: '🏥',
      body: petName ? `${petName}'s vet appointment!` : 'Vet checkup time!',
    },
    custom: {
      emoji: '🐾',
      body: petName ? `Reminder for ${petName}` : 'Pet reminder!',
    },
  };

  const messageConfig = typeMessages[type] || typeMessages.custom;
  const notificationTitle = `${messageConfig.emoji} ${title}`;

  const notificationId = preferredNotificationId || `web-${reminderId}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

  const existing = webScheduledNotifications.get(notificationId);
  if (existing?.timeoutId) {
    clearTimeout(existing.timeoutId);
  }

  const firstTrigger = ensureFutureTrigger(triggerDate, validRecurrence).getTime();

  webScheduledNotifications.set(notificationId, {
    id: notificationId,
    title: notificationTitle,
    body: messageConfig.body,
    recurrenceType: validRecurrence,
    nextTriggerAt: firstTrigger,
    timeoutId: null,
    cancelled: false,
  });

  scheduleWebTimer(notificationId);
  console.log('✅ Web notification scheduled:', notificationId, 'for', new Date(firstTrigger).toLocaleString(), `(${validRecurrence})`);
  return notificationId;
};

/**
 * Request notification permissions from the user
 */
export async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'web') {
    if (!canUseBrowserNotifications()) {
      console.log('⚠️ Browser Notification API not available on this web client');
      return null;
    }

    const permission = await (globalThis as any).Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('⚠️ Browser notification permission was not granted');
      return null;
    }

    return 'web-notification-permission-granted';
  }

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
  petName?: string,
  preferredNotificationId?: string,
): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      return await scheduleWebReminderNotification(
        reminderId,
        title,
        triggerDate,
        recurrenceType,
        type,
        petName,
        preferredNotificationId,
      );
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

export async function rehydrateWebReminderNotifications(
  reminders: RehydratableReminder[],
  petName?: string,
) {
  if (Platform.OS !== 'web') return;

  try {
    await cancelAllNotifications();

    const now = Date.now();
    const activeReminders = reminders.filter((reminder) => {
      if (reminder.is_active === false) return false;
      if (reminder.is_completed) return false;

      const recurrence = reminder.recurrence_type || 'once';
      const triggerDate = new Date(reminder.next_trigger_at);
      if (!Number.isFinite(triggerDate.getTime())) return false;

      if (recurrence === 'once') {
        return triggerDate.getTime() > now;
      }

      if (reminder.recurrence_end_date) {
        const endDate = new Date(reminder.recurrence_end_date);
        endDate.setHours(23, 59, 59, 999);
        if (endDate.getTime() < now) {
          return false;
        }
      }

      return true;
    });

    for (const reminder of activeReminders) {
      const triggerDate = new Date(reminder.next_trigger_at);
      await scheduleReminderNotification(
        reminder.id,
        reminder.title,
        triggerDate,
        reminder.recurrence_type || 'once',
        reminder.type,
        petName,
        reminder.notification_id || undefined,
      );
    }

    console.log('♻️ Rehydrated web reminders:', activeReminders.length);
  } catch (error) {
    console.error('❌ Error rehydrating web reminder notifications:', error);
  }
}

/**
 * Cancel a scheduled notification
 */
export async function cancelNotification(notificationId: string) {
  try {
    if (Platform.OS === 'web') {
      const scheduled = webScheduledNotifications.get(notificationId);
      if (scheduled?.timeoutId) {
        clearTimeout(scheduled.timeoutId);
      }
      webScheduledNotifications.delete(notificationId);
      console.log('🗑️ Web notification cancelled:', notificationId);
      return;
    }

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
    if (Platform.OS === 'web') {
      webScheduledNotifications.forEach((scheduled) => {
        if (scheduled.timeoutId) {
          clearTimeout(scheduled.timeoutId);
        }
      });
      webScheduledNotifications.clear();
      console.log('🗑️ All web notifications cancelled');
      return;
    }

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
    if (Platform.OS === 'web') {
      const notifications = Array.from(webScheduledNotifications.values()).map((scheduled) => ({
        identifier: scheduled.id,
        triggerDate: new Date(scheduled.nextTriggerAt).toISOString(),
        recurrenceType: scheduled.recurrenceType,
      }));
      console.log('📋 Scheduled web notifications:', notifications.length);
      return notifications;
    }

    const notifications = await Notifications.getAllScheduledNotificationsAsync();
    console.log('📋 Scheduled notifications:', notifications.length);
    return notifications;
  } catch (error) {
    console.error('❌ Error getting scheduled notifications:', error);
    return [];
  }
}
