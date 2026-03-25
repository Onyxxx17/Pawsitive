import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '@/constants/Colors';
import { useVet } from '@/context/VetContext';
import { supabase } from '@/lib/supabase';

type OwnerProfile = {
  id: string;
  name: string | null;
  phone_number: string | null;
  timezone: string | null;
};

type PetProfile = {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  weight_kg: number | null;
  profile_photo_url: string | null;
  existing_conditions: string[] | null;
  notes: string | null;
};

type AppointmentRecord = {
  id: string;
  scheduled_at: string;
  duration_min: number;
  status: string;
  call_type: string;
  call_room_id: string | null;
  pet_snapshot_json: Record<string, any> | null;
  pet: PetProfile;
  owner: OwnerProfile;
};

type HealthCheck = {
  id: string;
  check_type: string;
  score: number | null;
  confidence: number | null;
  created_at: string;
};

type HealthLog = {
  id: string;
  log_type: string;
  log_data: Record<string, any> | null;
  logged_at: string;
};

type ChatMessage = {
  id: string;
  sender: 'assistant' | 'vet';
  text: string;
};

const unwrapSingle = <T,>(value: T | T[] | null | undefined): T | null => {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
};

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

const summarizeLog = (log: HealthLog) => {
  if (log.log_type === 'diet') {
    return `${log.log_data?.meal_type ?? log.log_data?.food_type ?? 'Diet'}${log.log_data?.amount_grams ? `, ${log.log_data.amount_grams}g` : ''}`;
  }
  if (log.log_type === 'activity') {
    const duration = log.log_data?.duration_minutes ?? log.log_data?.duration_min;
    return `${log.log_data?.activity_type ?? 'Activity'}${duration ? `, ${duration} min` : ''}`;
  }
  return `${log.log_data?.marker_type ?? 'Biological'}${log.log_data?.frequency ? `, ${log.log_data.frequency}x` : ''}`;
};

const statusMeta = (status: string) => {
  switch (status) {
    case 'in_progress':
      return { label: 'Live', tone: '#2B8A5A', tint: '#E6F5EB' };
    case 'completed':
      return { label: 'Completed', tone: '#6A6A6A', tint: '#ECECEC' };
    case 'scheduled':
      return { label: 'Waiting', tone: '#2563EB', tint: '#E8F1FF' };
    default:
      return { label: status, tone: '#6A6A6A', tint: '#ECECEC' };
  }
};

