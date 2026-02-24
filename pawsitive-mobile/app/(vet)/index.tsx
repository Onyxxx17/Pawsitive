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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { useVet } from '@/context/VetContext';

type Veterinarian = {
  id: string;
  name: string;
  email: string;
  clinic_name: string;
  specializations: string[];
  profile_photo_url: string;
  rating: number;
  total_reviews: number;
};

type Appointment = {
  id: string;
  scheduled_at: string;
  duration_min: number;
  status: string;
  pet: {
    name: string;
    species: string;
  };
  user: {
    name: string;
  };
};

export default function VetDashboardScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [vet, setVet] = useState<Veterinarian | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const { setVet: setGlobalVet, setVetId, vetId: globalVetId } = useVet();

  useEffect(() => {
    fetchVetProfile();
    fetchAppointments();
  }, [params.vetId]);

  const fetchVetProfile = async () => {
    try {
      const vetId = params.vetId as string;
      if (!vetId) {
        Alert.alert('Error', 'Invalid vet session');
        router.replace('/landing');
        return;
      }

      const { data, error } = await supabase
        .from('veterinarians')
        .select('*')
        .eq('id', vetId)
        .single();

      if (error) throw error;

      if (!data.is_active) {
        Alert.alert('Access Denied', 'Your account is not active');
        router.replace('/landing');
        return;
      }

      setVet(data);
      setGlobalVet(data);  // Set in context
      setVetId(vetId);     // Set vet ID in context
    } catch (error: any) {
      console.error('Error fetching vet profile:', error);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchAppointments = async () => {
    try {
      const vetId = globalVetId || (params.vetId as string);
      if (!vetId) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);

      // Fetch today's appointments
      const { data: todayData, error: todayError } = await supabase
        .from('appointments')
        .select(`
          id,
          scheduled_at,
          duration_min,
          status,
          pet:pets(name, species),
          user:profiles(name)
        `)
        .eq('vet_id', vetId)
        .gte('scheduled_at', today.toISOString())
        .lt('scheduled_at', tomorrow.toISOString())
        .in('status', ['scheduled', 'in_progress'])
        .order('scheduled_at', { ascending: true });

      if (todayError) throw todayError;

      // Transform today's data
      const transformedToday = (todayData || []).map((item: any) => ({
        id: item.id,
        scheduled_at: item.scheduled_at,
        duration_min: item.duration_min,
        status: item.status,
        pet: Array.isArray(item.pet) ? item.pet[0] : item.pet,
        user: Array.isArray(item.user) ? item.user[0] : item.user,
      }));

      setTodayAppointments(transformedToday);

      // Fetch upcoming appointments (next 7 days, excluding today)
      const { data: upcomingData, error: upcomingError } = await supabase
        .from('appointments')
        .select(`
          id,
          scheduled_at,
          duration_min,
          status,
          pet:pets(name, species),
          user:profiles(name)
        `)
        .eq('vet_id', vetId)
        .gte('scheduled_at', tomorrow.toISOString())
        .lt('scheduled_at', nextWeek.toISOString())
        .eq('status', 'scheduled')
        .order('scheduled_at', { ascending: true })
        .limit(5);

      if (upcomingError) throw upcomingError;

      // Transform upcoming data
      const transformedUpcoming = (upcomingData || []).map((item: any) => ({
        id: item.id,
        scheduled_at: item.scheduled_at,
        duration_min: item.duration_min,
        status: item.status,
        pet: Array.isArray(item.pet) ? item.pet[0] : item.pet,
        user: Array.isArray(item.user) ? item.user[0] : item.user,
      }));

      setUpcomingAppointments(transformedUpcoming);
    } catch (error: any) {
      console.error('Error fetching appointments:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAppointments();
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric'
    });
  };

  const getNextAppointment = () => {
    if (todayAppointments.length > 0) {
      return todayAppointments[0];
    }
    if (upcomingAppointments.length > 0) {
      return upcomingAppointments[0];
    }
    return null;
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: () => router.replace('/landing')
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.vetName}>Dr. {vet?.name}</Text>
        </View>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, styles.whiteStatCard]}>
            <View style={styles.whiteIconContainer}>
              <Ionicons name="calendar" size={32} color="#007AFF" />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.whiteStatValue}>{todayAppointments.length}</Text>
              <Text style={styles.whiteStatLabel}>Today's Appointments</Text>
              <Text style={styles.whiteStatSubtext}>
                {todayAppointments.length === 0 
                  ? 'No appointments scheduled' 
                  : todayAppointments.length === 1 
                  ? '1 consultation today'
                  : `${todayAppointments.length} consultations today`}
              </Text>
            </View>
          </View>
          
          {getNextAppointment() && (
            <View style={[styles.statCard, styles.primaryStatCard]}>
              <View style={styles.statIconContainer}>
                <Ionicons name="time" size={32} color="#FFF" />
              </View>
              <View style={styles.statContent}>
                <Text style={styles.statValue}>
                  {formatTime(getNextAppointment()!.scheduled_at)}
                </Text>
                <Text style={styles.statLabel}>Next Appointment</Text>
                <Text style={styles.statSubtext}>{getNextAppointment()!.pet.name}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => router.push('/(vet)/schedule')}
          >
            <Ionicons name="calendar-outline" size={32} color="#007AFF" />
            <Text style={styles.actionText}>View Schedule</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => router.push('/(vet)/consultations')}
          >
            <Ionicons name="videocam-outline" size={32} color="#FF9800" />
            <Text style={styles.actionText}>Consultations</Text>
          </TouchableOpacity>
        </View>

        {/* Upcoming Consultations */}
        <Text style={styles.sectionTitle}>Upcoming Consultations</Text>
        {upcomingAppointments.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color={Colors.neutral.textLight} />
            <Text style={styles.emptyText}>No upcoming consultations</Text>
            <Text style={styles.emptySubtext}>Your schedule is clear for now</Text>
          </View>
        ) : (
          <View style={styles.appointmentsList}>
            {upcomingAppointments.map((appointment) => (
              <TouchableOpacity key={appointment.id} style={styles.appointmentCard}>
                <View style={styles.appointmentTime}>
                  <Text style={styles.appointmentDate}>{formatDate(appointment.scheduled_at)}</Text>
                  <Text style={styles.appointmentTimeText}>{formatTime(appointment.scheduled_at)}</Text>
                </View>
                <View style={styles.appointmentDetails}>
                  <Text style={styles.petName}>{appointment.pet.name}</Text>
                  <Text style={styles.ownerName}>Owner: {appointment.user.name}</Text>
                  <Text style={styles.species}>{appointment.pet.species}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.neutral.textLight} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.neutral.background,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.neutral.textLight,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 24,
    backgroundColor: '#007AFF',
  },
  greeting: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  vetName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFF',
    marginTop: 4,
  },
  logoutButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 28,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFF',
    padding: 28,
    borderRadius: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  primaryStatCard: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: 24,
    paddingHorizontal: 24,
  },
  secondaryStatCard: {
    backgroundColor: '#34C759',
  },
  whiteStatCard: {
    backgroundColor: '#FFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: 24,
    paddingHorizontal: 24,
  },
  statIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 18,
  },
  whiteIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 18,
  },
  statContent: {
    flex: 1,
    alignItems: 'flex-start',
  },
  statValue: {
    fontSize: 40,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 4,
  },
  whiteStatValue: {
    fontSize: 40,
    fontWeight: '700',
    color: '#007AFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
    marginBottom: 4,
  },
  whiteStatLabel: {
    fontSize: 14,
    color: '#1A1A1A',
    fontWeight: '600',
    marginBottom: 4,
  },
  statSubtext: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '400',
  },
  whiteStatSubtext: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '400',
  },
  nextApptTime: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFF',
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 16,
    marginTop: 8,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#FFF',
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
    marginTop: 12,
    textAlign: 'center',
  },
  emptyState: {
    backgroundColor: '#FFF',
    padding: 48,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  emptyText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1A1A1A',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 8,
  },
  appointmentsList: {
    gap: 12,
  },
  appointmentCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  appointmentTime: {
    marginRight: 20,
    paddingRight: 20,
    borderRightWidth: 1,
    borderRightColor: '#E5E5EA',
    minWidth: 80,
  },
  appointmentDate: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  appointmentTimeText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#007AFF',
    marginTop: 6,
  },
  appointmentDetails: {
    flex: 1,
  },
  petName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  ownerName: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  species: {
    fontSize: 13,
    color: '#8E8E93',
    textTransform: 'capitalize',
    marginTop: 2,
  },
});