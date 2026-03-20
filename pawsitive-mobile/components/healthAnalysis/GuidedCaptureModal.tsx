import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { CameraCapturedPicture, CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';

import { AnnotatedCaptureImage } from '@/components/healthAnalysis/AnnotatedCaptureImage';
import { AnalysisType, GuideOverlayType, SCAN_GUIDE_BY_KEY } from '@/constants/scanGuides';
import { Colors } from '@/constants/Colors';
import { QualityGateResult, validateScanImageLocally } from '@/utils/scanQuality';

type GuidedCaptureModalProps = {
  visible: boolean;
  analysisType: AnalysisType | null;
  onClose: () => void;
  onAccept: (payload: { uri: string; quality: QualityGateResult }) => void;
};

type CapturedPreview = {
  uri: string;
  quality: QualityGateResult;
};

const getOverlayStyle = (overlay: GuideOverlayType) => {
  switch (overlay) {
    case 'face':
      return {
        width: '62%' as const,
        height: '56%' as const,
        borderRadius: 999,
      };
    case 'mouth':
      return {
        width: '72%' as const,
        height: '34%' as const,
        borderRadius: 28,
      };
    case 'topDown':
      return {
        width: '62%' as const,
        aspectRatio: 1,
        borderRadius: 28,
      };
    case 'body':
    default:
      return {
        width: '78%' as const,
        height: '54%' as const,
        borderRadius: 32,
      };
  }
};

const getStatusColors = (status: QualityGateResult['status']) => {
  if (status === 'pass') {
    return { tint: '#E6F5EB', tone: '#2B8A5A' };
  }
  if (status === 'warn') {
    return { tint: '#FFF0C9', tone: '#9A6A16' };
  }
  return { tint: '#FBE2DC', tone: '#A14637' };
};

const normalizeCapturedUri = (picture: CameraCapturedPicture) => {
  if (Platform.OS === 'web' && picture.base64 && !picture.uri.startsWith('data:')) {
    return `data:image/${picture.format || 'jpeg'};base64,${picture.base64}`;
  }

  return picture.uri;
};

export function GuidedCaptureModal({
  visible,
  analysisType,
  onClose,
  onAccept,
}: GuidedCaptureModalProps) {
  const cameraRef = useRef<CameraView | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraAvailable, setCameraAvailable] = useState(Platform.OS !== 'web');
  const [capturedPreview, setCapturedPreview] = useState<CapturedPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const guide = analysisType ? SCAN_GUIDE_BY_KEY[analysisType] : null;

  useEffect(() => {
    if (!visible) {
      setCameraReady(false);
      setCapturedPreview(null);
      setBusy(false);
      return;
    }

    let mounted = true;
    CameraView.isAvailableAsync()
      .then((available) => {
        if (mounted) setCameraAvailable(available);
      })
      .catch(() => {
        if (mounted) setCameraAvailable(Platform.OS !== 'web');
      });

    return () => {
      mounted = false;
    };
  }, [visible]);

  const overlayStyle = useMemo(() => (guide ? getOverlayStyle(guide.overlay) : null), [guide]);
  const qualityColors = capturedPreview ? getStatusColors(capturedPreview.quality.status) : null;

  const handleRetake = () => {
    setCapturedPreview(null);
  };

  const handleCapture = async () => {
    if (!cameraRef.current || !guide || busy || !cameraReady) return;

    setBusy(true);
    try {
      const picture = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        base64: Platform.OS === 'web',
      });

      const uri = normalizeCapturedUri(picture);
      const quality = await validateScanImageLocally(guide.key, uri);
      setCapturedPreview({ uri, quality });
    } finally {
      setBusy(false);
    }
  };

  const handleAccept = () => {
    if (!capturedPreview || capturedPreview.quality.status === 'block') return;
    onAccept(capturedPreview);
    onClose();
    setCapturedPreview(null);
  };

  if (!guide) {
    return null;
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>Guided Capture</Text>
            <Text style={styles.title}>{guide.title}</Text>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={22} color={Colors.primary.brown} />
          </TouchableOpacity>
        </View>

        {!capturedPreview ? (
          <>
            <View style={styles.cameraStage}>
              {cameraAvailable && permission?.granted ? (
                <CameraView
                  ref={cameraRef}
                  style={styles.camera}
                  facing="back"
                  onCameraReady={() => setCameraReady(true)}
                  onMountError={() => setCameraReady(false)}
                />
              ) : (
                <View style={styles.permissionState}>
                  {permission == null ? (
                    <>
                      <ActivityIndicator color="#FFF8EF" />
                      <Text style={styles.permissionTitle}>Checking camera access</Text>
                      <Text style={styles.permissionText}>Preparing the guided capture view.</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="camera-outline" size={34} color={Colors.neutral.textLight} />
                      <Text style={styles.permissionTitle}>
                        {cameraAvailable ? 'Camera access is required' : 'Live camera is unavailable here'}
                      </Text>
                      <Text style={styles.permissionText}>
                        {cameraAvailable
                          ? 'Enable camera access to use guided capture. You can still use the Gallery button on the previous screen.'
                          : 'This browser or device cannot open the live guided camera. Close this modal and use Gallery instead.'}
                      </Text>
                    </>
                  )}
                  {cameraAvailable && (permission == null || permission.canAskAgain) ? (
                    <TouchableOpacity style={styles.permissionButton} onPress={() => requestPermission()}>
                      <Text style={styles.permissionButtonText}>Enable camera</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              )}

              {cameraAvailable && permission?.granted ? (
                <>
                  <View style={styles.overlayMask} pointerEvents="none">
                    <View style={[styles.overlayFrame, overlayStyle]} />
                  </View>
                  <View style={styles.referenceCard}>
                    <Image source={guide.referenceImage} style={styles.referenceImage} resizeMode="contain" />
                    <Text style={styles.referenceTitle}>Match this framing</Text>
                    <Text style={styles.referenceHint}>{guide.liveHint}</Text>
                  </View>
                </>
              ) : null}
            </View>

            <View style={styles.bottomPanel}>
              <View style={styles.checklistCard}>
                <Text style={styles.sectionLabel}>Checklist</Text>
                {guide.checklist.map((item) => (
                  <View key={item} style={styles.checkRow}>
                    <Ionicons name="checkmark-circle" size={16} color={Colors.primary.orangeDark} />
                    <Text style={styles.checkText}>{item}</Text>
                  </View>
                ))}
                <Text style={styles.referenceText}>{guide.referenceText}</Text>
              </View>

              <TouchableOpacity
                style={[styles.captureButton, (!cameraAvailable || !permission?.granted || busy || !cameraReady) && styles.captureButtonDisabled]}
                onPress={handleCapture}
                disabled={!cameraAvailable || !permission?.granted || busy || !cameraReady}
              >
                {busy ? (
                  <ActivityIndicator color="#FFF9F2" />
                ) : (
                  <>
                    <Ionicons name="camera" size={18} color="#FFF9F2" />
                    <Text style={styles.captureButtonText}>Capture guided photo</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View style={styles.previewStage}>
            <View style={styles.previewFrame}>
              <AnnotatedCaptureImage
                uri={capturedPreview.uri}
                quality={capturedPreview.quality}
                style={styles.previewImage}
                accessibilityLabel={`${guide.title} captured image`}
              />
            </View>

            <View style={styles.previewCard}>
              <View style={styles.previewHeader}>
                <Text style={styles.sectionLabel}>Capture check</Text>
                <View style={[styles.qualityPill, { backgroundColor: qualityColors?.tint }]}>
                  <Text style={[styles.qualityPillText, { color: qualityColors?.tone }]}>
                    {capturedPreview.quality.label}
                  </Text>
                </View>
              </View>

              <Text style={styles.previewSummary}>{capturedPreview.quality.summary}</Text>

              {capturedPreview.quality.issues.map((issue) => (
                <View key={`${issue.code}-${issue.message}`} style={styles.issueRow}>
                  <Ionicons
                    name={issue.severity === 'block' ? 'alert-circle' : 'warning'}
                    size={16}
                    color={issue.severity === 'block' ? '#A14637' : '#9A6A16'}
                  />
                  <Text style={styles.issueText}>{issue.message}</Text>
                </View>
              ))}
            </View>

            <View style={styles.previewActions}>
              <TouchableOpacity style={styles.secondaryButton} onPress={handleRetake}>
                <Ionicons name="refresh" size={18} color={Colors.primary.brown} />
                <Text style={styles.secondaryButtonText}>Retake</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryButton, capturedPreview.quality.status === 'block' && styles.primaryButtonDisabled]}
                onPress={handleAccept}
                disabled={capturedPreview.quality.status === 'block'}
              >
                <Ionicons name="checkmark" size={18} color="#FFF9F2" />
                <Text style={styles.primaryButtonText}>
                  {capturedPreview.quality.status === 'warn' ? 'Use photo anyway' : 'Use this photo'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F5EFE7',
  },
  header: {
    paddingTop: 22,
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerCopy: {
    flex: 1,
    paddingRight: 12,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: Colors.neutral.textLight,
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.primary.brown,
  },
  closeButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFF8EF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E6D7C7',
  },
  cameraStage: {
    flex: 1,
    marginHorizontal: 20,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#1B1714',
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  overlayMask: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayFrame: {
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.92)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  referenceCard: {
    position: 'absolute',
    right: 14,
    top: 14,
    width: 168,
    borderRadius: 20,
    backgroundColor: 'rgba(255,248,239,0.96)',
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.65)',
  },
  referenceImage: {
    width: '100%',
    height: 92,
    borderRadius: 14,
    backgroundColor: '#FFF',
    marginBottom: 10,
  },
  referenceTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.primary.brown,
    marginBottom: 4,
  },
  referenceHint: {
    fontSize: 12,
    lineHeight: 17,
    color: '#6E6259',
    fontWeight: '600',
  },
  bottomPanel: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 14,
  },
  checklistCard: {
    backgroundColor: '#FFF9F3',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E6D9CA',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    color: Colors.neutral.textLight,
    marginBottom: 10,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  checkText: {
    flex: 1,
    fontSize: 14,
    color: Colors.primary.brown,
    fontWeight: '600',
  },
  referenceText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.neutral.textLight,
  },
  captureButton: {
    minHeight: 56,
    borderRadius: 20,
    backgroundColor: Colors.primary.brown,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  captureButtonDisabled: {
    opacity: 0.55,
  },
  captureButtonText: {
    color: '#FFF9F2',
    fontSize: 16,
    fontWeight: '800',
  },
  permissionState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  permissionTitle: {
    marginTop: 14,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    color: '#FFF8EF',
  },
  permissionText: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    color: 'rgba(255,248,239,0.78)',
  },
  permissionButton: {
    marginTop: 18,
    minHeight: 46,
    paddingHorizontal: 18,
    borderRadius: 16,
    backgroundColor: '#FFF8EF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionButtonText: {
    color: Colors.primary.brown,
    fontSize: 14,
    fontWeight: '800',
  },
  previewStage: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  previewFrame: {
    flex: 1,
    backgroundColor: '#FFF9F3',
    borderRadius: 28,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E6D9CA',
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewCard: {
    marginTop: 16,
    backgroundColor: '#FFF9F3',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E6D9CA',
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  qualityPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  qualityPillText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  previewSummary: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.primary.brown,
    fontWeight: '700',
  },
  issueRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  issueText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: '#6E6259',
    fontWeight: '600',
  },
  previewActions: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: '#FFF2E4',
    borderWidth: 1,
    borderColor: '#E8D4BB',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  secondaryButtonText: {
    color: Colors.primary.brown,
    fontSize: 15,
    fontWeight: '800',
  },
  primaryButton: {
    flex: 1.5,
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: Colors.primary.brown,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryButtonDisabled: {
    opacity: 0.45,
  },
  primaryButtonText: {
    color: '#FFF9F2',
    fontSize: 15,
    fontWeight: '800',
  },
});