export default function VetConsultationsScreen() {
  const params = useLocalSearchParams<{ appointmentId?: string }>();
  const router = useRouter();
  const { vet, vetId, loading: vetSessionLoading } = useVet();

  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([]);
  const [healthLogs, setHealthLogs] = useState<HealthLog[]>([]);
  const [consultationNoteId, setConsultationNoteId] = useState<string | null>(null);
  const [consultationSummary, setConsultationSummary] = useState('');
  const [consultationDiagnosis, setConsultationDiagnosis] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'seed',
      sender: 'assistant',
      text: 'Select a consultation to start reviewing patient history with PawPal.',
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const selectedAppointment = useMemo(
    () => appointments.find((appointment) => appointment.id === selectedAppointmentId) ?? null,
    [appointments, selectedAppointmentId],
  );

  const fetchAppointments = useCallback(async () => {
    if (!vetId) {
      // Wait for vet session hydration on first app load/login.
      if (!vetSessionLoading) {
        setLoading(false);
        setRefreshing(false);
      }
      return;
    }

    try {
      const start = new Date();
      start.setDate(start.getDate() - 365);
      start.setHours(0, 0, 0, 0);

      const end = new Date();
      end.setDate(end.getDate() + 30);
      end.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          scheduled_at,
          duration_min,
          status,
          call_type,
          call_room_id,
          pet_snapshot_json,
          pet:pets(id, name, species, breed, weight_kg, profile_photo_url, existing_conditions, notes),
          owner:profiles(id, name, phone_number, timezone)
        `)
        .eq('vet_id', vetId)
        .gte('scheduled_at', start.toISOString())
        .lte('scheduled_at', end.toISOString())
        .in('status', ['scheduled', 'in_progress', 'completed'])
        .order('scheduled_at', { ascending: true });

      if (error) {
        throw error;
      }

      const nextAppointments = (data || [])
        .map((row: any) => {
          const pet = unwrapSingle<PetProfile>(row.pet);
          const owner = unwrapSingle<OwnerProfile>(row.owner);
          if (!pet || !owner) return null;

          return {
            id: row.id,
            scheduled_at: row.scheduled_at,
            duration_min: row.duration_min,
            status: row.status,
            call_type: row.call_type,
            call_room_id: row.call_room_id ?? null,
            pet_snapshot_json: row.pet_snapshot_json ?? null,
            pet,
            owner,
          } satisfies AppointmentRecord;
        })
        .filter((row): row is AppointmentRecord => Boolean(row));

      setAppointments(nextAppointments);
      setSelectedAppointmentId((current) => {
        const requested = typeof params.appointmentId === 'string' ? params.appointmentId : null;
        if (requested && nextAppointments.some((appointment) => appointment.id === requested)) return requested;
        if (current && nextAppointments.some((appointment) => appointment.id === current)) return current;
        return (
          nextAppointments.find((appointment) => appointment.status === 'in_progress')?.id ??
          nextAppointments.find((appointment) => appointment.status === 'scheduled')?.id ??
          nextAppointments[0]?.id ??
          null
        );
      });
    } catch (error: any) {
      console.error('Error fetching consultations:', error);
      Alert.alert('Error', String(error?.message || 'Failed to load consultations.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [params.appointmentId, vetId, vetSessionLoading]);

  const fetchAppointmentContext = useCallback(async () => {
    if (!selectedAppointment) {
      setHealthChecks([]);
      setHealthLogs([]);
      setConsultationNoteId(null);
      setConsultationSummary('');
      setConsultationDiagnosis('');
      setMessages([
        {
          id: 'seed',
          sender: 'assistant',
          text: 'Select a consultation to start reviewing patient history with PawPal.',
        },
      ]);
      return;
    }

    try {
      setDetailLoading(true);
      const since = new Date();
      since.setDate(since.getDate() - 60);

      const [checksResult, logsResult, noteResult] = await Promise.all([
        supabase
          .from('health_checks')
          .select('id, check_type, score, confidence, created_at')
          .eq('pet_id', selectedAppointment.pet.id)
          .eq('status', 'complete')
          .gte('created_at', since.toISOString())
          .order('created_at', { ascending: false })
          .limit(24),
        supabase
          .from('health_logs')
          .select('id, log_type, log_data, logged_at')
          .eq('pet_id', selectedAppointment.pet.id)
          .gte('logged_at', since.toISOString())
          .order('logged_at', { ascending: false })
          .limit(40),
        supabase
          .from('consultation_notes')
          .select('id, summary, diagnosis')
          .eq('appointment_id', selectedAppointment.id)
          .maybeSingle(),
      ]);

      if (checksResult.error) throw checksResult.error;
      if (logsResult.error) throw logsResult.error;
      if (noteResult.error) throw noteResult.error;

      setHealthChecks((checksResult.data || []) as HealthCheck[]);
      setHealthLogs((logsResult.data || []) as HealthLog[]);
      setConsultationNoteId(noteResult.data?.id ?? null);
      setConsultationSummary(noteResult.data?.summary ?? '');
      setConsultationDiagnosis(noteResult.data?.diagnosis ?? '');
      setMessages([
        {
          id: 'seed',
          sender: 'assistant',
          text: `PawPal is ready with ${selectedAppointment.pet.name}'s recent history. Ask for a triage summary, trend explanation, or owner follow-up questions.`,
        },
      ]);
      setChatInput('');
      setChatError(null);
    } catch (error: any) {
      console.error('Error fetching patient context:', error);
      Alert.alert('Error', String(error?.message || 'Failed to load patient history.'));
    } finally {
      setDetailLoading(false);
    }
  }, [selectedAppointment]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  useEffect(() => {
    fetchAppointmentContext();
  }, [fetchAppointmentContext]);

  const saveConsultationNote = useCallback(
    async (showSuccess: boolean) => {
      if (!selectedAppointment || !vetId) return false;

      const summary = consultationSummary.trim();
      const diagnosis = consultationDiagnosis.trim();
      if (!summary && !diagnosis) {
        if (showSuccess) {
          Alert.alert('Nothing to save', 'Add a summary or assessment before saving.');
        }
        return false;
      }

      setSavingNote(true);
      try {
        const { data, error } = await supabase
          .from('consultation_notes')
          .upsert(
            {
              id: consultationNoteId ?? undefined,
              appointment_id: selectedAppointment.id,
              vet_id: vetId,
              pet_id: selectedAppointment.pet.id,
              summary: summary || null,
              diagnosis: diagnosis || null,
            },
            { onConflict: 'appointment_id' },
          )
          .select('id')
          .single();

        if (error) throw error;
        setConsultationNoteId(data?.id ?? consultationNoteId);
        if (showSuccess) {
          Alert.alert('Saved', 'Consultation notes were updated.');
        }
        return true;
      } catch (error: any) {
        console.error('Error saving consultation notes:', error);
        Alert.alert('Save failed', String(error?.message || 'Could not save notes.'));
        return false;
      } finally {
        setSavingNote(false);
      }
    },
    [consultationDiagnosis, consultationNoteId, consultationSummary, selectedAppointment, vetId],
  );

  const updateAppointmentStatus = async (status: 'in_progress' | 'completed') => {
    if (!selectedAppointment) return;

    setStatusLoading(true);
    try {
      if (status === 'completed') {
        await saveConsultationNote(false);
      }

      const roomId = `pawsitive-${selectedAppointment.id}`;
      
      const { error } = await supabase.from('appointments').update({ status }).eq('id', selectedAppointment.id);
      if (error) throw error;

      setAppointments((current) =>
        current.map((appointment) =>
          appointment.id === selectedAppointment.id
            ? {
                ...appointment,
                status,
              }
            : appointment,
        ),
      );

      Alert.alert(
        status === 'in_progress' ? 'Consultation live' : 'Consultation completed',
        status === 'in_progress'
          ? `${selectedAppointment.pet.name}'s consultation is now in progress.`
          : 'The appointment was marked complete.',
      );

      return status === 'in_progress' ? roomId : null;
    } catch (error: any) {
      console.error('Error updating appointment status:', error);
      Alert.alert('Update failed', String(error?.message || 'Could not update the consultation.'));
      return null;
    } finally {
      setStatusLoading(false);
    }
  };

  const handleAnswerCall = async () => {
    if (!selectedAppointment) return;

    const roomId =
      selectedAppointment.status === 'in_progress'
        ? selectedAppointment.call_room_id
        : await updateAppointmentStatus('in_progress');

    if (!roomId) return;

    router.push({
      pathname: '/call' as any,
      params: {
        appointmentId: selectedAppointment.id,
        roomId,
        role: 'vet',
        vetName: vet?.name || 'Veterinarian',
        petName: selectedAppointment.pet.name,
      },
    });
  };

  const handleSendMessage = async () => {
    if (!selectedAppointment || !chatInput.trim() || chatLoading) return;

    const backendUrl = process.env.EXPO_PUBLIC_BACKEND_API_URL;
    if (!backendUrl) {
      setChatError('Missing backend URL. Set EXPO_PUBLIC_BACKEND_API_URL in the app environment.');
      return;
    }

    const userMessage = chatInput.trim();
    setMessages((current) => [...current, { id: `vet-${Date.now()}`, sender: 'vet', text: userMessage }]);
    setChatInput('');
    setChatLoading(true);
    setChatError(null);

    try {
      const response = await fetch(`${backendUrl}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'vet',
          message: userMessage,
          context: {
            veterinarian: {
              id: vet?.id ?? vetId,
              name: vet?.name ?? null,
              clinic_name: vet?.clinic_name ?? null,
            },
            appointment: {
              id: selectedAppointment.id,
              scheduled_at: selectedAppointment.scheduled_at,
              status: selectedAppointment.status,
              call_type: selectedAppointment.call_type,
              call_room_id: selectedAppointment.call_room_id,
            },
            owner: selectedAppointment.owner,
            pet: selectedAppointment.pet,
            pet_snapshot: selectedAppointment.pet_snapshot_json,
            recent_checks: healthChecks,
            recent_logs: healthLogs,
            consultation_notes: {
              summary: consultationSummary.trim() || null,
              diagnosis: consultationDiagnosis.trim() || null,
            },
          },
        }),
      });

      const raw = await response.text();
      let parsed: any = null;
      try {
        parsed = raw ? JSON.parse(raw) : null;
      } catch {
        parsed = raw;
      }

      if (!response.ok) {
        const detail =
          (typeof parsed === 'object' && (parsed?.detail || parsed?.error || parsed?.message)) ||
          (typeof parsed === 'string' ? parsed : null) ||
          `Failed to query PawPal (HTTP ${response.status}).`;
        throw new Error(detail);
      }

      const reply =
        (typeof parsed === 'object' && typeof parsed?.response === 'string' ? parsed.response : '') ||
        'PawPal did not return a response.';

      setMessages((current) => [...current, { id: `assistant-${Date.now()}`, sender: 'assistant', text: reply.trim() }]);
    } catch (error: any) {
      const detail = String(error?.message || 'PawPal could not answer right now.');
      setChatError(detail);
      setMessages((current) => [
        ...current,
        { id: `assistant-error-${Date.now()}`, sender: 'assistant', text: `I could not answer that just now. ${detail}` },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading consultations...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {
        setRefreshing(true);
        fetchAppointments();
      }} />}
    >
      <Text style={styles.title}>Consultations</Text>
      <Text style={styles.subtitle}>Answer owner calls, review history, and query PawPal with client context.</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Queue</Text>
        {appointments.length === 0 ? (
          <Text style={styles.mutedText}>No owner consultation requests are available.</Text>
        ) : (
          appointments.map((appointment) => {
            const meta = statusMeta(appointment.status);
            const selected = appointment.id === selectedAppointmentId;

            return (
              <TouchableOpacity
                key={appointment.id}
                style={[styles.card, selected && styles.selectedCard]}
                onPress={() => setSelectedAppointmentId(appointment.id)}
                activeOpacity={0.85}
              >
                <View style={styles.rowBetween}>
                  <View>
                    <Text style={styles.cardTitle}>{appointment.pet.name}</Text>
                    <Text style={styles.cardMeta}>Owner: {appointment.owner.name || 'Unknown owner'}</Text>
                    <Text style={styles.cardMeta}>{formatDateTime(appointment.scheduled_at)}</Text>
                  </View>
                  <View style={[styles.pill, { backgroundColor: meta.tint }]}>
                    <Text style={[styles.pillText, { color: meta.tone }]}>{meta.label}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>

      {selectedAppointment ? (
        <>
          <View style={styles.section}>
            <View style={styles.rowBetween}>
              <Text style={styles.sectionTitle}>Active consultation</Text>
              <View style={[styles.pill, { backgroundColor: statusMeta(selectedAppointment.status).tint }]}>
                <Text style={[styles.pillText, { color: statusMeta(selectedAppointment.status).tone }]}>
                  {statusMeta(selectedAppointment.status).label}
                </Text>
              </View>
            </View>

            <View style={styles.identityRow}>
              {selectedAppointment.pet.profile_photo_url ? (
                <Image source={{ uri: selectedAppointment.pet.profile_photo_url }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Ionicons name="paw" size={24} color={Colors.primary.brown} />
                </View>
              )}
              <View style={styles.identityText}>
                <Text style={styles.cardTitle}>{selectedAppointment.pet.name}</Text>
                <Text style={styles.cardMeta}>
                  {selectedAppointment.pet.species}
                  {selectedAppointment.pet.breed ? ` · ${selectedAppointment.pet.breed}` : ''}
                </Text>
                <Text style={styles.cardMeta}>Owner: {selectedAppointment.owner.name || 'Unknown owner'}</Text>
                <Text style={styles.cardMeta}>Phone: {selectedAppointment.owner.phone_number || 'No phone saved'}</Text>
                <Text style={styles.cardMeta}>Room: {selectedAppointment.call_room_id || 'Pending room ID'}</Text>
              </View>
            </View>

            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[styles.primaryButton, statusLoading && styles.buttonDisabled]}
                onPress={() => {
                  void handleAnswerCall();
                }}
                disabled={statusLoading || selectedAppointment.status === 'completed'}
              >
                <Text style={styles.primaryButtonText}>
                  {selectedAppointment.status === 'in_progress' ? 'Consultation live' : 'Answer call'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.secondaryButton, statusLoading && styles.buttonDisabled]}
                onPress={() => {
                  void updateAppointmentStatus('completed');
                }}
                disabled={statusLoading}
              >
                <Text style={styles.secondaryButtonText}>Mark complete</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Patient context</Text>
            {selectedAppointment.pet_snapshot_json ? (
              <Text style={styles.bodyText}>
                Snapshot concerns: {selectedAppointment.pet_snapshot_json.recent_logs_summary?.recent_abnormalities?.join(', ') || 'none recorded'}.
              </Text>
            ) : null}
            <Text style={styles.bodyText}>
              Latest saved checks: {healthChecks.length}. Latest saved logs: {healthLogs.length}.
            </Text>
            {selectedAppointment.pet.existing_conditions?.length ? (
              <Text style={styles.bodyText}>
                Existing conditions: {selectedAppointment.pet.existing_conditions.join(', ')}.
              </Text>
            ) : null}
            {selectedAppointment.pet.notes ? <Text style={styles.bodyText}>Owner notes: {selectedAppointment.pet.notes}</Text> : null}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent health history</Text>
            {detailLoading ? (
              <View style={styles.inlineRow}>
                <ActivityIndicator size="small" color={Colors.primary.orangeDark} />
                <Text style={styles.mutedText}>Loading patient history...</Text>
              </View>
            ) : (
              <>
                <Text style={styles.subsection}>Checks</Text>
                {healthChecks.length === 0 ? (
                  <Text style={styles.mutedText}>No recent scan results saved.</Text>
                ) : (
                  healthChecks.slice(0, 6).map((check) => (
                    <View key={check.id} style={styles.listRow}>
                      <Text style={styles.listTitle}>
                        {check.check_type}
                        {check.score != null ? ` · ${Math.round(Number(check.score))}/100` : ''}
                      </Text>
                      <Text style={styles.listMeta}>{formatDateTime(check.created_at)}</Text>
                    </View>
                  ))
                )}

                <Text style={styles.subsection}>Logs</Text>
                {healthLogs.length === 0 ? (
                  <Text style={styles.mutedText}>No recent care logs saved.</Text>
                ) : (
                  healthLogs.slice(0, 6).map((log) => (
                    <View key={log.id} style={styles.listRow}>
                      <Text style={styles.listTitle}>{summarizeLog(log)}</Text>
                      <Text style={styles.listMeta}>{formatDateTime(log.logged_at)}</Text>
                    </View>
                  ))
                )}
              </>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Consultation notes</Text>
            <TextInput
              style={[styles.input, styles.largeInput]}
              multiline
              value={consultationSummary}
              onChangeText={setConsultationSummary}
              placeholder="Summary for the owner"
              placeholderTextColor={Colors.neutral.textLight}
            />
            <TextInput
              style={styles.input}
              multiline
              value={consultationDiagnosis}
              onChangeText={setConsultationDiagnosis}
              placeholder="Clinical assessment or follow-up"
              placeholderTextColor={Colors.neutral.textLight}
            />
            <TouchableOpacity
              style={[styles.primaryButton, savingNote && styles.buttonDisabled]}
              onPress={() => {
                void saveConsultationNote(true);
              }}
              disabled={savingNote}
            >
              <Text style={styles.primaryButtonText}>{savingNote ? 'Saving...' : 'Save notes'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>PawPal for vets</Text>
            <Text style={styles.bodyText}>
              PawPal receives the selected owner, pet, recent checks, recent logs, and your current notes for context-aware queries.
            </Text>
            {messages.map((message) => (
              <View key={message.id} style={[styles.messageBubble, message.sender === 'vet' ? styles.vetBubble : styles.assistantBubble]}>
                <Text style={[styles.messageText, message.sender === 'vet' ? styles.vetBubbleText : styles.assistantBubbleText]}>
                  {message.text}
                </Text>
              </View>
            ))}
            {chatError ? <Text style={styles.errorText}>{chatError}</Text> : null}
            <View style={styles.chatRow}>
              <TextInput
                style={styles.chatInput}
                value={chatInput}
                onChangeText={setChatInput}
                placeholder="Ask PawPal about this client's history..."
                placeholderTextColor={Colors.neutral.textLight}
                editable={!chatLoading}
              />
              <TouchableOpacity
                style={[styles.chatButton, (!chatInput.trim() || chatLoading) && styles.buttonDisabled]}
                onPress={handleSendMessage}
                disabled={!chatInput.trim() || chatLoading}
              >
                {chatLoading ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="arrow-up" size={18} color="#FFF" />}
              </TouchableOpacity>
            </View>
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral.background,
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.neutral.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: Colors.neutral.textLight,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: Colors.primary.brown,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.neutral.textLight,
    marginBottom: 18,
  },
  section: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.neutral.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primary.brown,
    marginBottom: 12,
  },
  subsection: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary.brown,
    marginTop: 8,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  mutedText: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.neutral.textLight,
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.neutral.text,
    marginBottom: 8,
  },
  card: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.neutral.border,
    marginBottom: 12,
    backgroundColor: '#FAFBFC',
  },
  selectedCard: {
    borderColor: '#2563EB',
    backgroundColor: '#F4F8FF',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-start',
  },
  identityRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  identityText: {
    flex: 1,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 18,
  },
  avatarFallback: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: '#F4E7D9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primary.brown,
    marginBottom: 4,
  },
  cardMeta: {
    fontSize: 13,
    lineHeight: 18,
    color: Colors.neutral.textLight,
  },
  pill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  primaryButton: {
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: Colors.primary.brown,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 6,
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: '#FFF4E7',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#E7D0B3',
  },
  secondaryButtonText: {
    color: Colors.primary.brown,
    fontSize: 15,
    fontWeight: '800',
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  listRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1F4',
  },
  listTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary.brown,
    textTransform: 'capitalize',
    marginBottom: 4,
  },
  listMeta: {
    fontSize: 12,
    color: Colors.neutral.textLight,
  },
  input: {
    minHeight: 92,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.neutral.border,
    backgroundColor: '#FAFBFC',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.primary.brown,
    textAlignVertical: 'top',
    marginBottom: 10,
  },
  largeInput: {
    minHeight: 120,
  },
  messageBubble: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 10,
  },
  assistantBubble: {
    backgroundColor: '#F6F8FB',
    alignSelf: 'flex-start',
  },
  vetBubble: {
    backgroundColor: Colors.primary.brown,
    alignSelf: 'flex-end',
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  assistantBubbleText: {
    color: Colors.primary.brown,
  },
  vetBubbleText: {
    color: '#FFF',
  },
  errorText: {
    marginTop: 10,
    fontSize: 13,
    color: '#A22C2C',
    fontWeight: '600',
  },
  chatRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  chatInput: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.neutral.border,
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    fontSize: 14,
    color: Colors.primary.brown,
  },
  chatButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
