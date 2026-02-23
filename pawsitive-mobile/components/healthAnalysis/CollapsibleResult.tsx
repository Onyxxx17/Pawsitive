import React, { useState } from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";

export function CollapsibleResult({
  analysisType,
  result,
  imageUrl
}: {
  analysisType: string;
  result: Record<string, string>;
  imageUrl: string;
}) {
  const [collapsed, setCollapsed] = useState(true);

  return (
    <View style={styles.resultItem}>
      <TouchableOpacity
        onPress={() => setCollapsed(!collapsed)}
        style={styles.resultHeader}
      >
        <Text style={styles.resultText}>
          {analysisType.charAt(0).toUpperCase() + analysisType.slice(1).replace(/_/g, " ")}:
        </Text>
        <Ionicons
          name={collapsed ? "chevron-down" : "chevron-up"}
          size={24}
          color={Colors.primary.brown}
        />
      </TouchableOpacity>
      {!collapsed && (
        <View style={styles.resultDetails}>
          {imageUrl && (
            <Image
              source={{ uri: imageUrl }}
              style={styles.resultImage}
              resizeMode="contain"
            />
          )}
          <View style={styles.feedbackContainer}>
            {Object.keys(result).map((key:string) => (
              <View key={key} style={styles.feedbackItem}>
                <Text style={styles.feedbackField}>
                  {key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " ")}:
                </Text>
                <Text style={styles.feedbackValue}>
                  {result[key]}
                </Text>
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
    marginBottom: 15,
  },
  resultHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    padding: 10,
    backgroundColor: Colors.primary.orangeDark, // Set primary color as background
    borderRadius: 10,
    marginBottom: 10,
  },
  resultText: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.neutral.text, // Ensure text is visible on primary background
  },
  resultDetails: {
    padding: 10,
    backgroundColor: Colors.primary.orange, // Match background color of header
    borderRadius: 10,
  },
  resultImage: {
    width: "100%", // Full width of the container
    aspectRatio: 1.5, // Maintains a 3:2 aspect ratio
    borderRadius: 10,
    marginBottom: 10,
  },
  feedbackContainer: {
    marginTop: 10,
  },
  feedbackItem: {
    flexDirection: "row",
    marginBottom: 5,
    flexWrap: "wrap", // Prevent text from overflowing
  },
  feedbackField: {
    fontWeight: "bold",
    marginRight: 5,
  },
  feedbackValue: {
    color: Colors.neutral.text,
    flexShrink: 1, // Ensure text stays within boundaries
  },
});