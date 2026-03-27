import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useNavigation, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { buildBackendUrl, formatBackendRequestError, getBackendConfigurationError } from '@/lib/backend';
import { usePet } from '@/context/PetContext';

const initialMessages = [
  { id: '1', text: "Woof! I'm PawPal.\nAsk me anything about your pet's health!", sender: 'bot' },
];

type PetProfileContext = {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  gender: string | null;
  date_of_birth: string | null;
  weight_kg: number | null;
  profile_photo_url: string | null;
  existing_conditions: string[] | null;
  is_neutered: boolean | null;
  microchip_id: string | null;
  notes: string | null;
  updated_at: string | null;
};

const buildStarterMessage = (petName?: string | null) => {
  if (petName) {
    return `Woof! I'm PawPal.\nAsk me anything about ${petName}'s health!`;
  }

  return "Woof! I'm PawPal.\nAsk me anything about your pet's health!";
};

type HealthCheckContext = {
  id: string;
  check_type: string;
  score: number | null;
  confidence: number | null;
  status: string;
  analysis_json: Record<string, unknown> | null;
  image_url: string;
  created_at: string;
};

type HealthLogContext = {
  id: string;
  log_type: string;
  log_data: Record<string, unknown> | null;
  logged_at: string;
};

const truncateContextText = (value: string, maxLength = 180) => {
  const normalized = value.trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxLength - 14)).trimEnd()}...`;
};

const formatOwnerCheckSummary = (check: HealthCheckContext) => {
  const scoreText = check.score != null ? `${Math.round(check.score)}/100` : 'no score';
  const details =
    typeof check.analysis_json?.feedback === 'string' && check.analysis_json.feedback.trim()
      ? ` Notes: ${truncateContextText(check.analysis_json.feedback.trim(), 120)}`
      : '';
  return `${check.check_type}: ${scoreText}.${details}`;
};

const buildOwnerContextSummary = ({
  petProfile,
  latestHealthScreenings,
  latestHealthLogs,
}: {
  petProfile: PetProfileContext | null;
  latestHealthScreenings: HealthCheckContext[];
  latestHealthLogs: HealthLogContext[];
}) => {
  if (!petProfile) {
    return 'No pet profile is currently available.';
  }

  const lines = [
    `Selected pet name: ${petProfile.name}.`,
    `Species: ${petProfile.species}.`,
  ];

  if (petProfile.breed) {
    lines.push(`Breed: ${petProfile.breed}.`);
  }

  if (petProfile.weight_kg != null) {
    lines.push(`Weight: ${petProfile.weight_kg} kg.`);
  }

  if (petProfile.gender) {
    lines.push(`Gender: ${petProfile.gender}.`);
  }

  if (petProfile.existing_conditions?.length) {
    lines.push(`Existing conditions: ${truncateContextText(petProfile.existing_conditions.join(', '), 140)}.`);
  }

  if (petProfile.notes) {
    lines.push(`Profile notes: ${truncateContextText(petProfile.notes, 180)}.`);
  }

  if (latestHealthScreenings.length) {
    lines.push(
      'Latest completed health screenings: '
      + latestHealthScreenings
        .slice(0, 5)
        .map(formatOwnerCheckSummary)
        .join(' '),
    );
  } else {
    lines.push('No completed health screenings are saved yet.');
  }

  if (latestHealthLogs.length) {
    const recentLogSummaries = latestHealthLogs.slice(0, 3).map((log) => {
      const logData =
        log.log_data && Object.keys(log.log_data).length > 0
          ? truncateContextText(JSON.stringify(log.log_data), 140)
          : 'no extra details';
      return `${log.log_type} on ${new Date(log.logged_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })}: ${logData}`;
    });
    lines.push(`Recent health logs: ${recentLogSummaries.join(' ')}`);
  }

  return lines.join(' ');
};

const buildOwnerGroundedPrompt = (
  question: string,
  ownerContext: Record<string, unknown> | null,
) => {
  const trimmedQuestion = question.trim();
  if (!trimmedQuestion) {
    return '';
  }

  if (!ownerContext) {
    return trimmedQuestion;
  }

  return trimmedQuestion;
};

const extractTeleVetCta = (rawText: string) => {
  const markerPattern = /\n?TELEVET_CTA:\s*true\s*$/i;
  const showTeleVetCta = markerPattern.test(rawText) || /tele-vet support/i.test(rawText);
  const text = rawText.replace(markerPattern, '').trim();
  return {
    text,
    showTeleVetCta,
  };
};

type ChatMessage = {
  id: string;
  text: string;
  sender: 'bot' | 'user';
  showTeleVetCta?: boolean;
};

export default function ChatScreen() {
  const [inputText, setInputText] = useState('');
  const { activePet } = usePet();
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      ...initialMessages[0],
      text: buildStarterMessage(activePet?.id && activePet.id !== 'default' ? activePet.name : null),
    },
  ]);
  const [isSending, setIsSending] = useState(false);
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
      tabBarStyle: { display: 'none' },
    });

    return () => {
      navigation.setOptions({
        headerShown: true,
        tabBarStyle: {
          backgroundColor: Colors.primary.orange,
          position: 'absolute',
          bottom: 25,
          left: 20,
          right: 20,
          height: 65,
          borderRadius: 35,
          borderTopWidth: 0,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.15,
          elevation: 5,
        },
      });
    };
  }, [navigation]);

  useEffect(() => {
    const starterText = buildStarterMessage(
      activePet?.id && activePet.id !== 'default' ? activePet.name : null,
    );

    setMessages((current) => {
      if (current.length === 1 && current[0]?.id === '1') {
        return [{ ...current[0], text: starterText }];
      }

      return current;
    });
  }, [activePet?.id, activePet?.name]);

  const buildOwnerChatContext = useCallback(async () => {
    if (!activePet?.id || activePet.id === 'default') {
      return {
        active_pet_id: null,
        active_pet_name: activePet?.name ?? null,
        pet_profile: null,
        latest_health_screenings: [],
        latest_health_logs: [],
        latest_screenings_by_type: {},
        context_summary: 'No active pet is currently selected.',
        context_note: 'No active pet is currently selected.',
      };
    }

    const [petResult, healthChecksResult, healthLogsResult] = await Promise.all([
      supabase
        .from('pets')
        .select(
          'id, name, species, breed, gender, date_of_birth, weight_kg, profile_photo_url, existing_conditions, is_neutered, microchip_id, notes, updated_at',
        )
        .eq('id', activePet.id)
        .single<PetProfileContext>(),
      supabase
        .from('health_checks')
        .select('id, check_type, score, confidence, status, analysis_json, image_url, created_at')
        .eq('pet_id', activePet.id)
        .eq('status', 'complete')
        .order('created_at', { ascending: false })
        .limit(12),
      supabase
        .from('health_logs')
        .select('id, log_type, log_data, logged_at')
        .eq('pet_id', activePet.id)
        .order('logged_at', { ascending: false })
        .limit(10),
    ]);

    if (petResult.error) {
      throw petResult.error;
    }

    if (healthChecksResult.error) {
      throw healthChecksResult.error;
    }

    if (healthLogsResult.error) {
      throw healthLogsResult.error;
    }

    const latestHealthScreenings = (healthChecksResult.data ?? []) as HealthCheckContext[];
    const latestHealthLogs = (healthLogsResult.data ?? []) as HealthLogContext[];
    const latestScreeningsByType = latestHealthScreenings.reduce<Record<string, HealthCheckContext>>((acc, check) => {
      if (!acc[check.check_type]) {
        acc[check.check_type] = check;
      }
      return acc;
    }, {});
    const petProfile = petResult.data;
    const contextSummary = buildOwnerContextSummary({
      petProfile,
      latestHealthScreenings,
      latestHealthLogs,
    });

    return {
      active_pet_id: activePet.id,
      active_pet_name: activePet.name,
      pet_profile: petProfile,
      latest_health_screenings: latestHealthScreenings,
      latest_health_logs: latestHealthLogs,
      latest_screenings_by_type: latestScreeningsByType,
      context_summary: contextSummary,
      context_note: latestHealthScreenings.length
        ? 'Use the pet profile and latest completed screenings as the current source of truth.'
        : 'Use the pet profile as the current source of truth. No completed health screenings are saved yet.',
    };
  }, [activePet?.id, activePet?.name]);

  const sendPrompt = async (prompt: string) => {
    const trimmed = prompt.trim();
    if (!trimmed || isSending) return;

    const userMsg = { id: Date.now().toString(), text: trimmed, sender: 'user' as const };
    setMessages((prev) => [...prev, userMsg]);
    setIsSending(true);

    let chatUrl: string | null = null;

    try {
      let ownerContext: Record<string, unknown> | null = null;
      try {
        ownerContext = await buildOwnerChatContext();
      } catch (contextError) {
        console.error('Failed to build owner chat context:', contextError);
        ownerContext = {
          active_pet_id: activePet?.id ?? null,
          active_pet_name: activePet?.name ?? null,
          pet_profile: null,
          latest_health_screenings: [],
          latest_health_logs: [],
          latest_screenings_by_type: {},
          context_summary: activePet?.name
            ? `Selected pet name: ${activePet.name}. Full pet context could not be loaded before this request.`
            : 'The latest pet context could not be loaded before this request.',
          context_note: 'The latest pet context could not be loaded before this request.',
        };
      }

      const groundedPrompt = buildOwnerGroundedPrompt(trimmed, ownerContext);

      chatUrl = buildBackendUrl('/chat');
      if (!chatUrl) {
        throw new Error(getBackendConfigurationError());
      }

      const response = await fetch(chatUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'owner',
          message: groundedPrompt,
          context: ownerContext,
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

      const parsedBotReply = extractTeleVetCta(typeof parsed?.response === 'string' ? parsed.response : '');
      const botMsg = {
        id: `${Date.now()}-bot`,
        text: parsedBotReply.text || 'No response returned.',
        sender: 'bot' as const,
        showTeleVetCta: parsedBotReply.showTeleVetCta,
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (error) {
      const detail = formatBackendRequestError(error, chatUrl);
      const errorMsg = {
        id: `${Date.now()}-offline`,
        text: detail,
        sender: 'bot' as const,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsSending(false);
    }
};

  const sendMessage = async () => {
    const trimmed = inputText.trim();
    if (!trimmed || isSending) return;
    setInputText('');
    await sendPrompt(trimmed);
  };

  const handleBack = () => {
    router.push('/');
  };

  const handleOpenTeleVet = () => {
    router.push({
      pathname: '/(tabs)/health',
      params: { focus: 'televet' },
    });
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#F7EADB', '#F4E9DE']}
        style={[styles.customHeader, { paddingTop: insets.top + 14 }]}
      >
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={Colors.primary.brown} />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <View style={styles.headerAvatar}>
            <Ionicons name="sparkles-outline" size={18} color={Colors.primary.brown} />
          </View>
          <View>
            <Text style={styles.headerTitle}>PawPal AI</Text>
            <View style={styles.statusRow}>
              <View style={styles.onlineBadge} />
              <Text style={styles.statusText}>Ready to help</Text>
            </View>
          </View>
        </View>

        <View style={styles.headerSpacer} />
      </LinearGradient>

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={[styles.messageRow, item.sender === 'user' ? styles.userRow : styles.botRow]}>
              {item.sender === 'bot' ? <View style={styles.botAvatar}>
                <Ionicons name="paw-outline" size={16} color={Colors.primary.brown} />
              </View> : null}
              <View style={styles.messageContent}>
                <View style={[styles.msgBox, item.sender === 'user' ? styles.userMsg : styles.botMsg]}>
                  <Text style={[styles.msgText, item.sender === 'user' ? styles.userText : styles.botText]}>
                    {item.text}
                  </Text>
                </View>
                {item.sender === 'bot' && item.showTeleVetCta ? (
                  <TouchableOpacity
                    style={styles.teleVetCtaButton}
                    onPress={handleOpenTeleVet}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="videocam-outline" size={16} color="#FFF9F2" />
                    <Text style={styles.teleVetCtaText}>Open Tele-vet support</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          )}
        />

        <View style={[styles.composerShell, { paddingBottom: Math.max(insets.bottom, 10) }]}>
          <View style={styles.composerCard}>
            <TextInput
              style={styles.input}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Ask PawPal anything..."
              placeholderTextColor="#9D8F84"
              multiline={false}
              editable={!isSending}
              returnKeyType="send"
              onSubmitEditing={sendMessage}
            />

            <TouchableOpacity
              style={[
                styles.sendBtn,
                (!inputText.trim() || isSending) && styles.sendBtnDisabled,
              ]}
              onPress={sendMessage}
              disabled={isSending || !inputText.trim()}
              activeOpacity={0.85}
            >
              {isSending ? (
                <ActivityIndicator size="small" color="#FFF9F2" />
              ) : (
                <Ionicons name="arrow-up" size={18} color="#FFF9F2" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F4ED',
  },
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E8DCCD',
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EADDCF',
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginLeft: 12,
  },
  headerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: '#FFF7EE',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EADDCF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primary.brown,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  statusText: {
    fontSize: 12,
    color: Colors.neutral.textLight,
    fontWeight: '600',
  },
  onlineBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.health.excellent,
  },
  headerSpacer: {
    width: 42,
  },
  keyboardContainer: {
    flex: 1,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 24,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 14,
    alignItems: 'flex-end',
  },
  botRow: {
    alignSelf: 'flex-start',
  },
  userRow: {
    alignSelf: 'flex-end',
  },
  botAvatar: {
    width: 30,
    height: 30,
    borderRadius: 12,
    backgroundColor: '#F3E5D6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 6,
  },
  messageContent: {
    maxWidth: '82%',
  },
  msgBox: {
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
  },
  userMsg: {
    backgroundColor: Colors.primary.brown,
    borderColor: Colors.primary.brown,
  },
  botMsg: {
    backgroundColor: '#FFF9F3',
    borderColor: '#EADDCF',
  },
  msgText: {
    fontSize: 16,
    lineHeight: 22,
    paddingHorizontal: 15,
    paddingVertical: 13,
  },
  userText: {
    color: '#FFF9F2',
  },
  botText: {
    color: Colors.primary.brown,
  },
  teleVetCtaButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primary.brown,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  teleVetCtaText: {
    color: '#FFF9F2',
    fontSize: 13,
    fontWeight: '700',
  },
  composerShell: {
    paddingHorizontal: 14,
    paddingTop: 10,
    backgroundColor: 'transparent',
  },
  composerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9F3',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#EADDCF',
    paddingLeft: 16,
    paddingRight: 10,
    paddingTop: 12,
    paddingBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  input: {
    flex: 1,
    fontSize: 16,
    lineHeight: 20,
    color: Colors.primary.brown,
    height: 44,
    paddingTop: 0,
    paddingBottom: 0,
    paddingRight: 12,
    textAlignVertical: 'center',
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.primary.brown,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 0,
  },
  sendBtnDisabled: {
    backgroundColor: '#C6B9AF',
  },
});
