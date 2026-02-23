import React, { Dispatch, SetStateAction } from "react";
import { View, Text, ScrollView, StyleSheet, Image, TouchableOpacity } from "react-native";
import { CollapsibleResult } from "./CollapsibleResult";
import { Colors } from "@/constants/Colors";
import Button from "@/components/ui/Button";

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
      <Text style={styles.resultTitle}>Analysis Results</Text>
      <ScrollView style={styles.resultContent}>
        {analysisResult.results.map(({ analysisType, result }) => (
          <CollapsibleResult
            key={analysisType}
            analysisType={analysisType}
            result={result}
            imageUrl={uploadedImages[analysisType]}
          />
        ))}
      </ScrollView>
      <Button onPress={onRescan} style={styles.rescanButton} title={"Rescan"} />
    </View>
  );
}

const styles = StyleSheet.create({
  resultContainer: {
    flexGrow: 1,
    alignItems: "center",
    padding: 20,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.primary.brown,
    marginBottom: 10,
  },
  resultContent: {
    width: "100%",
    backgroundColor: Colors.neutral.background,
    borderRadius: 10,
    padding: 10,
  },
  rescanButton: {
    backgroundColor: Colors.primary.brown,
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginBottom: 10,
  },
});
