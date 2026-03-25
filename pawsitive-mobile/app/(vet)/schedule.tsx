import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { useVet } from '@/context/VetContext';

type Appointment = {
  id: string;
  scheduled_at: string;
  duration_min: number;
  status: string;
  call_type: string;
  pet: {
    name: string;
    species: string;
  } | null;
  user: {
    name: string;
  } | null;
};

const unwrapSingle = <T,>(value: T | T[] | null | undefined): T | null => {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
};

export default function VetScheduleScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { vetId: globalVetId } = useVet();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');

  useEffect(() => {
    fetchAppointments();
  }, [selectedDate, viewMode]);

  const fetchAppointments = async () => {
    try {
      // Try to get vetId from context first, then from params
      const vetId = globalVetId || (params.vetId as string);
      if (!vetId) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Calculate date range based on view mode
      const startDate = new Date(selectedDate);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(selectedDate);
      if (viewMode === 'week') {
        endDate.setDate(endDate.getDate() + 7);
      }
      endDate.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          scheduled_at,
          duration_min,
          status,
          call_type,
          pet:pets(name, species),
          user:profiles(name)
        `)
        .eq('vet_id', vetId)
        .gte('scheduled_at', startDate.toISOString())
        .lte('scheduled_at', endDate.toISOString())
        .order('scheduled_at', { ascending: true });

      if (error) throw error;

      // Transform the data to match the Appointment type
      const transformedData = (data || []).map((item: any) => ({
        id: item.id,
        scheduled_at: item.scheduled_at,
        duration_min: item.duration_min,
        status: item.status,
        call_type: item.call_type,
        pet: unwrapSingle(item.pet),
        user: unwrapSingle(item.user),
      })).filter((item) => item.pet && item.user);

      setAppointments(transformedData);
    } catch (error: any) {
      console.error('Error fetching appointments:', error);
      Alert.alert('Error', 'Failed to load appointments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAppointments();
  };

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return '#2196F3';
      case 'in_progress': return '#4CAF50';
      case 'completed': return '#9E9E9E';
      case 'cancelled': return '#F44336';
      default: return Colors.neutral.textLight;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled': return 'time-outline';
      case 'in_progress': return 'videocam';
      case 'completed': return 'checkmark-circle';
      case 'cancelled': return 'close-circle';
      default: return 'help-circle';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const renderAppointmentCard = (appointment: Appointment) => (
    <TouchableOpacity 
      key={appointment.id}
      style={styles.appointmentCard}
      activeOpacity={0.7}
      onPress={() =>
        router.push({
          pathname: '/(vet)/consultations',
          params: { appointmentId: appointment.id },
        })
      }
    >
      <View style={styles.appointmentTime}>
        <Text style={styles.timeText}>{formatTime(appointment.scheduled_at)}</Text>
        <Text style={styles.durationText}>{appointment.duration_min} min</Text>
      </View>

      <View style={styles.appointmentDetails}>
        <View style={styles.appointmentHeader}>
          <View>
            <Text style={styles.petName}>
              {appointment.pet?.name || 'Unknown pet'}
            </Text>
            <Text style={styles.ownerName}>
              Owner: {appointment.user?.name || 'Unknown owner'}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(appointment.status) + '20' }]}>
            <Ionicons 
              name={getStatusIcon(appointment.status) as any} 
              size={16} 
              color={getStatusColor(appointment.status)} 
            />
            <Text style={[styles.statusText, { color: getStatusColor(appointment.status) }]}>
              {appointment.status}
            </Text>
          </View>
        </View>

        <View style={styles.appointmentMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="paw" size={14} color={Colors.neutral.textLight} />
            <Text style={styles.metaText}>{appointment.pet?.species || 'Unknown species'}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons 
              name={appointment.call_type === 'video' ? 'videocam' : 'call'} 
              size={14} 
              color={Colors.neutral.textLight} 
            />
            <Text style={styles.metaText}>{appointment.call_type}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Schedule</Text>
        <View style={styles.viewModeToggle}>
          <TouchableOpacity 
            style={[styles.toggleButton, viewMode === 'day' && styles.toggleButtonActive]}
            onPress={() => setViewMode('day')}
          >
            <Text style={[styles.toggleText, viewMode === 'day' && styles.toggleTextActive]}>
              Day
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.toggleButton, viewMode === 'week' && styles.toggleButtonActive]}
            onPress={() => setViewMode('week')}
          >
            <Text style={[styles.toggleText, viewMode === 'week' && styles.toggleTextActive]}>
              Week
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Date Navigation */}
      <View style={styles.dateNavigation}>
        <TouchableOpacity 
          style={styles.dateNavButton}
          onPress={() => changeDate(viewMode === 'week' ? -7 : -1)}
        >
          <Ionicons name="chevron-back" size={24} color="#2196F3" />
        </TouchableOpacity>

        <View style={styles.dateDisplay}>
          <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
          {viewMode === 'week' && (
            <Text style={styles.weekRangeText}>
              (Next 7 days)
            </Text>
          )}
        </View>

        <TouchableOpacity 
          style={styles.dateNavButton}
          onPress={() => changeDate(viewMode === 'week' ? 7 : 1)}
        >
          <Ionicons name="chevron-forward" size={24} color="#2196F3" />
        </TouchableOpacity>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity 
          style={styles.quickActionButton}
          onPress={() => setSelectedDate(new Date())}
        >
          <Ionicons name="today" size={20} color="#2196F3" />
          <Text style={styles.quickActionText}>Today</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.quickActionButton}
          onPress={onRefresh}
        >
          <Ionicons name="refresh" size={20} color="#2196F3" />
          <Text style={styles.quickActionText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {/* Appointments List */}
      <ScrollView
        style={styles.appointmentsList}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading && !refreshing ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Loading appointments...</Text>
          </View>
        ) : appointments.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={80} color={Colors.neutral.textLight} />
            <Text style={styles.emptyTitle}>No Appointments</Text>
            <Text style={styles.emptyText}>
              You have no appointments scheduled for this {viewMode === 'week' ? 'week' : 'day'}
            </Text>
          </View>
        ) : (
          <View style={styles.appointmentsContainer}>
            <Text style={styles.sectionTitle}>
              {appointments.length} Appointment{appointments.length !== 1 ? 's' : ''}
            </Text>
            {appointments.map(renderAppointmentCard)}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#FFF',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.primary.brown,
  },
  viewModeToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.neutral.background,
    borderRadius: 8,
    padding: 2,
  },
  toggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
  },
  toggleButtonActive: {
    backgroundColor: '#FFF',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.neutral.textLight,
  },
  toggleTextActive: {
    color: '#2196F3',
  },
  dateNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral.border,
  },
  dateNavButton: {
    padding: 8,
  },
  dateDisplay: {
    alignItems: 'center',
  },
  dateText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary.brown,
  },
  weekRangeText: {
    fontSize: 12,
    color: Colors.neutral.textLight,
    marginTop: 2,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral.border,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2196F3',
  },
  appointmentsList: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary.brown,
    marginBottom: 12,
  },
  appointmentsContainer: {
    padding: 24,
  },
  appointmentCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  appointmentTime: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 16,
    borderRightWidth: 2,
    borderRightColor: '#2196F3',
    minWidth: 80,
  },
  timeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2196F3',
  },
  durationText: {
    fontSize: 12,
    color: Colors.neutral.textLight,
    marginTop: 4,
  },
  appointmentDetails: {
    flex: 1,
    paddingLeft: 16,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  petName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary.brown,
  },
  ownerName: {
    fontSize: 14,
    color: Colors.neutral.textLight,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  appointmentMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: Colors.neutral.textLight,
    textTransform: 'capitalize',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary.brown,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.neutral.textLight,
    textAlign: 'center',
  },
});
