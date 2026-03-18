import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { PhotoUploader } from '@/components/healthAnalysis/PhotoUploader';
import { AnalysisResult } from '@/components/healthAnalysis/AnalysisResult';
import { supabase } from '@/lib/supabase';
import { usePet } from '@/context/PetContext';

type ScanResultEntry = {
  analysisType: string;
  result: Record<string, any> | null;
};

type ScanResultPayload = {
  results: ScanResultEntry[];
};

const ANALYSIS_TO_CHECK_TYPE: Record<string, 'coat' | 'fit' | 'teeth' | 'poop' | 'face'> = {
  mood_analysis: 'face',
  coat_and_body_condition: 'coat',
  teeth_and_gums: 'teeth',
  poop_analysis: 'poop',
  body_weight: 'fit',
};

const normalizeScore = (value: unknown): number | null => {
  const raw = Number(value);
  if (!Number.isFinite(raw)) return null;

  const normalized = raw <= 10 ? raw * 10 : raw;
  // health_checks.score is DECIMAL(3,1), so max storable value is 99.9
  const bounded = Math.max(0, Math.min(99.9, normalized));
  return Number(bounded.toFixed(1));
};

const normalizeConfidence = (value: unknown): number | null => {
  const raw = Number(value);
  if (!Number.isFinite(raw)) return null;

  const normalized = raw > 1 ? raw / 100 : raw;
  const bounded = Math.max(0, Math.min(1, normalized));
  return Number(bounded.toFixed(2));
};

