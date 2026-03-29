import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Alert, ActivityIndicator, Modal, TextInput } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { buildBackendUrl, formatBackendRequestError, getBackendConfigurationError } from '@/lib/backend';
import { usePet } from '@/context/PetContext';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';

const Card = ({ children, style, ...rest }: any) => <View style={[styles.card, style]} {...rest}>{children}</View>;
type HealthCheckType = 'coat' | 'fit' | 'teeth' | 'poop' | 'face';
const CHECK_TYPES: HealthCheckType[] = ['coat', 'fit', 'teeth', 'poop', 'face'];
const CHECK_TYPE_META: Record<HealthCheckType, { label: string; icon: string; color: string }> = {
  coat: { label: 'Coat and skin', icon: 'paw', color: '#E18335' },
  fit: { label: 'Body condition', icon: 'fitness', color: '#3D78C2' },
  teeth: { label: 'Teeth and gums', icon: 'happy', color: '#C86F2D' },
  poop: { label: 'Digestive check', icon: 'water', color: '#2E9A8F' },
  face: { label: 'Mood and alertness', icon: 'eye', color: '#8D63C9' },
};

type HealthCheck = {
  id: string;
  check_type: string;
  score: number;
  created_at: string;
  analysis_json: any;
  confidence?: number;
};

type HealthLog = {
  id: string;
  log_type: string;
  log_data: any;
  logged_at: string;
};

type Veterinarian = {
  id: string;
  name: string;
  clinic_name: string;
  specializations: string[];
  profile_photo_url: string;
  rating: number;
  total_reviews: number;
  consultation_fee: number;
};

type TrendPoint = {
  id: string;
  value: number;
  shortDate: string;
  fullDate: string;
};

type TrendScale = {
  min: number;
  max: number;
  span: number;
};

const clampNumber = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const roundScaleDown = (value: number, step = 2) => Math.floor(value / step) * step;

const roundScaleUp = (value: number, step = 2) => Math.ceil(value / step) * step;

const getScoreTrendScale = (points: TrendPoint[]): TrendScale => {
  if (!points.length) {
    return { min: 0, max: 100, span: 100 };
  }

  const values = points.map((point) => point.value).filter((value) => Number.isFinite(value));
  if (!values.length) {
    return { min: 0, max: 100, span: 100 };
  }

  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const rawSpan = rawMax - rawMin;
  const padding = rawSpan < 4 ? 6 : rawSpan < 10 ? 5 : Math.max(4, Math.ceil(rawSpan * 0.3));
  const minSpan = rawSpan < 4 ? 16 : rawSpan < 10 ? 20 : Math.min(36, rawSpan + 12);

  let min = rawMin - padding;
  let max = rawMax + padding;

  if (max - min < minSpan) {
    const extra = (minSpan - (max - min)) / 2;
    min -= extra;
    max += extra;
  }

  if (min < 0) {
    max = Math.min(100, max + Math.abs(min));
    min = 0;
  }

  if (max > 100) {
    min = Math.max(0, min - (max - 100));
    max = 100;
  }

  min = clampNumber(roundScaleDown(min, 2), 0, 100);
  max = clampNumber(roundScaleUp(max, 2), 0, 100);

  if (max <= min) {
    min = Math.max(0, roundScaleDown(rawMin - 8, 2));
    max = Math.min(100, roundScaleUp(rawMax + 8, 2));
  }

  return {
    min,
    max,
    span: Math.max(max - min, 1),
  };
};

const formatTrendDelta = (delta: number | null, unitLabel: string) => {
  if (delta == null) return 'Need at least 2 entries';
  if (Math.abs(delta) < 0.1) return `Stable ${unitLabel}`;
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta.toFixed(1)} ${unitLabel} vs previous`;
};

const getTrendScoreStatus = (score: number | null) => {
  if (score == null) {
    return {
      label: 'No score yet',
      tone: '#8B7D72',
      tint: '#EFE6DC',
      note: 'Save at least one scan to assess this condition.',
    };
  }

  if (score < 50) {
    return {
      label: 'Vet review',
      tone: '#A14637',
      tint: '#FBE2DC',
      note: 'This score is low enough to justify a professional review soon.',
    };
  }

  if (score < 75) {
    return {
      label: 'Needs monitoring',
      tone: '#9A6A16',
      tint: '#FFF0C9',
      note: 'Keep tracking this condition closely over the next few checks.',
    };
  }

  return {
    label: 'Steady',
    tone: '#2B8A5A',
    tint: '#E6F5EB',
    note: 'Recent scores look stable for this condition.',
  };
};

const formatTrendDate = (value: string) =>
  new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

const formatTrendDateTime = (value: string) =>
  new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

const MiniTrendBars = ({
  values,
  color,
  maxScale,
}: {
  values: number[];
  color: string;
  maxScale?: number;
}) => {
  if (!values.length) {
    return <Text style={styles.trendEmptyText}>No trend data yet</Text>;
  }

  const maxValue = Math.max(maxScale ?? Math.max(...values, 1), 1);
  return (
    <View style={styles.trendBars}>
      {values.map((value, index) => {
        const boundedValue = Math.max(0, Math.min(value, maxValue));
        const heightPercent = Math.max(12, (boundedValue / maxValue) * 100);
        return (
          <View key={`${index}-${value}`} style={styles.trendBarTrack}>
            <View
              style={[
                styles.trendBarFill,
                {
                  height: `${heightPercent}%`,
                  backgroundColor: color,
                },
              ]}
            />
          </View>
        );
      })}
    </View>
  );
};

const AnnotatedTrendBars = ({
  points,
  color,
}: {
  points: TrendPoint[];
  color: string;
}) => {
  if (!points.length) {
    return <Text style={styles.trendEmptyText}>No trend data yet</Text>;
  }

  const scale = getScoreTrendScale(points);
  const scaleMid = Math.round(scale.min + scale.span / 2);

  return (
    <View>
      <View style={styles.annotatedTrendScaleRow}>
        <View
          style={[
            styles.annotatedTrendScalePill,
            {
              backgroundColor: `${color}16`,
              borderColor: `${color}38`,
            },
          ]}
        >
          <Text style={[styles.annotatedTrendScalePillText, { color }]}>{`Zoomed ${scale.min}-${scale.max}`}</Text>
        </View>
        <Text style={styles.annotatedTrendScaleText}>{`Low ${scale.min} | Mid ${scaleMid} | High ${scale.max}`}</Text>
      </View>

      <View style={styles.annotatedTrendWrap}>
        {points.map((point, index) => {
          const boundedValue = clampNumber(point.value, scale.min, scale.max);
          const normalizedValue = (boundedValue - scale.min) / scale.span;
          const heightPercent = Math.max(16, normalizedValue * 100);
          const isLatest = index === points.length - 1;

          return (
            <View key={point.id} style={styles.annotatedTrendColumn}>
              <View style={[styles.annotatedTrendScorePill, isLatest && styles.annotatedTrendScorePillLatest]}>
                <Text style={[styles.annotatedTrendScoreText, isLatest && styles.annotatedTrendScoreTextLatest]}>
                  {Math.round(point.value)}
                </Text>
              </View>
              <View style={styles.annotatedTrendTrack}>
                <View
                  style={[
                    styles.annotatedTrendFill,
                    {
                      height: `${heightPercent}%`,
                      backgroundColor: color,
                    },
                  ]}
                />
              </View>
              <Text style={styles.annotatedTrendDate} numberOfLines={1}>
                {point.shortDate}
              </Text>
              <Text style={styles.annotatedTrendDateHint} numberOfLines={1}>
                {isLatest ? 'Latest' : `#${index + 1}`}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

