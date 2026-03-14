import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CollapsibleResult } from './CollapsibleResult';
import { Colors } from '@/constants/Colors';
import Button from '@/components/ui/Button';

export function AnalysisResult({
  analysisResult,
  onRescan,
  uploadedImages,
}: {
  analysisResult: {
    results: { analysisType: string; result: Record<string, string> }[];
  };
  onRescan: () => void;
  uploadedImages: Record<string, string>;
}) {
  return (
    <View style={styles.resultContainer}>
      <View style={styles.summaryCard}>
        <View style={styles.summaryIconWrap}>
          <Ionicons name="checkmark-done-circle" size={24} color="#FFF9F2" />
        </View>
        <View style={styles.summaryTextWrap}>
          <Text style={styles.resultTitle}>Scan results ready</Text>
          <Text style={styles.resultSubtitle}>
            Review each category below. Expand any card to see the source image and the extracted findings.
          </Text>
        </View>
      </View>

      <ScrollView style={styles.resultContent} showsVerticalScrollIndicator={false}>
        {analysisResult.results.map(({ analysisType, result }) => (
          <CollapsibleResult
            key={analysisType}
            analysisType={analysisType}
            result={result}
            imageUrl={uploadedImages[analysisType]}
          />
        ))}
      </ScrollView>

      <Button onPress={onRescan} style={styles.rescanButton} title="Start a new scan" />
    </View>
  );
}

const styles = StyleSheet.create({
  resultContainer: {
    flex: 1,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    backgroundColor: '#43372F',
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
  },
  summaryIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: Colors.primary.orangeDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryTextWrap: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFF9F2',
    marginBottom: 6,
  },
  resultSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255,249,242,0.8)',
  },
  resultContent: {
    borderRadius: 20,
  },
  rescanButton: {
    marginTop: 16,
    backgroundColor: Colors.primary.brown,
  },
});
