import React, { useMemo, useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

const analysisLabels: Record<string, string> = {
  mood_analysis: 'Mood Scan',
  coat_and_body_condition: 'Coat and Body',
  teeth_and_gums: 'Teeth and Gums',
  poop_analysis: 'Poop Check',
  body_weight: 'Body Weight',
};

export function CollapsibleResult({
  analysisType,
  result,
  imageUrl,
}: {
  analysisType: string;
  result: Record<string, string>;
  imageUrl: string;
}) {
  const [collapsed, setCollapsed] = useState(false);

  const formattedEntries = useMemo(
    () =>
      Object.entries(result).map(([key, value]) => ({
        key,
        label: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
        value: String(value),
      })),
    [result],
  );

  return (
    <View style={styles.resultItem}>
      <TouchableOpacity onPress={() => setCollapsed((prev) => !prev)} style={styles.resultHeader} activeOpacity={0.85}>
        <View style={styles.resultHeaderText}>
          <Text style={styles.resultEyebrow}>Scan Result</Text>
          <Text style={styles.resultText}>{analysisLabels[analysisType] || analysisType}</Text>
        </View>
        <View style={styles.chevronWrap}>
          <Ionicons
            name={collapsed ? 'chevron-down' : 'chevron-up'}
            size={20}
            color={Colors.primary.brown}
          />
        </View>
      </TouchableOpacity>

      {!collapsed && (
        <View style={styles.resultDetails}>
          {imageUrl ? <Image source={{ uri: imageUrl }} style={styles.resultImage} resizeMode="cover" /> : null}
          <View style={styles.feedbackContainer}>
            {formattedEntries.map((entry) => (
              <View key={entry.key} style={styles.feedbackItem}>
                <Text style={styles.feedbackField}>{entry.label}</Text>
                <Text style={styles.feedbackValue}>{entry.value}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  resultItem: {
    marginBottom: 14,
    backgroundColor: '#FFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E9DCCD',
    overflow: 'hidden',
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFF8EF',
  },
  resultHeaderText: {
    flex: 1,
  },
  resultEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: Colors.neutral.textLight,
    marginBottom: 4,
  },
  resultText: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.primary.brown,
  },
  chevronWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: '#F7E7D7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultDetails: {
    padding: 14,
    backgroundColor: '#FFFCF8',
  },
  resultImage: {
    width: '100%',
    height: 180,
    borderRadius: 16,
    marginBottom: 14,
  },
  feedbackContainer: {
    gap: 10,
  },
  feedbackItem: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#FFF4E8',
  },
  feedbackField: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    color: '#A06B45',
    marginBottom: 6,
  },
  feedbackValue: {
    fontSize: 15,
    lineHeight: 21,
    color: Colors.primary.brown,
  },
});