type MarkdownPart = {
  text: string;
  bold?: boolean;
  italic?: boolean;
};

const parseInlineMarkdown = (text: string): MarkdownPart[] => {
  const tokenPattern = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  const parts: MarkdownPart[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(tokenPattern)) {
    const token = match[0];
    const index = match.index ?? 0;
    if (index > lastIndex) {
      parts.push({ text: text.slice(lastIndex, index) });
    }

    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push({ text: token.slice(2, -2), bold: true });
    } else if (token.startsWith('*') && token.endsWith('*')) {
      parts.push({ text: token.slice(1, -1), italic: true });
    } else {
      parts.push({ text: token });
    }

    lastIndex = index + token.length;
  }

  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex) });
  }

  return parts.length > 0 ? parts : [{ text }];
};

const renderInlineMarkdownText = (text: string, keyPrefix: string, baseStyle: any) => {
  const parts = parseInlineMarkdown(text);
  return (
    <Text style={baseStyle}>
      {parts.map((part, index) => (
        <Text
          key={`${keyPrefix}-${index}`}
          style={[
            part.bold ? styles.mdBold : null,
            part.italic ? styles.mdItalic : null,
          ]}
        >
          {part.text}
        </Text>
      ))}
    </Text>
  );
};

const renderMarkdownContent = (markdown: string) => {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');

  return lines.map((line, index) => {
    const trimmed = line.trim();
    const key = `md-line-${index}`;

    if (!trimmed) {
      return <View key={key} style={styles.mdSpacer} />;
    }

    if (/^-{3,}$/.test(trimmed)) {
      return <View key={key} style={styles.mdRule} />;
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const headingText = headingMatch[2];
      const headingStyle =
        level <= 1
          ? styles.mdHeading1
          : level === 2
            ? styles.mdHeading2
            : styles.mdHeading3;

      return (
        <View key={key} style={styles.mdBlock}>
          {renderInlineMarkdownText(headingText, `${key}-heading`, headingStyle)}
        </View>
      );
    }

    const unorderedListMatch = trimmed.match(/^[-*]\s+(.*)$/);
    if (unorderedListMatch) {
      return (
        <View key={key} style={styles.mdListItemRow}>
          <Text style={styles.mdListBullet}>{'\u2022'}</Text>
          {renderInlineMarkdownText(unorderedListMatch[1], `${key}-ul`, styles.mdListItemText)}
        </View>
      );
    }

    const orderedListMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (orderedListMatch) {
      return (
        <View key={key} style={styles.mdListItemRow}>
          <Text style={styles.mdListBullet}>{`${orderedListMatch[1]}.`}</Text>
          {renderInlineMarkdownText(orderedListMatch[2], `${key}-ol`, styles.mdListItemText)}
        </View>
      );
    }

    return (
      <View key={key} style={styles.mdBlock}>
        {renderInlineMarkdownText(trimmed, `${key}-p`, styles.mdParagraph)}
      </View>
    );
  });
};

