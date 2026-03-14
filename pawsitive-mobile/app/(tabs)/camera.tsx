import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { PhotoUploader } from '@/components/healthAnalysis/PhotoUploader';
import { AnalysisResult } from '@/components/healthAnalysis/AnalysisResult';

export default function CameraScreen() {
  const [uploadedImages, setUploadedImages] = useState<Record<string, string>>({});
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  const getFileInfo = (uri: string) => {
    const fileExtension = uri.split('.').pop()?.toLowerCase();
    let type = 'image/jpeg';

    if (fileExtension === 'png') type = 'image/png';
    if (fileExtension === 'webp') type = 'image/webp';

    return {
      uri,
      name: `upload.${fileExtension || 'jpg'}`,
      type,
    };
  };

  const uploadImages = async (images: Record<string, string>) => {
    setLoading(true);
    try {
      const formData = new FormData();
      Object.entries(images).forEach(([analysisType, uri]) => {
        const filePayload = getFileInfo(uri) as any;
        formData.append('photos', filePayload);
        formData.append('analysisTypes', analysisType);
      });

      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_API_URL}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      const data = await response.json();
      if (response.ok) {
        setAnalysisResult(data);
      } else {
        throw new Error(data.response || 'Failed to analyze the photos.');
      }
    } catch (error) {
      console.error(error);
      throw error;
    } finally {
      setLoading(false);
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
            onRescan={() => {
              setAnalysisResult(null);
              setUploadedImages({});
              setLoading(false);
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
