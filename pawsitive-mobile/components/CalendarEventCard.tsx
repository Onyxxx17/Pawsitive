import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

interface CalendarEventCardProps {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  description?: string;
  hasNotification: boolean;
  isAllDay: boolean;
  onToggleNotification: (eventId: string, enabled: boolean) => Promise<void>;
  onEdit: (eventId: string) => void;
  onDelete: (eventId: string) => void;
}

export default function CalendarEventCard({
  id,
  title,
  startTime,
  endTime,
  location,
  description,
  hasNotification,
  isAllDay,
  onToggleNotification,
  onEdit,
  onDelete,
}: CalendarEventCardProps) {
  const [notificationEnabled, setNotificationEnabled] = useState(hasNotification);
  const [isUpdating, setIsUpdating] = useState(false);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const handleToggleNotification = async (value: boolean) => {
    setIsUpdating(true);
    try {
      await onToggleNotification(id, value);
      setNotificationEnabled(value);
    } catch (error) {
      Alert.alert('Error', 'Failed to update notification setting');
      console.error('Error toggling notification:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Event',
      'Are you sure you want to delete this event from your calendar?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => onDelete(id),
        },
      ]
    );
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons name="calendar-outline" size={22} color={Colors.primary.brown} />
        </View>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.timeContainer}>
            {isAllDay ? (
              <Text style={styles.timeText}>All Day</Text>
            ) : (
              <Text style={styles.timeText}>
                {formatTime(startTime)} - {formatTime(endTime)}
              </Text>
            )}
          </View>
        </View>
      </View>

      {location && (
        <View style={styles.detailRow}>
          <Ionicons name="location-outline" size={16} color={Colors.neutral.textLight} />
          <Text style={styles.detailText}>{location}</Text>
        </View>
      )}

      {description && (
        <Text style={styles.description} numberOfLines={2}>
          {description}
        </Text>
      )}

      <View style={styles.footer}>
        <View style={styles.notificationRow}>
          <Ionicons 
            name={notificationEnabled ? "notifications" : "notifications-off-outline"} 
            size={16} 
            color={notificationEnabled ? Colors.primary.brown : Colors.neutral.textLight} 
          />
          <Text style={styles.notificationLabel}>Notifications</Text>
          <Switch
            value={notificationEnabled}
            onValueChange={handleToggleNotification}
            disabled={isUpdating}
            trackColor={{ 
              false: Colors.neutral.border, 
              true: Colors.primary.brown + '40' 
            }}
            thumbColor={notificationEnabled ? Colors.primary.brown : Colors.neutral.text}
          />
        </View>

        <View style={styles.actions}>
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => onEdit(id)}
          >
            <Ionicons name="create-outline" size={20} color={Colors.primary.brown} />
            <Text style={styles.actionText}>Edit</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.deleteButton]} 
            onPress={handleDelete}
          >
            <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
            <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF8EF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EADDCF',
  },
  header: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#F2E5D7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.neutral.text,
    marginBottom: 4,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 14,
    color: Colors.primary.brown,
    fontWeight: '700',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  detailText: {
    fontSize: 14,
    color: Colors.neutral.textLight,
    flex: 1,
  },
  description: {
    fontSize: 14,
    color: Colors.neutral.textLight,
    marginBottom: 12,
    lineHeight: 20,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#E7D7C7',
    paddingTop: 12,
    gap: 12,
  },
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notificationLabel: {
    flex: 1,
    fontSize: 14,
    color: Colors.neutral.text,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#F2E5D7',
    gap: 6,
  },
  deleteButton: {
    backgroundColor: '#FFE7E3',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary.brown,
  },
  deleteText: {
    color: '#FF6B6B',
  },
});