export default function CameraScreen() {
  const { activePet } = usePet();
  const [uploadedImages, setUploadedImages] = useState<Record<string, string>>({});
  const [analysisResult, setAnalysisResult] = useState<ScanResultPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingResults, setSavingResults] = useState(false);
  const [resultsSaved, setResultsSaved] = useState(false);

  const getFileInfo = (uri: string) => {
    const cleanUri = uri.split('?')[0].split('#')[0];
    const fileExtension = cleanUri.split('.').pop()?.toLowerCase();
    let type = 'image/jpeg';

    if (fileExtension === 'png') type = 'image/png';
    if (fileExtension === 'webp') type = 'image/webp';

    return {
      uri,
      extension: fileExtension,
      name: `upload.${fileExtension || 'jpg'}`,
      type,
    };
  };

  const getUploadPayload = async (uri: string): Promise<any> => {
    const fileInfo = getFileInfo(uri);
    const extension = ['jpg', 'jpeg', 'png', 'webp'].includes(fileInfo.extension || '') ? fileInfo.extension : 'jpg';
    const name = `upload.${extension}`;

    if (Platform.OS === 'web') {
      const blobResp = await fetch(uri);
      const blob = await blobResp.blob();
      const mimeType = blob.type?.startsWith('image/') ? blob.type : fileInfo.type;
      return new File([blob], name, { type: mimeType });
    }

    return {
      uri,
      name,
      type: fileInfo.type,
    } as any;
  };

  const uploadScanPhoto = async (userId: string, petId: string, analysisType: string, uri: string): Promise<string> => {
    const rawExt = (uri.split('?')[0].split('.').pop() ?? 'jpg').toLowerCase();
    const normalizedExt = rawExt === 'jpg' ? 'jpeg' : rawExt;
    const extension = ['jpeg', 'png', 'webp'].includes(normalizedExt) ? normalizedExt : 'jpeg';
    const fileName = `${analysisType}-${Date.now()}-${Math.floor(Math.random() * 100000)}.${extension}`;
    const filePath = `health_scans/${userId}/${petId}/${fileName}`;
    const mimeType = `image/${extension}`;

    try {
      let storagePayload: any;
      let uploadContentType = mimeType;
      if (Platform.OS === 'web') {
        const blobResp = await fetch(uri);
        const blob = await blobResp.blob();
        const uploadType = blob.type?.startsWith('image/') ? blob.type : mimeType;
        uploadContentType = uploadType;
        storagePayload = new File([blob], fileName, { type: uploadType });
      } else {
        storagePayload = { uri, name: fileName, type: mimeType } as any;
      }

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, storagePayload, {
          contentType: uploadContentType,
          upsert: false,
        });

      if (uploadError) {
        console.error(`Failed to upload scan image for ${analysisType}:`, uploadError);
        return uri;
      }

      const { data } = supabase.storage.from('images').getPublicUrl(filePath);
      return data.publicUrl || uri;
    } catch (error) {
      console.error(`Unexpected upload error for ${analysisType}:`, error);
      return uri;
    }
  };

  const persistAnalysisResults = async (payload: ScanResultPayload, images: Record<string, string>): Promise<boolean> => {
    if (!payload?.results?.length) return false;

    if (!activePet?.id || activePet.id === 'default') {
      Alert.alert(
        'Select a pet to save scans',
        'Your analysis finished, but scan history can only be saved after choosing a pet profile.'
      );
      return false;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const preparedRows = (
      await Promise.all(
        payload.results.map(async ({ analysisType, result }) => {
          const checkType = ANALYSIS_TO_CHECK_TYPE[analysisType];
          if (!checkType) return null;

          const sourceUri = images[analysisType];
          const imageUrl = sourceUri
            ? await uploadScanPhoto(user.id, activePet.id, analysisType, sourceUri)
            : `local://${analysisType}`;

          return {
            pet_id: activePet.id,
            check_type: checkType,
            image_url: imageUrl,
            score: normalizeScore(result?.score),
            confidence: normalizeConfidence(result?.confidence_score ?? result?.confidence),
            analysis_json: result ?? {},
            status: 'complete',
            model_version: 'gemini',
          };
        }),
      )
    ).filter((row): row is NonNullable<typeof row> => row !== null);

    if (!preparedRows.length) return false;

    const { error } = await supabase.from('health_checks').insert(preparedRows);
    if (error) {
      throw error;
    }

    return true;
  };

  const uploadImages = async (images: Record<string, string>) => {
    setLoading(true);
    try {
      const formData = new FormData();
      for (const [analysisType, uri] of Object.entries(images)) {
        const filePayload = await getUploadPayload(uri);
        formData.append('photos', filePayload);
        formData.append('analysisTypes', analysisType);
      }

      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_API_URL}/analyze`, {
        method: 'POST',
        body: formData,
      });

      const raw = await response.text();
      let data: any = null;
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch {
        data = raw;
      }

      if (response.ok) {
        setAnalysisResult(data as ScanResultPayload);
        setResultsSaved(false);
      } else {
        const errorDetail =
          (typeof data === 'object' && (data?.detail || data?.response || data?.msg || data?.error_description)) ||
          (typeof data === 'string' ? data : null) ||
          `Failed to analyze the photos (HTTP ${response.status}).`;
        throw new Error(errorDetail);
      }
    } catch (error) {
      console.error(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleSaveResults = async () => {
    if (!analysisResult || resultsSaved || savingResults) return;

    setSavingResults(true);
    try {
      const saved = await persistAnalysisResults(analysisResult, uploadedImages);
      if (saved) {
        setResultsSaved(true);
        Alert.alert('Saved', 'Scan results were added to your health history.');
      }
    } catch (persistError: any) {
      console.error('Failed to persist health checks:', persistError);
      const detail = String(persistError?.message || 'Could not save scan history. Please try again.');
      Alert.alert('Save failed', detail);
    } finally {
      setSavingResults(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={['#FFF6EA', '#F4E3D2']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroBadge}>
            <Ionicons name="scan" size={18} color={Colors.primary.brown} />
            <Text style={styles.heroBadgeText}>Health Scan Studio</Text>
          </View>
          <Text style={styles.heroTitle}>
            {analysisResult ? 'Review your scan results' : 'Capture clearer pet scans'}
          </Text>
          <Text style={styles.heroSubtitle}>
            {analysisResult
              ? 'Each panel keeps the image and findings together so it is easier to compare results.'
              : 'Upload each guided photo once, then send the full set for analysis in a single pass.'}
          </Text>
        </LinearGradient>

        {!analysisResult ? (
          <PhotoUploader
            onAllImagesSelected={async (images) => {
              setUploadedImages(images);
              await uploadImages(images);
            }}
            loading={loading}
            setLoading={setLoading}
            uploadedImages={uploadedImages}
            setUploadedImages={setUploadedImages}
          />
        ) : (
          <AnalysisResult
            analysisResult={analysisResult}
            onSaveResults={handleSaveResults}
            saveDisabled={resultsSaved || savingResults}
            saveTitle={savingResults ? 'Saving...' : resultsSaved ? 'Saved to history' : 'Save scan results'}
            onRescan={() => {
              setAnalysisResult(null);
              setUploadedImages({});
              setLoading(false);
              setSavingResults(false);
              setResultsSaved(false);
            }}
            uploadedImages={uploadedImages}
          />
        )}
      </ScrollView>

      {loading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={Colors.primary.brown} />
            <Text style={styles.loadingTitle}>Analyzing photos</Text>
            <Text style={styles.loadingText}>Processing each scan and organizing the results.</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8F4ED',
  },
  content: {
    padding: 20,
    paddingBottom: 120,
  },
  hero: {
    borderRadius: 28,
    padding: 22,
    marginBottom: 18,
    shadowColor: '#A66A42',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 4,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 18,
  },
  heroBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary.brown,
  },
  heroTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    color: Colors.primary.brown,
    marginBottom: 10,
    maxWidth: '90%',
  },
  heroSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: '#6F6057',
    maxWidth: '94%',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(67,55,47,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingCard: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 24,
    backgroundColor: '#FFF9F3',
    padding: 24,
    alignItems: 'center',
  },
  loadingTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primary.brown,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    color: Colors.neutral.textLight,
  },
});
