import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Alert, ActivityIndicator, Modal } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { usePet } from '@/context/PetContext';

const Card = ({ children, style }: any) => (
  <View style={[styles.card, style]}>{children}</View>
);

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
      // Calculate date 3 days ago
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      
      // Fetch health checks from last 3 days only
      const { data: checksData, error: checksError } = await supabase
        .from('health_checks')
        .select('*')
        .eq('pet_id', activePet.id)
        .eq('status', 'complete')
        .gte('created_at', threeDaysAgo.toISOString())
        .order('created_at', { ascending: false });

      // Fetch recent health logs
      const { data: logsData, error: logsError } = await supabase
        .from('health_logs')
        .select('*')
        .eq('pet_id', activePet.id)
        .order('logged_at', { ascending: false })
        .limit(20);

      // Fetch active veterinarians
      const { data: vetsData, error: vetsError } = await supabase
        .from('veterinarians')
        .select('*')
        .eq('is_active', true)
        .order('rating', { ascending: false })
        .limit(1);

      if (!checksError && checksData) setHealthChecks(checksData);
      if (!logsError && logsData) setHealthLogs(logsData);
      if (!vetsError && vetsData) setVeterinarians(vetsData);

      // Check if we have any real data
      const hasData = (checksData && checksData.length > 0) || 
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

  const getOverallScore = () => {
    if (healthChecks.length === 0) return 92; // Mock score
    
    const validScores = healthChecks.filter(c => c.score != null).map(c => c.score);
    if (validScores.length === 0) return 92;
    
    const avgScore = validScores.reduce((sum, score) => sum + score, 0) / validScores.length;
    return Math.round(avgScore);
  };

  const getHealthStatus = (score: number) => {
    if (score >= 90) return { title: 'Excellent Condition', color: Colors.health.excellent };
    if (score >= 75) return { title: 'Good Condition', color: Colors.health.good };
    if (score >= 60) return { title: 'Fair Condition', color: Colors.health.fair };
    return { title: 'Needs Attention', color: Colors.health.poor };
  };

  const getLatestWeight = () => {
    const weightLog = healthLogs.find(log => 
      log.log_type === 'biological' && log.log_data?.weight
    );
    return weightLog?.log_data?.weight || activePet?.weight_kg || '5.2';
  };

  const getLatestActivity = () => {
    const activityLog = healthLogs.find(log => log.log_type === 'activity');
    return activityLog?.log_data?.duration_minutes || '12';
  };

  const getCurrentVet = () => {
    if (veterinarians.length > 0) {
      return veterinarians[0];
    }
    // Mock vet data
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
  };

  const getCheckIcon = (checkType: string) => {
    const icons: { [key: string]: string } = {
      coat: 'paw',
      fit: 'fitness',
      teeth: 'happy',
      poop: 'water',
      face: 'eye',
    };
    return icons[checkType] || 'medical';
  };

  const getCheckLabel = (checkType: string) => {
    const labels: { [key: string]: string } = {
      coat: 'Coat Health',
      fit: 'Body Condition',
      teeth: 'Dental Health',
      poop: 'Digestive Health',
      face: 'Mood & Alertness',
    };
    return labels[checkType] || checkType;
  };

  const getChecksByType = () => {
    const types = ['coat', 'fit', 'teeth', 'poop', 'face'];
    
    return types.map(type => {
      const checks = healthChecks.filter(c => c.check_type === type);
      
      if (checks.length === 0) {
        return {
          type,
          label: getCheckLabel(type),
          icon: getCheckIcon(type),
          check: null,
          allChecks: [],
          checkCount: 0,
        };
      }
      
      // Get latest check for date/details
      const latestCheck = checks[0];
      
      return {
        type,
        label: getCheckLabel(type),
        icon: getCheckIcon(type),
        check: latestCheck,
        allChecks: checks, // Last 3 days of checks
        checkCount: checks.length,
      };
    });
  };
  
  const handleCallVet = () => {
    Alert.alert("Connecting...", "Starting video call with Dr. Sarah Smith");
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary.orangeDark} />
        <Text style={styles.loadingText}>Loading health data...</Text>
      </View>
    );
  }

  const overallScore = getOverallScore();
  const healthStatus = getHealthStatus(overallScore);
  const currentVet = getCurrentVet();

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: 120 }} 
        showsVerticalScrollIndicator={false}
      >
      
      {/* Mock Data Banner */}
      {usingMockData && (
        <View style={styles.mockDataBanner}>
          <Ionicons name="information-circle" size={20} color={Colors.primary.orangeDark} />
          <Text style={styles.mockDataText}>No data found. Mock data shown</Text>
        </View>
      )}
      
      {/* 1. Header */}
      <View style={styles.headerSection}>
        <Text style={styles.pageTitle}>Health Overview</Text>
        <Text style={styles.lastUpdate}>
          Last updated: {new Date().toLocaleString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            hour: 'numeric', 
            minute: '2-digit' 
          })}
        </Text>
      </View>

      {/* 2. Clean Score Card (No Border Frame) */}
      <Card style={styles.scoreCard}>
        <View style={styles.scoreLeft}>
          <View style={[styles.scoreRing, { borderColor: healthStatus.color }]}>
            <Text style={styles.scoreText}>{overallScore}</Text>
            <Text style={styles.scoreSub}>/100</Text>
          </View>
        </View>
        <View style={styles.scoreRight}>
          <Text style={styles.statusTitle}>{healthStatus.title}</Text>
          <Text style={styles.statusDesc}>
            {`${activePet?.name || 'Your pet'}'s vitals are ${overallScore >= 90 ? 'stable' : 'being monitored'}.`}
            {overallScore >= 90 ? ' Keep up the hydration and daily walks!' : ' Consider scheduling a check-up.'}
          </Text>
          <TouchableOpacity 
            style={styles.detailBtn} 
            onPress={() => {
              console.log('View Report pressed');
              setReportModalVisible(true);
            }}
          >
            <Text style={styles.detailBtnText}>View Report</Text>
          </TouchableOpacity>
        </View>
      </Card>

      {/* 3. Vitals Grid */}
      <Text style={styles.sectionTitle}>Vitals</Text>
      <View style={styles.grid}>
        <Card style={styles.vitalCard}>
          <View style={[styles.iconCircle, { backgroundColor: '#E3F2FD' }]}>
            <MaterialCommunityIcons name="weight" size={24} color="#2196F3" />
          </View>
          <Text style={styles.vitalValue}>{getLatestWeight()} kg</Text>
          <Text style={styles.vitalLabel}>Weight</Text>
        </Card>

        <Card style={styles.vitalCard}>
          <View style={[styles.iconCircle, { backgroundColor: '#FFEBEE' }]}>
            <MaterialCommunityIcons name="heart-pulse" size={24} color="#F44336" />
          </View>
          <Text style={styles.vitalValue}>80 bpm</Text>
          <Text style={styles.vitalLabel}>Heart Rate</Text>
        </Card>

        <Card style={styles.vitalCard}>
          <View style={[styles.iconCircle, { backgroundColor: '#E8F5E9' }]}>
            <MaterialCommunityIcons name="thermometer" size={24} color="#4CAF50" />
          </View>
          <Text style={styles.vitalValue}>38.5°C</Text>
          <Text style={styles.vitalLabel}>Temp</Text>
        </Card>

        <Card style={styles.vitalCard}>
          <View style={[styles.iconCircle, { backgroundColor: '#FFF3E0' }]}>
            <MaterialCommunityIcons name="sleep" size={24} color="#FF9800" />
          </View>
          <Text style={styles.vitalValue}>{getLatestActivity()}h</Text>
          <Text style={styles.vitalLabel}>Activity</Text>
        </Card>
      </View>

      {/* 4. Tele-Vet Section */}
      <Text style={styles.sectionTitle}>Tele-Vet</Text>
      <Card style={styles.vetCard}>
        <View style={styles.vetHeader}>
          <Image 
            source={{ uri: currentVet.profile_photo_url }} 
            style={styles.vetAvatar} 
          />
          <View style={styles.vetInfo}>
            <Text style={styles.vetName}>{currentVet.name}</Text>
            <Text style={styles.vetSpec}>
              {currentVet.specializations?.[0] || 'Veterinarian'} • Available
            </Text>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={14} color="#FFD700" />
              <Text style={styles.ratingText}>
                {currentVet.rating.toFixed(1)} ({currentVet.total_reviews} reviews)
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.vetActions}>
          <TouchableOpacity style={styles.callButton} onPress={handleCallVet}>
            <Ionicons name="videocam" size={20} color="#fff" />
            <Text style={styles.callBtnText}>Video Call (${currentVet.consultation_fee})</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.chatButton}>
            <Ionicons name="chatbubble-ellipses" size={20} color={Colors.primary.brown} />
          </TouchableOpacity>
        </View>
      </Card>
    </ScrollView>

    {/* Health Report Modal */}
    <Modal
      visible={reportModalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setReportModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity 
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setReportModalVisible(false)}
        />
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Health Report</Text>
            <TouchableOpacity onPress={() => setReportModalVisible(false)}>
              <Ionicons name="close" size={28} color={Colors.primary.brown} />
            </TouchableOpacity>
          </View>

          <ScrollView 
            showsVerticalScrollIndicator={true} 
            style={styles.modalScroll}
            contentContainerStyle={{ paddingBottom: 20 }}
          >
              {usingMockData && (
                <View style={styles.mockDataBanner}>
                  <Ionicons name="information-circle" size={20} color={Colors.primary.orangeDark} />
                  <Text style={styles.mockDataText}>No data found. Mock data shown</Text>
                </View>
              )}

              {getChecksByType().map((item, index) => {
                const score = item.check?.score || 0;
                const hasData = item.check !== null;
                
                return (
                  <View key={item.type} style={styles.reportCard}>
                    <View style={styles.reportHeader}>
                      <View style={styles.reportIconContainer}>
                        <Ionicons 
                          name={item.icon as any} 
                          size={24} 
                          color={Colors.primary.orangeDark} 
                        />
                      </View>
                      <View style={styles.reportInfo}>
                        <Text style={styles.reportLabel}>{item.label}</Text>
                        {hasData && item.check && (
                          <>
                            <Text style={styles.reportDate}>
                              Latest: {new Date(item.check.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit'
                              })}
                            </Text>
                            {item.checkCount > 1 && (
                              <Text style={styles.reportCheckCount}>
                                Last 3 days ({item.checkCount} checks)
                              </Text>
                            )}
                          </>
                        )}
                      </View>
                      <View style={styles.reportScore}>
                        <Text style={[
                          styles.reportScoreText,
                          { color: score >= 90 ? Colors.health.excellent : 
                                   score >= 75 ? Colors.health.good : 
                                   score >= 60 ? Colors.health.fair : Colors.health.poor }
                        ]}>
                          {hasData ? Math.round(score) : '--'}
                        </Text>
                        <Text style={styles.reportScoreSub}>/100</Text>
                      </View>
                    </View>

                    {hasData && item.check && item.check.analysis_json && (
                      <View style={styles.reportDetails}>
                        {Object.entries(item.check.analysis_json).map(([key, value]) => (
                          <View key={key} style={styles.reportDetailRow}>
                            <Text style={styles.reportDetailLabel}>
                              {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:
                            </Text>
                            <Text style={styles.reportDetailValue}>
                              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                            </Text>
                          </View>
                        ))}
                        {item.check.confidence && (
                          <View style={styles.confidenceBar}>
                            <Text style={styles.confidenceLabel}>
                              Confidence: {Math.round(item.check.confidence * 100)}%
                            </Text>
                            <View style={styles.confidenceBarBg}>
                              <View 
                                style={[
                                  styles.confidenceBarFill, 
                                  { width: `${item.check.confidence * 100}%` }
                                ]} 
                              />
                            </View>
                          </View>
                        )}
                      </View>
                    )}

                    {/* Historical Data */}
                    {hasData && item.allChecks && item.allChecks.length > 0 && (
                      <View style={styles.historySection}>
                        <Text style={styles.historyTitle}>History ({item.allChecks.length} checks)</Text>
                        {item.allChecks.map((check, idx) => (
                          <View key={check.id} style={styles.historyItem}>
                            <View style={styles.historyLeft}>
                              <Text style={styles.historyDate}>
                                {new Date(check.created_at).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </Text>
                              <Text style={styles.historyTime}>
                                {new Date(check.created_at).toLocaleTimeString('en-US', {
                                  hour: 'numeric',
                                  minute: '2-digit'
                                })}
                              </Text>
                            </View>
                            <View style={styles.historyRight}>
                              <Text style={[
                                styles.historyScore,
                                { color: check.score >= 90 ? Colors.health.excellent : 
                                         check.score >= 75 ? Colors.health.good : 
                                         check.score >= 60 ? Colors.health.fair : Colors.health.poor }
                              ]}>
                                {Math.round(check.score)}
                              </Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}

                    {!hasData && (
                      <Text style={styles.noDataText}>No check data available</Text>
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
    backgroundColor: Colors.neutral.background,
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  
  mockDataBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary.orange + '20',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  mockDataText: {
    fontSize: 14,
    color: Colors.primary.orangeDark,
    fontWeight: '600',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.neutral.textLight,
  },
  
  headerSection: { marginBottom: 20 },
  pageTitle: { fontSize: 28, fontWeight: '800', color: Colors.primary.brown },
  lastUpdate: { fontSize: 13, color: Colors.neutral.textLight, marginTop: 4 },

  card: { backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },

  // Clean Score Card (No Border)
  scoreCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 20, 
    // No Border Width/Color here
  },
  scoreLeft: { marginRight: 20 },
  scoreRing: { 
    width: 80, height: 80, borderRadius: 40, 
    borderWidth: 6, borderColor: Colors.health.excellent, 
    justifyContent: 'center', alignItems: 'center', 
    backgroundColor: '#fff' 
  },
  scoreText: { fontSize: 26, fontWeight: '800', color: Colors.primary.brown },
  scoreSub: { fontSize: 10, color: Colors.neutral.textLight },
  scoreRight: { flex: 1 },
  statusTitle: { fontSize: 18, fontWeight: '700', color: Colors.primary.brown, marginBottom: 4 },
  statusDesc: { fontSize: 13, color: Colors.neutral.textLight, marginBottom: 12, lineHeight: 18 },
  detailBtn: { 
    backgroundColor: Colors.primary.orange + '20', 
    paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, alignSelf: 'flex-start' 
  },
  detailBtnText: { color: Colors.primary.orangeDark, fontSize: 12, fontWeight: '600' },

  // Vitals Grid
  sectionTitle: { fontSize: 20, fontWeight: '700', color: Colors.primary.brown, marginBottom: 12, marginTop: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  vitalCard: { width: '48%', alignItems: 'center', paddingVertical: 20 },
  iconCircle: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  vitalValue: { fontSize: 20, fontWeight: '700', color: Colors.primary.brown },
  vitalLabel: { fontSize: 14, color: Colors.neutral.textLight },

  // Vet Card
  vetCard: { padding: 20, marginBottom: 40 },
  vetHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  vetAvatar: { width: 60, height: 60, borderRadius: 30, marginRight: 15 },
  vetInfo: { flex: 1 },
  vetName: { fontSize: 18, fontWeight: '700', color: Colors.primary.brown },
  vetSpec: { fontSize: 13, color: Colors.neutral.textLight, marginBottom: 4 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontSize: 12, color: Colors.neutral.textLight, fontWeight: '600' },

  vetActions: { flexDirection: 'row', gap: 12 },
  callButton: { flex: 1, backgroundColor: Colors.primary.orangeDark, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 14, borderRadius: 14, gap: 8 },
  callBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  chatButton: { width: 50, backgroundColor: Colors.neutral.background, justifyContent: 'center', alignItems: 'center', borderRadius: 14, borderWidth: 1, borderColor: Colors.neutral.border },

  // Modal Styles
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

  // Report Card Styles
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
  reportCheckCount: {
    fontSize: 11,
    color: Colors.primary.orangeDark,
    fontWeight: '600',
    marginTop: 2,
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
  confidenceBar: {
    marginTop: 12,
  },
  confidenceLabel: {
    fontSize: 12,
    color: Colors.neutral.textLight,
    marginBottom: 6,
  },
  confidenceBarBg: {
    height: 6,
    backgroundColor: Colors.neutral.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  confidenceBarFill: {
    height: '100%',
    backgroundColor: Colors.primary.orangeDark,
  },
  noDataText: {
    fontSize: 14,
    color: Colors.neutral.textLight,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 8,
  },
  
  // History Styles
  historySection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral.border,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary.brown,
    marginBottom: 12,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#FAFAFA',
    borderRadius: 8,
    marginBottom: 8,
  },
  historyLeft: {
    flex: 1,
  },
  historyDate: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary.brown,
    marginBottom: 2,
  },
  historyTime: {
    fontSize: 11,
    color: Colors.neutral.textLight,
  },
  historyRight: {
    marginLeft: 12,
  },
  historyScore: {
    fontSize: 24,
    fontWeight: '800',
  },
});
