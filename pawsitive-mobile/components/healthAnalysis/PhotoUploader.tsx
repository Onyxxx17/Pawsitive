import React, { Dispatch, SetStateAction, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { AnnotatedCaptureImage } from '@/components/healthAnalysis/AnnotatedCaptureImage';
import { Colors } from '@/constants/Colors';
import { GuidedCaptureModal } from '@/components/healthAnalysis/GuidedCaptureModal';
import { AnalysisType, SCAN_GUIDES } from '@/constants/scanGuides';
import { QualityGateResult, validateScanImageLocally } from '@/utils/scanQuality';

const analysisCards = SCAN_GUIDES;

export function PhotoUploader({
  onAllImagesSelected,
  loading,
  setLoading,
  uploadedImages,
  setUploadedImages,
}: {
  onAllImagesSelected: (images: Record<string, string>) => Promise<void> | void;
  loading: boolean;
  setLoading: Dispatch<SetStateAction<boolean>>;
  uploadedImages: Record<string, string>;
  setUploadedImages: Dispatch<SetStateAction<Record<string, string>>>;
}) {
  const completedCount = Object.keys(uploadedImages).length;
  const progress = completedCount / analysisCards.length;
  const [captureTarget, setCaptureTarget] = useState<AnalysisType | null>(null);
  const [captureVisible, setCaptureVisible] = useState(false);
  const [qualityByAnalysis, setQualityByAnalysis] = useState<Partial<Record<AnalysisType, QualityGateResult>>>({});

  useEffect(() => {
    const pendingAnalyses = Object.entries(uploadedImages).filter(
      ([analysis, uri]) => uri && !qualityByAnalysis[analysis as AnalysisType],
    ) as [AnalysisType, string][];

    if (pendingAnalyses.length === 0) {
      return;
    }

    let cancelled = false;

    (async () => {
      const validatedEntries = await Promise.all(
        pendingAnalyses.map(async ([analysis, uri]) => [
          analysis,
          await validateScanImageLocally(analysis, uri),
        ] as const),
      );

      if (cancelled) {
        return;
      }

      setQualityByAnalysis((previous) => {
        const next = { ...previous };

        validatedEntries.forEach(([analysis, quality]) => {
          next[analysis] = quality;
        });

        return next;
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [qualityByAnalysis, uploadedImages]);

  const handleImageSelected = (analysis: AnalysisType, uri: string, quality: QualityGateResult) => {
    setUploadedImages((prev) => ({ ...prev, [analysis]: uri }));
    setQualityByAnalysis((prev) => ({ ...prev, [analysis]: quality }));
  };

  const handleGuidedCaptureOpen = (analysis: AnalysisType) => {
    setCaptureTarget(analysis);
    setCaptureVisible(true);
  };

  const pickImage = async (analysis: AnalysisType) => {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) {
      Alert.alert('Permission Required', 'Gallery access is needed.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      const quality = await validateScanImageLocally(analysis, uri);

      if (quality.status === 'block') {
        Alert.alert(quality.label, quality.summary);
        return;
      }

      handleImageSelected(analysis, uri, quality);

      if (quality.status === 'warn') {
        Alert.alert(quality.label, quality.summary);
      }
    }
  };

  const handleSubmit = async () => {
    if (completedCount !== analysisCards.length) {
      Alert.alert('Incomplete', 'Please upload photos for all scan categories.');
      return;
    }

    setLoading(true);
    try {
      await onAllImagesSelected(uploadedImages);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred while sending the photos.';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View>
      <View style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressTitle}>Capture progress</Text>
          <Text style={styles.progressMeta}>{completedCount}/{analysisCards.length} ready</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
        <Text style={styles.progressHint}>
          Add one clear image for each scan type before you submit the full set.
        </Text>
      </View>

      {analysisCards.map((card, index) => {
        const imageUri = uploadedImages[card.key];
        const ready = Boolean(imageUri);
        const quality = qualityByAnalysis[card.key];
        const qualityTone =
          quality?.status === 'pass'
            ? '#2B8A5A'
            : quality?.status === 'warn'
              ? '#9A6A16'
              : Colors.primary.brown;
        const qualityIcon =
          quality?.status === 'pass'
            ? 'checkmark-circle'
            : quality?.status === 'warn'
              ? 'warning'
              : 'checkmark-circle';

        return (
          <View key={card.key} style={styles.analysisCard}>
            <View style={styles.analysisHeader}>
              <View style={[styles.analysisIconWrap, { backgroundColor: card.accent }]}>
                <Ionicons name={card.icon} size={22} color={Colors.primary.brown} />
              </View>
              <View style={styles.analysisHeaderText}>
                <Text style={styles.analysisEyebrow}>Step {index + 1}</Text>
                <Text style={styles.analysisTitle}>{card.title}</Text>
              </View>
              <View style={[styles.statusPill, ready ? styles.statusReady : styles.statusPending]}>
                <Text style={[styles.statusText, ready ? styles.statusTextReady : styles.statusTextPending]}>
                  {ready ? 'Ready' : 'Missing'}
                </Text>
              </View>
            </View>

            <Text style={styles.analysisNote}>{card.note}</Text>

            <View style={[styles.referencePanel, { backgroundColor: card.accent }]}>
              <View style={styles.referenceHeader}>
                <View>
                  <Text style={styles.referenceEyebrow}>Doge Guide</Text>
                  <Text style={styles.referenceTitle}>Suggested vs your upload</Text>
                </View>
                <Ionicons name="sparkles-outline" size={18} color={Colors.primary.brown} />
              </View>
              <View style={styles.comparisonRow}>
                <View style={styles.comparisonColumn}>
                  <Text style={styles.comparisonLabel}>Suggested image</Text>
                  <View style={styles.comparisonFrame}>
                    <Image
                      source={card.referenceImage}
                      style={styles.comparisonImage}
                      resizeMode="contain"
                      accessibilityLabel={`${card.title} Doge reference`}
                    />
                  </View>
                </View>

                <View style={styles.comparisonColumn}>
                  <Text style={styles.comparisonLabel}>Your upload</Text>
                  {imageUri ? (
                    <View style={styles.comparisonFrame}>
                      <AnnotatedCaptureImage
                        uri={imageUri}
                        quality={quality}
                        style={styles.comparisonImage}
                        accessibilityLabel={`${card.title} uploaded image`}
                      />
                    </View>
                  ) : (
                    <View style={[styles.comparisonFrame, styles.emptyComparisonFrame]}>
                      <Ionicons name="image-outline" size={26} color={Colors.neutral.textLight} />
                      <Text style={styles.emptyPreviewTitle}>No photo yet</Text>
                      <Text style={styles.emptyPreviewText}>Take or upload a photo to compare it here.</Text>
                    </View>
                  )}
                </View>
              </View>
              <Text style={styles.referenceText}>{card.referenceText}</Text>

              {imageUri ? (
                <View style={styles.previewMeta}>
                  <Ionicons name={qualityIcon} size={18} color={qualityTone} />
                  <View style={styles.previewMetaCopy}>
                    <Text style={[styles.previewMetaText, { color: qualityTone }]}>
                      {quality?.label || 'Photo selected and ready for analysis'}
                    </Text>
                    <Text style={styles.previewSummaryText}>
                      {quality?.summary || 'Photo selected and ready for analysis.'}
                    </Text>
                  </View>
                </View>
              ) : null}
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionButton, styles.primaryAction, loading && styles.actionDisabled]}
                onPress={() => handleGuidedCaptureOpen(card.key)}
                disabled={loading}
              >
                <Ionicons name="camera-outline" size={18} color="#FFF9F2" />
                <Text style={styles.primaryActionText}>{imageUri ? 'Retake' : 'Take Photo'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.secondaryAction, loading && styles.actionDisabled]}
                onPress={() => pickImage(card.key)}
                disabled={loading}
              >
                <Ionicons name="images-outline" size={18} color={Colors.primary.brown} />
                <Text style={styles.secondaryActionText}>{imageUri ? 'Replace' : 'Gallery'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}

      <TouchableOpacity
        style={[styles.submitButton, completedCount !== analysisCards.length && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        <Text style={styles.submitTitle}>{loading ? 'Submitting scans...' : 'Analyze all scans'}</Text>
        <Text style={styles.submitSubtitle}>Send the full photo set in one batch.</Text>
      </TouchableOpacity>

      <GuidedCaptureModal
        visible={captureVisible}
        analysisType={captureTarget}
        onClose={() => {
          setCaptureVisible(false);
          setCaptureTarget(null);
        }}
        onAccept={({ uri, quality }) => {
          if (!captureTarget) return;
          handleImageSelected(captureTarget, uri, quality);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  progressCard: {
    backgroundColor: '#FFF9F3',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#ECDCCA',
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.primary.brown,
  },
  progressMeta: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary.orangeDark,
  },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: '#F1E3D5',
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: Colors.primary.orangeDark,
  },
  progressHint: {
    fontSize: 13,
    lineHeight: 19,
    color: Colors.neutral.textLight,
  },
  analysisCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EADCCB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 2,
  },
  analysisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  analysisIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  analysisHeaderText: {
    flex: 1,
  },
  analysisEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: Colors.neutral.textLight,
    marginBottom: 2,
  },
  analysisTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primary.brown,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusReady: {
    backgroundColor: '#E6F5EB',
  },
  statusPending: {
    backgroundColor: '#F8EEE3',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusTextReady: {
    color: '#2B8A5A',
  },
  statusTextPending: {
    color: '#9A6A43',
  },
  analysisNote: {
    marginTop: 14,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.neutral.textLight,
  },
  referencePanel: {
    marginTop: 16,
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(67,55,47,0.08)',
  },
  referenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  referenceEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: 'rgba(67,55,47,0.68)',
    marginBottom: 4,
  },
  referenceTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primary.brown,
  },
  comparisonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  comparisonColumn: {
    flex: 1,
    minWidth: 0,
  },
  comparisonLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6C5A4E',
    marginBottom: 8,
  },
  comparisonFrame: {
    height: 190,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 18,
    padding: 10,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  comparisonImage: {
    width: '100%',
    height: '100%',
  },
  emptyComparisonFrame: {
    borderWidth: 1,
    borderColor: '#E9DDD1',
    borderStyle: 'dashed',
  },
  referenceText: {
    marginTop: 12,
    fontSize: 13,
    lineHeight: 19,
    color: '#5D5148',
  },
  previewMeta: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  previewMetaCopy: {
    flex: 1,
  },
  previewMetaText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary.brown,
  },
  previewSummaryText: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 17,
    color: Colors.neutral.textLight,
    fontWeight: '500',
  },
  emptyPreviewTitle: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary.brown,
    textAlign: 'center',
  },
  emptyPreviewText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    color: Colors.neutral.textLight,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  primaryAction: {
    backgroundColor: Colors.primary.brown,
  },
  secondaryAction: {
    backgroundColor: '#FFF3E6',
    borderWidth: 1,
    borderColor: '#ECD8C0',
  },
  actionDisabled: {
    opacity: 0.6,
  },
  primaryActionText: {
    color: '#FFF9F2',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryActionText: {
    color: Colors.primary.brown,
    fontSize: 15,
    fontWeight: '700',
  },
  submitButton: {
    marginTop: 6,
    borderRadius: 24,
    backgroundColor: Colors.primary.orangeDark,
    paddingVertical: 18,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.55,
  },
  submitTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFF9F2',
  },
  submitSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: 'rgba(255,249,242,0.84)',
  },
});
