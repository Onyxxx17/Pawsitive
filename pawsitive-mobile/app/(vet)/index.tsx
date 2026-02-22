import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Alert,
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

export default function VetDashboardScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [vet, setVet] = useState<Veterinarian | null>(null);
  const [loading, setLoading] = useState(true);
  const { setVet: setGlobalVet, setVetId } = useVet();

  useEffect(() => {
    fetchVetProfile();
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
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={24} color="#2196F3" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="calendar" size={32} color="#2196F3" />
            <Text style={styles.statValue}>12</Text>
            <Text style={styles.statLabel}>Today's Appointments</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="star" size={32} color="#FFB300" />
            <Text style={styles.statValue}>{vet?.rating?.toFixed(1) || '0.0'}</Text>
            <Text style={styles.statLabel}>Rating ({vet?.total_reviews} reviews)</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity style={styles.actionCard}>
            <Ionicons name="calendar-outline" size={28} color="#2196F3" />
            <Text style={styles.actionText}>View Schedule</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard}>
            <Ionicons name="videocam-outline" size={28} color="#2196F3" />
            <Text style={styles.actionText}>Start Consultation</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard}>
            <Ionicons name="document-text-outline" size={28} color="#2196F3" />
            <Text style={styles.actionText}>Medical Records</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard}>
            <Ionicons name="chatbubbles-outline" size={28} color="#2196F3" />
            <Text style={styles.actionText}>Messages</Text>
          </TouchableOpacity>
        </View>

        {/* Upcoming Consultations */}
        <Text style={styles.sectionTitle}>Upcoming Consultations</Text>
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={48} color={Colors.neutral.textLight} />
          <Text style={styles.emptyText}>No upcoming consultations</Text>
          <Text style={styles.emptySubtext}>Your schedule is clear for now</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral.background,
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
    paddingBottom: 20,
    backgroundColor: '#FFF',
  },
  greeting: {
    fontSize: 14,
    color: Colors.neutral.textLight,
  },
  vetName: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.primary.brown,
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
    marginBottom: 32,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.primary.brown,
    marginTop: 12,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.neutral.textLight,
    marginTop: 4,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary.brown,
    marginBottom: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 32,
  },
  actionCard: {
    width: '48%',
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary.brown,
    marginTop: 8,
    textAlign: 'center',
  },
  emptyState: {
    backgroundColor: '#FFF',
    padding: 40,
    borderRadius: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary.brown,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.neutral.textLight,
    marginTop: 4,
  },
});
