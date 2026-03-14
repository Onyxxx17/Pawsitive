import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Alert, ActivityIndicator, Modal } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { usePet } from '@/context/PetContext';

const Card = ({ children, style }: any) => <View style={[styles.card, style]}>{children}</View>;

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

export default function HealthScreen() {
  const { activePet } = usePet();
  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([]);
  const [healthLogs, setHealthLogs] = useState<HealthLog[]>([]);
  const [veterinarians, setVeterinarians] = useState<Veterinarian[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingMockData, setUsingMockData] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);

  const fetchHealthData = useCallback(async () => {
    if (!activePet?.id || activePet.id === 'default') return;

    setLoading(true);
    try {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const { data: checksData, error: checksError } = await supabase
        .from('health_checks')
        .select('*')
        .eq('pet_id', activePet.id)
        .eq('status', 'complete')
        .gte('created_at', threeDaysAgo.toISOString())
        .order('created_at', { ascending: false });

      const { data: logsData, error: logsError } = await supabase
        .from('health_logs')
        .select('*')
        .eq('pet_id', activePet.id)
        .order('logged_at', { ascending: false })
        .limit(20);

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
    () => healthLogs.find((log) => log.log_type === 'biological' && log.log_data?.weight),
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

  const careStats = useMemo(
    () => [
      {
        id: 'weight',
        icon: 'weight',
        title: 'Latest weight record',
        value: latestWeightLog?.log_data?.weight
          ? `${latestWeightLog.log_data.weight} kg`
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
        value: latestActivityLog?.log_data?.duration_minutes
          ? `${latestActivityLog.log_data.duration_minutes} min`
          : 'Not logged',
        note: latestActivityLog ? 'Pulled from the latest saved activity entry' : 'No saved activity record yet',
        tint: '#E8F6EE',
      },
      {
        id: 'diet',
        icon: 'restaurant-outline',
        title: 'Latest diet record',
        value: latestDietLog?.log_data?.meal_type || latestDietLog?.log_data?.notes || 'No recent entry',
        note: latestDietLog ? 'Pulled from the latest saved diet entry' : 'No saved diet record yet',
        tint: '#FFF1E3',
      },
    ],
    [activePet?.weight, latestActivityLog, latestDietLog, latestWeightLog],
  );

  const checksByType = useMemo(() => {
    const labels: Record<string, { label: string; icon: string }> = {
      coat: { label: 'Coat and skin', icon: 'paw' },
      fit: { label: 'Body condition', icon: 'fitness' },
      teeth: { label: 'Teeth and gums', icon: 'happy' },
      poop: { label: 'Digestive check', icon: 'water' },
      face: { label: 'Mood and alertness', icon: 'eye' },
    };

    return ['coat', 'fit', 'teeth', 'poop', 'face'].map((type) => {
      const checks = healthChecks.filter((c) => c.check_type === type);
      return {
        type,
        label: labels[type]?.label || type,
        icon: labels[type]?.icon || 'medical',
        check: checks[0] || null,
        checkCount: checks.length,
      };
    });
  }, [healthChecks]);

  const recentChecks = checksByType.filter((item) => item.check).slice(0, 3);

  const handleCallVet = () => {
    Alert.alert('Connecting...', `Starting video call with ${currentVet.name}`);
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
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
        <Card style={styles.teleVetCard}>
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
            <TouchableOpacity style={styles.callButton} onPress={handleCallVet}>
              <Ionicons name="videocam-outline" size={18} color="#FFF" />
              <Text style={styles.callBtnText}>Start video consult</Text>
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
                        {item.checkCount > 1 ? ` • ${item.checkCount} recent checks` : ''}
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
