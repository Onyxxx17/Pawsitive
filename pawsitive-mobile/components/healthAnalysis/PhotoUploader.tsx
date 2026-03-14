import React, { Dispatch, SetStateAction } from 'react';
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
import { Colors } from '@/constants/Colors';

const analysisCards = [
  {
    key: 'mood_analysis',
    title: 'Mood Scan',
    icon: 'happy-outline' as const,
    note: 'Capture the face clearly with both eyes visible.',
    accent: '#FFE7BE',
  },
  {
    key: 'coat_and_body_condition',
    title: 'Coat and Body',
    icon: 'sparkles-outline' as const,
    note: 'Use a side or full-body photo in soft lighting.',
    accent: '#F7D2C7',
  },
  {
    key: 'teeth_and_gums',
    title: 'Teeth and Gums',
    icon: 'medical-outline' as const,
    note: 'Zoom in closely so the gums and teeth are easy to inspect.',
    accent: '#F9E1D0',
  },
  {
    key: 'poop_analysis',
    title: 'Poop Check',
    icon: 'leaf-outline' as const,
    note: 'Frame the sample directly from above when possible.',
    accent: '#E8D8BE',
  },
  {
    key: 'body_weight',
    title: 'Body Weight',
    icon: 'barbell-outline' as const,
    note: 'Use a side or top view with the full torso visible.',
    accent: '#EADCD0',
  },
];

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

  const handleImageSelected = (analysis: string, uri: string) => {
    setUploadedImages((prev) => ({ ...prev, [analysis]: uri }));
  };

  const openCamera = async (analysis: string) => {
    const { granted } = await ImagePicker.requestCameraPermissionsAsync();
    if (!granted) {
      Alert.alert('Permission Required', 'Camera access is needed.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      handleImageSelected(analysis, result.assets[0].uri);
    }
  };

  const pickImage = async (analysis: string) => {
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
      handleImageSelected(analysis, result.assets[0].uri);
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
    } catch {
      Alert.alert('Error', 'An error occurred while sending the photos.');
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

            {imageUri ? (
              <View style={styles.previewPanel}>
                <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                <View style={styles.previewMeta}>
                  <Ionicons name="checkmark-circle" size={18} color="#2B8A5A" />
                  <Text style={styles.previewMetaText}>Photo selected and ready for analysis</Text>
                </View>
              </View>
            ) : (
              <View style={styles.emptyPreview}>
                <Ionicons name="image-outline" size={28} color={Colors.neutral.textLight} />
                <Text style={styles.emptyPreviewTitle}>No photo added yet</Text>
                <Text style={styles.emptyPreviewText}>Use the camera for the best guided capture.</Text>
              </View>
            )}

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionButton, styles.primaryAction, loading && styles.actionDisabled]}
                onPress={() => openCamera(card.key)}
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
  previewPanel: {
    marginTop: 16,
    backgroundColor: '#FCF6F0',
    borderRadius: 20,
    padding: 12,
  },
  imagePreview: {
    width: '100%',
    height: 180,
    borderRadius: 16,
    marginBottom: 10,
  },
  previewMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  previewMetaText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary.brown,
  },
  emptyPreview: {
    marginTop: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E9DDD1',
    borderStyle: 'dashed',
    paddingVertical: 22,
    paddingHorizontal: 18,
    alignItems: 'center',
    backgroundColor: '#FCF8F4',
  },
  emptyPreviewTitle: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary.brown,
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