export default function HealthScreen() {
  const { activePet } = usePet();
  const { focus } = useLocalSearchParams<{ focus?: string }>();
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView | null>(null);
  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([]);
  const [healthLogs, setHealthLogs] = useState<HealthLog[]>([]);
  const [veterinarians, setVeterinarians] = useState<Veterinarian[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingMockData, setUsingMockData] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [insightQuestion, setInsightQuestion] = useState('');
  const [insightResponse, setInsightResponse] = useState('');
  const [insightError, setInsightError] = useState<string | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [startingConsultation, setStartingConsultation] = useState(false);
  const [teleVetCardY, setTeleVetCardY] = useState<number | null>(null);

  const fetchHealthData = useCallback(async () => {
    if (!activePet?.id || activePet.id === 'default') return;

    setLoading(true);
    try {
      const trendWindowStart = new Date();
      trendWindowStart.setDate(trendWindowStart.getDate() - 30);

      const { data: checksData, error: checksError } = await supabase
        .from('health_checks')
        .select('*')
        .eq('pet_id', activePet.id)
        .eq('status', 'complete')
        .gte('created_at', trendWindowStart.toISOString())
        .order('created_at', { ascending: false });

      const { data: logsData, error: logsError } = await supabase
        .from('health_logs')
        .select('*')
        .eq('pet_id', activePet.id)
        .gte('logged_at', trendWindowStart.toISOString())
        .order('logged_at', { ascending: false })
        .limit(120);

      const { data: vetsData, error: vetsError } = await supabase
        .from('veterinarians')
        .select('*')
        .eq('is_active', true)
        .order('rating', { ascending: false })
        .limit(1);

      if (!checksError && checksData) setHealthChecks(checksData);
      if (!logsError && logsData) setHealthLogs(logsData);
      if (!vetsError && vetsData) setVeterinarians(vetsData);

      const hasData =
        (checksData && checksData.length > 0) ||
        (logsData && logsData.length > 0) ||
        (vetsData && vetsData.length > 0);

      setUsingMockData(!hasData);
    } catch (error) {
      console.error('Error fetching health data:', error);
      setUsingMockData(true);
    } finally {
      setLoading(false);
    }
  }, [activePet?.id]);

  useEffect(() => {
    if (activePet?.id && activePet.id !== 'default') {
      fetchHealthData();
    } else {
      setUsingMockData(true);
      setLoading(false);
    }
  }, [activePet?.id, fetchHealthData]);

  useFocusEffect(
    useCallback(() => {
      if (activePet?.id && activePet.id !== 'default') {
        fetchHealthData();
      }
    }, [activePet?.id, fetchHealthData]),
  );

  useEffect(() => {
    setInsightQuestion('');
    setInsightResponse('');
    setInsightError(null);
    setInsightLoading(false);
  }, [activePet?.id]);

  useEffect(() => {
    if (focus === 'televet' && teleVetCardY != null && !loading) {
      scrollViewRef.current?.scrollTo({
        y: Math.max(teleVetCardY - 20, 0),
        animated: true,
      });
    }
  }, [focus, loading, teleVetCardY]);

  const overallScore = useMemo(() => {
    if (healthChecks.length === 0) return 92;
    const validScores = healthChecks.filter((c) => c.score != null).map((c) => c.score);
    if (validScores.length === 0) return 92;
    return Math.round(validScores.reduce((sum, score) => sum + score, 0) / validScores.length);
  }, [healthChecks]);

  const healthStatus = useMemo(() => {
    if (overallScore >= 90) return { title: 'Looking strong', color: Colors.health.excellent };
    if (overallScore >= 75) return { title: 'Generally steady', color: Colors.health.good };
    if (overallScore >= 60) return { title: 'Worth checking', color: Colors.health.fair };
    return { title: 'Needs closer attention', color: Colors.health.poor };
  }, [overallScore]);

  const currentVet = useMemo(() => {
    if (veterinarians.length > 0) return veterinarians[0];
    return {
      id: 'mock',
      name: 'Dr. Sarah Smith',
      clinic_name: 'Pawsitive Vet Clinic',
      specializations: ['General Practice'],
      profile_photo_url: 'https://i.pravatar.cc/150?u=vet',
      rating: 4.9,
      total_reviews: 120,
      consultation_fee: 25,
    };
  }, [veterinarians]);

  const latestWeightLog = useMemo(
    () => healthLogs.find((log) => log.log_type === 'biological' && (log.log_data?.weight ?? log.log_data?.weight_kg)),
    [healthLogs],
  );

  const latestActivityLog = useMemo(
    () => healthLogs.find((log) => log.log_type === 'activity'),
    [healthLogs],
  );

  const latestDietLog = useMemo(
    () => healthLogs.find((log) => log.log_type === 'diet'),
    [healthLogs],
  );

  const latestActivityDuration = latestActivityLog?.log_data?.duration_minutes ?? latestActivityLog?.log_data?.duration_min;
  const latestDietValue = latestDietLog?.log_data?.meal_type ?? latestDietLog?.log_data?.food_type ?? latestDietLog?.log_data?.notes;
  const latestWeightValue = latestWeightLog?.log_data?.weight ?? latestWeightLog?.log_data?.weight_kg;

  const careStats = useMemo(
    () => [
      {
        id: 'weight',
        icon: 'weight',
        title: 'Latest weight record',
        value: latestWeightValue
          ? `${latestWeightValue} kg`
          : activePet?.weight || 'Not logged',
        note: latestWeightLog
          ? `Logged ${new Date(latestWeightLog.logged_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}`
          : 'No saved weight record yet',
        tint: '#E8F1FF',
      },
      {
        id: 'activity',
        icon: 'run',
        title: 'Latest activity record',
        value: latestActivityDuration
          ? `${latestActivityDuration} min`
          : 'Not logged',
        note: latestActivityLog ? 'Pulled from the latest saved activity entry' : 'No saved activity record yet',
        tint: '#E8F6EE',
      },
      {
        id: 'diet',
        icon: 'restaurant-outline',
        title: 'Latest diet record',
        value: latestDietValue || 'No recent entry',
        note: latestDietLog ? 'Pulled from the latest saved diet entry' : 'No saved diet record yet',
        tint: '#FFF1E3',
      },
    ],
    [activePet?.weight, latestActivityDuration, latestActivityLog, latestDietLog, latestDietValue, latestWeightLog, latestWeightValue],
  );

  const checksByType = useMemo(() => {
    return CHECK_TYPES.map((type) => {
      const checks = healthChecks.filter((c) => c.check_type === type);
      return {
        type,
        label: CHECK_TYPE_META[type].label,
        icon: CHECK_TYPE_META[type].icon,
        check: checks[0] || null,
        checkCount: checks.length,
      };
    });
  }, [healthChecks]);

  const scanTrends = useMemo(
    () =>
      CHECK_TYPES.map((type) => {
        const points = healthChecks
          .filter((check) => check.check_type === type)
          .map((check) => ({
            id: check.id,
            value: Number(check.score),
            timestamp: new Date(check.created_at).getTime(),
            shortDate: formatTrendDate(check.created_at),
            fullDate: formatTrendDateTime(check.created_at),
          }))
          .filter((entry) => Number.isFinite(entry.value) && Number.isFinite(entry.timestamp))
          .sort((a, b) => a.timestamp - b.timestamp)
          .slice(-7)
          .map((entry) => ({
            id: entry.id,
            value: Number(entry.value.toFixed(1)),
            shortDate: entry.shortDate,
            fullDate: entry.fullDate,
          }));

        const latest = points.length > 0 ? points[points.length - 1].value : null;
        const previous = points.length > 1 ? points[points.length - 2].value : null;
        const delta = latest != null && previous != null ? Number((latest - previous).toFixed(1)) : null;
        const status = getTrendScoreStatus(latest);

        return {
          type,
          label: CHECK_TYPE_META[type].label,
          icon: CHECK_TYPE_META[type].icon,
          color: CHECK_TYPE_META[type].color,
          points,
          latest,
          delta,
          status,
          latestFullDate: points.length ? points[points.length - 1].fullDate : null,
        };
      }),
    [healthChecks],
  );

  const weightTrendValues = useMemo(
    () =>
      healthLogs
        .filter((log) => log.log_type === 'biological')
        .map((log) => ({
          value: Number(log.log_data?.weight ?? log.log_data?.weight_kg),
          timestamp: new Date(log.logged_at).getTime(),
        }))
        .filter((entry) => Number.isFinite(entry.value) && Number.isFinite(entry.timestamp))
        .sort((a, b) => a.timestamp - b.timestamp)
        .slice(-7)
        .map((entry) => Number(entry.value.toFixed(1))),
    [healthLogs],
  );

  const activityTrendValues = useMemo(
    () =>
      healthLogs
        .filter((log) => log.log_type === 'activity')
        .map((log) => ({
          value: Number(log.log_data?.duration_minutes ?? log.log_data?.duration_min),
          timestamp: new Date(log.logged_at).getTime(),
        }))
        .filter((entry) => Number.isFinite(entry.value) && Number.isFinite(entry.timestamp))
        .sort((a, b) => a.timestamp - b.timestamp)
        .slice(-7)
        .map((entry) => Number(entry.value.toFixed(1))),
    [healthLogs],
  );

  const latestWeightTrend = weightTrendValues.length > 0 ? weightTrendValues[weightTrendValues.length - 1] : null;
  const weightTrendDelta =
    weightTrendValues.length > 1
      ? Number((weightTrendValues[weightTrendValues.length - 1] - weightTrendValues[weightTrendValues.length - 2]).toFixed(1))
      : null;

  const latestActivityTrend = activityTrendValues.length > 0 ? activityTrendValues[activityTrendValues.length - 1] : null;
  const activityTrendDelta =
    activityTrendValues.length > 1
      ? Number((activityTrendValues[activityTrendValues.length - 1] - activityTrendValues[activityTrendValues.length - 2]).toFixed(1))
      : null;

  const insightsChecksPayload = useMemo(
    () =>
      healthChecks.slice(0, 24).map((check) => ({
        id: check.id,
        check_type: check.check_type,
        score: check.score,
        confidence: check.confidence ?? null,
        created_at: check.created_at,
        analysis_json: check.analysis_json ?? null,
      })),
    [healthChecks],
  );

  const insightsLogsPayload = useMemo(
    () =>
      healthLogs.slice(0, 30).map((log) => ({
        id: log.id,
        log_type: log.log_type,
        log_data: log.log_data ?? null,
        logged_at: log.logged_at,
      })),
    [healthLogs],
  );

  const hasInsightData = insightsChecksPayload.length > 0 || insightsLogsPayload.length > 0;

  const recentChecks = checksByType.filter((item) => item.check).slice(0, 3);

  const buildPetHealthSnapshot = useCallback(() => {
    const recentScores = Object.fromEntries(
      checksByType
        .filter((item) => item.check)
        .map((item) => [
          item.type,
          {
            score: Number(item.check?.score ?? 0),
            date: item.check?.created_at ?? null,
          },
        ]),
    );

    const activityValues = healthLogs
      .filter((log) => log.log_type === 'activity')
      .map((log) => Number(log.log_data?.duration_minutes ?? log.log_data?.duration_min))
      .filter((value) => Number.isFinite(value));

    const dietEntries = healthLogs.filter((log) => log.log_type === 'diet');
    const recentAbnormalities = healthChecks
      .filter((check) => Number(check.score) < 60)
      .slice(0, 3)
      .map((check) => `${check.check_type} score ${Math.round(Number(check.score))}/100`);

    return {
      pet_name: activePet?.name || 'Unknown pet',
      species: activePet?.type?.toLowerCase?.() || 'dog',
      breed: activePet?.breed || null,
      weight_kg: activePet?.weight ? Number.parseFloat(String(activePet.weight).replace(/[^\d.]/g, '')) || null : null,
      recent_scores: recentScores,
      recent_logs_summary: {
        avg_daily_food_entries: dietEntries.length,
        avg_daily_walk_min: activityValues.length
          ? Number((activityValues.reduce((sum, value) => sum + value, 0) / activityValues.length).toFixed(1))
          : null,
        recent_abnormalities: recentAbnormalities,
      },
      active_recommendations: scanTrends
        .filter((trend) => trend.latest != null && trend.latest < 75)
        .map((trend) => `${trend.label}: ${trend.status.note}`)
        .slice(0, 3),
    };
  }, [activePet?.breed, activePet?.name, activePet?.type, activePet?.weight, checksByType, healthChecks, healthLogs, scanTrends]);

  const handleCallVet = async () => {
    if (!activePet?.id || activePet.id === 'default') {
      Alert.alert('Select a pet first', 'Choose a pet profile before requesting a consultation.');
      return;
    }

    if (!currentVet?.id || currentVet.id === 'mock') {
      Alert.alert('No vet available', 'A veterinarian profile is not available right now. Please try again later.');
      return;
    }

    setStartingConsultation(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert('Login required', 'Please log in before requesting a consultation.');
        return;
      }

      const { data: existingAppointments, error: existingError } = await supabase
        .from('appointments')
        .select('id, scheduled_at, status, call_room_id')
        .eq('user_id', user.id)
        .eq('pet_id', activePet.id)
        .eq('vet_id', currentVet.id)
        .in('status', ['scheduled', 'in_progress'])
        .order('scheduled_at', { ascending: false })
        .limit(1);

      if (existingError) {
        throw existingError;
      }

      const existingAppointment = existingAppointments?.[0];
      const petSnapshot = buildPetHealthSnapshot();

      if (existingAppointment) {
        const roomId = `pawsitive-${existingAppointment.id}`;
        const { error: reuseError } = await supabase
          .from('appointments')
          .update({
            pet_snapshot_json: petSnapshot,
          })
          .eq('id', existingAppointment.id);

        if (reuseError) {
          throw reuseError;
        }

        Alert.alert('Consultation already open', `${currentVet.name} already has an open consultation request for ${activePet.name}.`, [
          {
            text: 'Open call room',
            onPress: () => {
              router.push({
                pathname: '/call' as any,
                params: {
                  appointmentId: existingAppointment.id,
                  roomId,
                  role: 'owner',
                  vetName: currentVet.name,
                  petName: activePet?.name || 'Your pet',
                },
              });
            },
          },
          { text: 'Later', style: 'cancel' },
        ]);
        return;
      }

      const { data: createdAppointment, error: insertError } = await supabase
        .from('appointments')
        .insert({
          user_id: user.id,
          pet_id: activePet.id,
          vet_id: currentVet.id,
          scheduled_at: new Date().toISOString(),
          duration_min: 30,
          status: 'scheduled',
          call_type: 'video',
          pet_snapshot_json: petSnapshot,
        })
        .select('id')
        .single();

      const roomId = `pawsitive-${createdAppointment?.id}`;

      if (insertError) {
        throw insertError;
      }

      Alert.alert('Consultation requested', `${currentVet.name} can now review ${activePet.name}'s saved health data and answer from the vet portal.`, [
        {
          text: 'Open call room',
          onPress: () => {
            router.push({
              pathname: '/call' as any,
              params: {
                appointmentId: createdAppointment?.id,
                roomId,
                role: 'owner',
                vetName: currentVet.name,
                petName: activePet?.name || 'Your pet',
              },
            });
          },
        },
        { text: 'Later', style: 'cancel' },
      ]);
    } catch (error: any) {
      console.error('Error creating consultation request:', error);
      Alert.alert('Request failed', String(error?.message || 'Could not start a consultation right now.'));
    } finally {
      setStartingConsultation(false);
    }
  };

  const requestHealthInsights = async (question?: string) => {
    if (insightLoading) return;

    if (!hasInsightData) {
      setInsightError('No saved checks or logs yet. Save scan results first to unlock insights.');
      return;
    }

    const insightUrl = buildBackendUrl('/health-insights');
    if (!insightUrl) {
      setInsightError(getBackendConfigurationError());
      return;
    }

    const trimmedQuestion = (question ?? insightQuestion).trim();
    setInsightLoading(true);
    setInsightError(null);

    try {
      const response = await fetch(insightUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pet_name: activePet?.name || null,
          checks: insightsChecksPayload,
          logs: insightsLogsPayload,
          question: trimmedQuestion || null,
          request_mode: trimmedQuestion ? 'question' : 'summary',
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
          `Failed to generate insights (HTTP ${response.status}).`;
        throw new Error(detail);
      }

      const aiText =
        (typeof parsed === 'object' && typeof parsed?.response === 'string' ? parsed.response : '') ||
        'No insight text was returned.';

      setInsightResponse(aiText.trim());
      setInsightError(null);
    } catch (error: any) {
      const detail = formatBackendRequestError(error, insightUrl);
      setInsightError(detail);
    } finally {
      setInsightLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingState]}>
        <ActivityIndicator size="large" color={Colors.primary.orangeDark} />
        <Text style={styles.loadingText}>Loading health data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {usingMockData ? (
          <View style={styles.mockDataBanner}>
            <Ionicons name="information-circle" size={20} color={Colors.primary.orangeDark} />
            <Text style={styles.mockDataText}>Showing placeholder data until real health logs arrive.</Text>
          </View>
        ) : null}

        <View style={styles.headerSection}>
          <Text style={styles.pageTitle}>Health & care</Text>
          <Text style={styles.lastUpdate}>
            Updated {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </Text>
        </View>

        <Card style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroBadge}>
              <Ionicons name="shield-checkmark-outline" size={16} color={Colors.primary.brown} />
              <Text style={styles.heroBadgeText}>Health snapshot</Text>
            </View>
            <TouchableOpacity style={styles.reportButton} onPress={() => setReportModalVisible(true)}>
              <Text style={styles.reportButtonText}>Full report</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.heroMainRow}>
            <View style={styles.scoreRingWrap}>
              <View style={[styles.scoreRing, { borderColor: healthStatus.color }]}>
                <Text style={styles.scoreText}>{overallScore}</Text>
                <Text style={styles.scoreSub}>/100</Text>
              </View>
            </View>
            <View style={styles.heroCopy}>
              <Text style={styles.statusTitle}>{healthStatus.title}</Text>
              <Text style={styles.statusDesc}>
                {activePet?.name || 'Your pet'}&apos;s score is based on recent checks and care logs, not live medical readings.
              </Text>
              <Text style={styles.statusSupport}>
                Use this page to review saved check results and decide whether a vet consult is worth scheduling.
              </Text>
            </View>
          </View>
        </Card>

        <Text style={styles.sectionTitle}>Talk to a vet fast</Text>
        <Card
          style={styles.teleVetCard}
          onLayout={(event: any) => {
            setTeleVetCardY(event.nativeEvent.layout.y);
          }}
        >
          <View style={styles.teleVetTop}>
            <View style={styles.teleVetCopy}>
              <Text style={styles.teleVetTitle}>Tele-vet support</Text>
              <Text style={styles.teleVetSubtitle}>
                Get quick guidance when a check looks off or you want reassurance from a professional.
              </Text>
            </View>
            <Image source={{ uri: currentVet.profile_photo_url }} style={styles.vetAvatar} />
          </View>

          <View style={styles.vetMetaRow}>
            <View style={styles.vetMetaItem}>
              <Text style={styles.vetName}>{currentVet.name}</Text>
              <Text style={styles.vetSpec}>{currentVet.specializations?.[0] || 'Veterinarian'}</Text>
            </View>
            <View style={styles.vetMetaItem}>
              <Text style={styles.vetFee}>${currentVet.consultation_fee}</Text>
              <Text style={styles.vetFeeLabel}>per video consult</Text>
            </View>
          </View>

          <View style={styles.ratingRow}>
            <Ionicons name="star" size={14} color="#FFD700" />
            <Text style={styles.ratingText}>
              {currentVet.rating.toFixed(1)} rating • {currentVet.total_reviews} reviews
            </Text>
          </View>

          <View style={styles.vetActions}>
            <TouchableOpacity
              style={[styles.callButton, startingConsultation && styles.buttonDisabled]}
              onPress={handleCallVet}
              disabled={startingConsultation}
            >
              <Ionicons name="videocam-outline" size={18} color="#FFF" />
              <Text style={styles.callBtnText}>
                {startingConsultation ? 'Requesting consult...' : 'Start video consult'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryVetButton}>
              <Ionicons name="chatbubble-ellipses-outline" size={18} color={Colors.primary.brown} />
            </TouchableOpacity>
          </View>
        </Card>

        <Text style={styles.sectionTitle}>Available health records</Text>
        <View style={styles.statsGrid}>
          {careStats.map((stat) => (
            <Card key={stat.id} style={styles.statCard}>
              <View style={[styles.statIconWrap, { backgroundColor: stat.tint }]}>
                <MaterialCommunityIcons name={stat.icon as any} size={22} color={Colors.primary.brown} />
              </View>
              <Text style={styles.statTitle}>{stat.title}</Text>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statNote}>{stat.note}</Text>
            </Card>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Trend dashboard</Text>
        <Card style={styles.trendDashboardCard}>
          <Text style={styles.trendDashboardSubtitle}>
            Past 30 days from saved scans and logs. Scan charts now use a labeled zoomed range so small score changes stand out.
          </Text>

          <View style={styles.scanTrendGrid}>
            {scanTrends.map((trend) => (
              <View key={trend.type} style={styles.scanTrendCard}>
                <View style={styles.scanTrendTop}>
                  <View style={[styles.scanTrendIconWrap, { backgroundColor: `${trend.color}22` }]}>
                    <Ionicons name={trend.icon as any} size={16} color={trend.color} />
                  </View>
                  <View style={styles.scanTrendText}>
                    <Text style={styles.scanTrendLabel}>{trend.label}</Text>
                    <Text style={styles.scanTrendValue}>{trend.latest != null ? `${Math.round(trend.latest)}/100` : '--'}</Text>
                  </View>
                  <View style={[styles.scanTrendStatusPill, { backgroundColor: trend.status.tint }]}>
                    <Text style={[styles.scanTrendStatusText, { color: trend.status.tone }]}>{trend.status.label}</Text>
                  </View>
                </View>
                <AnnotatedTrendBars points={trend.points} color={trend.color} />
                {trend.latestFullDate ? <Text style={styles.scanTrendRecordedAt}>Latest saved {trend.latestFullDate}</Text> : null}
                <Text style={styles.scanTrendNote}>{trend.status.note}</Text>
                <Text style={styles.scanTrendDelta}>{formatTrendDelta(trend.delta, 'pts')}</Text>
              </View>
            ))}
          </View>

          <View style={styles.logTrendGrid}>
            <View style={styles.logTrendCard}>
              <View style={styles.logTrendHeader}>
                <View style={[styles.logTrendIconWrap, { backgroundColor: '#E8F1FF' }]}>
                  <MaterialCommunityIcons name="weight" size={18} color="#3D78C2" />
                </View>
                <View style={styles.logTrendText}>
                  <Text style={styles.logTrendLabel}>Weight trend</Text>
                  <Text style={styles.logTrendValue}>{latestWeightTrend != null ? `${latestWeightTrend} kg` : '--'}</Text>
                </View>
              </View>
              <MiniTrendBars values={weightTrendValues} color="#3D78C2" />
              <Text style={styles.logTrendDelta}>{formatTrendDelta(weightTrendDelta, 'kg')}</Text>
            </View>

            <View style={styles.logTrendCard}>
              <View style={styles.logTrendHeader}>
                <View style={[styles.logTrendIconWrap, { backgroundColor: '#E8F6EE' }]}>
                  <MaterialCommunityIcons name="run" size={18} color="#2E9A8F" />
                </View>
                <View style={styles.logTrendText}>
                  <Text style={styles.logTrendLabel}>Activity trend</Text>
                  <Text style={styles.logTrendValue}>{latestActivityTrend != null ? `${latestActivityTrend} min` : '--'}</Text>
                </View>
              </View>
              <MiniTrendBars values={activityTrendValues} color="#2E9A8F" />
              <Text style={styles.logTrendDelta}>{formatTrendDelta(activityTrendDelta, 'min')}</Text>
            </View>
          </View>
        </Card>

        <Text style={styles.sectionTitle}>AI health insights</Text>
        <Card style={styles.aiInsightsCard}>
          <Text style={styles.aiInsightsSubtitle}>
            Generate a quick summary of historical checks and ask follow-up questions grounded in your saved records.
          </Text>

          <TouchableOpacity
            style={[styles.aiSummaryButton, (!hasInsightData || insightLoading) && styles.buttonDisabled]}
            onPress={() => requestHealthInsights('')}
            disabled={!hasInsightData || insightLoading}
          >
            <Ionicons name="sparkles-outline" size={16} color="#FFF" />
            <Text style={styles.aiSummaryButtonText}>{insightLoading ? 'Generating...' : 'Generate AI summary'}</Text>
          </TouchableOpacity>

          <View style={styles.aiQuestionRow}>
            <TextInput
              style={styles.aiQuestionInput}
              value={insightQuestion}
              onChangeText={setInsightQuestion}
              placeholder="Ask a question about trends, scores, weight, or activity"
              placeholderTextColor="#8A817A"
              editable={!insightLoading}
            />
            <TouchableOpacity
              style={[styles.aiAskButton, (!hasInsightData || insightLoading || !insightQuestion.trim()) && styles.buttonDisabled]}
              onPress={() => requestHealthInsights(insightQuestion)}
              disabled={!hasInsightData || insightLoading || !insightQuestion.trim()}
            >
              <Ionicons name="send" size={15} color="#FFF" />
              <Text style={styles.aiAskButtonText}>Ask AI</Text>
            </TouchableOpacity>
          </View>

          {!hasInsightData ? (
            <Text style={styles.aiHintText}>No saved history yet. Save scan results first, then run AI insights.</Text>
          ) : null}

          {insightError ? <Text style={styles.aiErrorText}>{insightError}</Text> : null}

          {insightResponse ? (
            <View style={styles.aiResultCard}>
              <Text style={styles.aiResultTitle}>AI response</Text>
              <View style={styles.aiMarkdownContainer}>{renderMarkdownContent(insightResponse)}</View>
            </View>
          ) : null}
        </Card>

        <Text style={styles.sectionTitle}>Recent health checks</Text>
        {recentChecks.length > 0 ? (
          recentChecks.map((item) => {
            const score = item.check?.score || 0;
            return (
              <Card key={item.type} style={styles.checkCard}>
                <View style={styles.checkHeader}>
                  <View style={styles.checkLeft}>
                    <View style={styles.checkIconWrap}>
                      <Ionicons name={item.icon as any} size={20} color={Colors.primary.orangeDark} />
                    </View>
                    <View style={styles.checkCopy}>
                      <Text style={styles.checkTitle}>{item.label}</Text>
                      <Text style={styles.checkMeta}>
                        {new Date(item.check!.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                        {item.checkCount > 1 ? ` · ${item.checkCount} recent checks` : ''}
                      </Text>
                    </View>
                  </View>
                  <Text
                    style={[
                      styles.checkScore,
                      {
                        color:
                          score >= 90
                            ? Colors.health.excellent
                            : score >= 75
                              ? Colors.health.good
                              : score >= 60
                                ? Colors.health.fair
                                : Colors.health.poor,
                      },
                    ]}
                  >
                    {Math.round(score)}
                  </Text>
                </View>
              </Card>
            );
          })
        ) : (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyCardTitle}>No recent checks yet</Text>
            <Text style={styles.emptyCardText}>
              Use the camera scan flow to start building a health history for {activePet?.name || 'your pet'}.
            </Text>
          </Card>
        )}
      </ScrollView>

      <Modal
        visible={reportModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setReportModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setReportModalVisible(false)} />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Health report</Text>
              <TouchableOpacity onPress={() => setReportModalVisible(false)}>
                <Ionicons name="close" size={28} color={Colors.primary.brown} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator style={styles.modalScroll} contentContainerStyle={{ paddingBottom: 20 }}>
              {checksByType.map((item) => {
                const score = item.check?.score || 0;
                const hasData = item.check !== null;

                return (
                  <View key={item.type} style={styles.reportCard}>
                    <View style={styles.reportHeader}>
                      <View style={styles.reportIconContainer}>
                        <Ionicons name={item.icon as any} size={22} color={Colors.primary.orangeDark} />
                      </View>
                      <View style={styles.reportInfo}>
                        <Text style={styles.reportLabel}>{item.label}</Text>
                        {hasData ? (
                          <Text style={styles.reportDate}>
                            Latest:{' '}
                            {new Date(item.check!.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </Text>
                        ) : null}
                      </View>
                      <View style={styles.reportScore}>
                        <Text
                          style={[
                            styles.reportScoreText,
                            {
                              color:
                                score >= 90
                                  ? Colors.health.excellent
                                  : score >= 75
                                    ? Colors.health.good
                                    : score >= 60
                                      ? Colors.health.fair
                                      : Colors.health.poor,
                            },
                          ]}
                        >
                          {hasData ? Math.round(score) : '--'}
                        </Text>
                        <Text style={styles.reportScoreSub}>/100</Text>
                      </View>
                    </View>

                    {hasData && item.check?.analysis_json ? (
                      <View style={styles.reportDetails}>
                        {Object.entries(item.check.analysis_json).map(([key, value]) => (
                          <View key={key} style={styles.reportDetailRow}>
                            <Text style={styles.reportDetailLabel}>
                              {key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                            </Text>
                            <Text style={styles.reportDetailValue}>
                              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                            </Text>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <Text style={styles.noDataText}>No check data available yet.</Text>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F4ED',
  },
  loadingState: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 120,
  },
  mockDataBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF1E3',
    padding: 12,
    borderRadius: 14,
    marginBottom: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#F1D7BA',
  },
  mockDataText: {
    fontSize: 13,
    color: Colors.primary.orangeDark,
    fontWeight: '600',
    flex: 1,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.neutral.textLight,
  },
  headerSection: {
    marginBottom: 18,
  },
  pageTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: Colors.primary.brown,
  },
  lastUpdate: {
    fontSize: 13,
    color: Colors.neutral.textLight,
    marginTop: 4,
  },
  card: {
    backgroundColor: '#FFF9F3',
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EADDCF',
  },
  heroCard: {
    backgroundColor: '#F4E7D9',
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF8EF',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary.brown,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  reportButton: {
    backgroundColor: '#FFF8EF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  reportButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary.brown,
  },
  heroMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  scoreRingWrap: {
    marginRight: 2,
  },
  scoreRing: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFDF9',
  },
  scoreText: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.primary.brown,
  },
  scoreSub: {
    fontSize: 11,
    color: Colors.neutral.textLight,
  },
  heroCopy: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.primary.brown,
    marginBottom: 6,
  },
  statusDesc: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.primary.brown,
    marginBottom: 8,
  },
  statusSupport: {
    fontSize: 13,
    lineHeight: 19,
    color: Colors.neutral.textLight,
  },
  sectionTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: Colors.primary.brown,
    marginBottom: 12,
    marginTop: 6,
  },
  teleVetCard: {
    backgroundColor: '#F2E6D9',
    borderColor: '#E7D5C5',
  },
  teleVetTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 16,
  },
  teleVetCopy: {
    flex: 1,
  },
  teleVetTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.primary.brown,
    marginBottom: 8,
  },
  teleVetSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.neutral.textLight,
  },
  vetAvatar: {
    width: 64,
    height: 64,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#FFF8EF',
  },
  vetMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 8,
  },
  vetMetaItem: {
    flex: 1,
  },
  vetName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary.brown,
    marginBottom: 4,
  },
  vetSpec: {
    fontSize: 13,
    color: Colors.neutral.textLight,
  },
  vetFee: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primary.brown,
    textAlign: 'right',
  },
  vetFeeLabel: {
    fontSize: 12,
    color: Colors.neutral.textLight,
    textAlign: 'right',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 18,
  },
  ratingText: {
    fontSize: 13,
    color: Colors.neutral.textLight,
    fontWeight: '600',
  },
  vetActions: {
    flexDirection: 'row',
    gap: 12,
  },
  callButton: {
    flex: 1,
    backgroundColor: Colors.primary.brown,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
    borderRadius: 16,
    gap: 8,
  },
  callBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  secondaryVetButton: {
    width: 54,
    borderRadius: 16,
    backgroundColor: '#FFF8EF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E7D8C9',
  },
  statsGrid: {
    gap: 12,
  },
  statCard: {
    paddingVertical: 18,
  },
  statIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.neutral.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.primary.brown,
    marginBottom: 6,
  },
  statNote: {
    fontSize: 13,
    lineHeight: 18,
    color: Colors.neutral.textLight,
  },
  trendDashboardCard: {
    paddingVertical: 16,
    backgroundColor: '#F6EEE5',
  },
  trendDashboardSubtitle: {
    fontSize: 13,
    color: Colors.neutral.textLight,
    marginBottom: 14,
    fontWeight: '600',
  },
  scanTrendGrid: {
    gap: 10,
  },
  scanTrendCard: {
    backgroundColor: '#FFF9F3',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EADDCF',
  },
  scanTrendTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  scanTrendIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanTrendText: {
    flex: 1,
  },
  scanTrendLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.neutral.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  scanTrendValue: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.primary.brown,
    marginTop: 2,
  },
  scanTrendStatusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  scanTrendStatusText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  scanTrendNote: {
    marginTop: 10,
    fontSize: 12,
    lineHeight: 17,
    color: '#6E6259',
    fontWeight: '600',
  },
  scanTrendDelta: {
    marginTop: 8,
    fontSize: 12,
    color: Colors.neutral.textLight,
    fontWeight: '600',
  },
  scanTrendRecordedAt: {
    marginTop: 10,
    fontSize: 11,
    color: '#8B7D72',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  annotatedTrendScaleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },
  annotatedTrendScalePill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
  },
  annotatedTrendScalePillText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  annotatedTrendScaleText: {
    flex: 1,
    fontSize: 11,
    color: Colors.neutral.textLight,
    fontWeight: '700',
    textAlign: 'right',
  },
  annotatedTrendWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    minHeight: 142,
  },
  annotatedTrendColumn: {
    flex: 1,
    alignItems: 'center',
  },
  annotatedTrendScorePill: {
    minWidth: 34,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#FFF4E7',
    borderWidth: 1,
    borderColor: '#E8D7C2',
    marginBottom: 10,
  },
  annotatedTrendScorePillLatest: {
    backgroundColor: '#FFF0DD',
    borderColor: '#D8AE84',
  },
  annotatedTrendScoreText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.primary.brown,
    textAlign: 'center',
  },
  annotatedTrendScoreTextLatest: {
    color: Colors.primary.orangeDark,
  },
  annotatedTrendTrack: {
    width: '100%',
    height: 82,
    borderRadius: 14,
    backgroundColor: '#EFE4D7',
    justifyContent: 'flex-end',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E6D8C9',
  },
  annotatedTrendFill: {
    width: '100%',
    borderRadius: 14,
  },
  annotatedTrendDate: {
    marginTop: 10,
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primary.brown,
  },
  annotatedTrendDateHint: {
    marginTop: 2,
    fontSize: 9,
    fontWeight: '700',
    color: Colors.neutral.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  trendBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    height: 48,
  },
  trendBarTrack: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
    backgroundColor: '#EFE4D7',
    borderRadius: 999,
    overflow: 'hidden',
  },
  trendBarFill: {
    width: '100%',
    borderRadius: 999,
  },
  trendEmptyText: {
    fontSize: 12,
    color: Colors.neutral.textLight,
    fontStyle: 'italic',
    paddingVertical: 14,
  },
  logTrendGrid: {
    marginTop: 14,
    gap: 10,
  },
  logTrendCard: {
    backgroundColor: '#FFF9F3',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EADDCF',
  },
  logTrendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  logTrendIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logTrendText: {
    flex: 1,
  },
  logTrendLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.neutral.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  logTrendValue: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.primary.brown,
    marginTop: 2,
  },
  logTrendDelta: {
    marginTop: 10,
    fontSize: 12,
    color: Colors.neutral.textLight,
    fontWeight: '600',
  },
  aiInsightsCard: {
    backgroundColor: '#F0F6FF',
    borderColor: '#D7E5FF',
  },
  aiInsightsSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: '#43566E',
    marginBottom: 14,
  },
  aiSummaryButton: {
    backgroundColor: '#3A6FB0',
    borderRadius: 14,
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
  },
  aiSummaryButtonText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
  aiQuestionRow: {
    marginTop: 12,
    gap: 10,
  },
  aiQuestionInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#C7D7F2',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1F2A37',
  },
  aiAskButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#2E9A8F',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aiAskButtonText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 13,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  aiHintText: {
    marginTop: 10,
    fontSize: 13,
    color: Colors.neutral.textLight,
  },
  aiErrorText: {
    marginTop: 10,
    fontSize: 13,
    color: '#A22C2C',
    fontWeight: '600',
  },
  aiResultCard: {
    marginTop: 14,
    backgroundColor: '#FFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D7E5FF',
    padding: 12,
  },
  aiResultTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: '#3A6FB0',
    marginBottom: 6,
  },
  aiResultText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#223041',
  },
  aiMarkdownContainer: {
    marginTop: 2,
  },
  mdBlock: {
    marginBottom: 6,
  },
  mdSpacer: {
    height: 6,
  },
  mdRule: {
    borderBottomWidth: 1,
    borderBottomColor: '#D7E5FF',
    marginVertical: 8,
  },
  mdHeading1: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
    color: '#1D3552',
  },
  mdHeading2: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '800',
    color: '#1D3552',
  },
  mdHeading3: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700',
    color: '#1D3552',
  },
  mdParagraph: {
    fontSize: 14,
    lineHeight: 20,
    color: '#223041',
  },
  mdListItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 4,
  },
  mdListBullet: {
    marginTop: 1,
    minWidth: 14,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    color: '#304F75',
  },
  mdListItemText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: '#223041',
  },
  mdBold: {
    fontWeight: '800',
    color: '#1D3552',
  },
  mdItalic: {
    fontStyle: 'italic',
  },
  checkCard: {
    paddingVertical: 16,
  },
  checkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  checkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFF0E3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkCopy: {
    flex: 1,
  },
  checkTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary.brown,
    marginBottom: 4,
  },
  checkMeta: {
    fontSize: 13,
    color: Colors.neutral.textLight,
  },
  checkScore: {
    fontSize: 28,
    fontWeight: '800',
  },
  emptyCard: {
    alignItems: 'flex-start',
  },
  emptyCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary.brown,
    marginBottom: 6,
  },
  emptyCardText: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.neutral.textLight,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 20,
    height: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.primary.brown,
  },
  modalScroll: {
    flex: 1,
  },
  reportCard: {
    backgroundColor: Colors.neutral.background,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.neutral.border,
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  reportIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary.orange + '40',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  reportInfo: {
    flex: 1,
  },
  reportLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary.brown,
    marginBottom: 2,
  },
  reportDate: {
    fontSize: 12,
    color: Colors.neutral.textLight,
  },
  reportScore: {
    alignItems: 'center',
  },
  reportScoreText: {
    fontSize: 28,
    fontWeight: '800',
  },
  reportScoreSub: {
    fontSize: 12,
    color: Colors.neutral.textLight,
  },
  reportDetails: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral.border,
  },
  reportDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    gap: 12,
  },
  reportDetailLabel: {
    fontSize: 14,
    color: Colors.neutral.textLight,
    flex: 1,
  },
  reportDetailValue: {
    fontSize: 14,
    color: Colors.primary.brown,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  noDataText: {
    fontSize: 14,
    color: Colors.neutral.textLight,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 8,
  },
});
