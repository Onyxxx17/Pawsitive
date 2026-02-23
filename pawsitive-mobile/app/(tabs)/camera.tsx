import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Colors } from "@/constants/Colors";
import { PhotoUploader } from "@/components/healthAnalysis/PhotoUploader";
import { AnalysisResult } from "@/components/healthAnalysis/AnalysisResult";

const analysisTypes = {
  mood_analysis: "Mood Analysis",
  coat_and_body_condition: "Coat and Body Analysis",
  teeth_and_gums: "Teeth and Gums Analysis",
  poop_analysis: "Poop Analysis",
  body_weight: "Body Weight Analysis"
};

export default function CameraScreen() {
  const [uploadedImages, setUploadedImages] = useState<Record<string, string>>({});
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  const getFileInfo = (uri: string) => {
    const fileExtension = uri.split(".").pop()?.toLowerCase();
    let type = "image/jpeg"; // Default

    if (fileExtension === "png") type = "image/png";
    if (fileExtension === "webp") type = "image/webp";

    return {
      uri,
      name: `upload.${fileExtension || "jpg"}`,
      type,
    };
  };

  const uploadImages = async (images: Record<string, string>) => {
    setLoading(true);
    try {
      const formData = new FormData();
      Object.entries(images).forEach(([analysisType, uri]) => {
        const filePayload = getFileInfo(uri) as any;
        formData.append("photos", filePayload);
        formData.append("analysisTypes", analysisType);
      });

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_BACKEND_API_URL}/analyze`,
        {
          method: "POST",
          headers: {
            "Content-Type": "multipart/form-data",
          },
          body: formData,
        },
      );

      const data = await response.json();
      if (response.ok) {
        setAnalysisResult(data);
      } else {
        Alert.alert("Error", data.response || "Failed to analyze the photos.");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "An error occurred while sending the photos.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {!analysisResult ? (
        <PhotoUploader
          onAllImagesSelected={(images) => {
            setUploadedImages(images);
            uploadImages(images);
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

      {loading && (
        <ActivityIndicator
          size="large"
          color={Colors.primary.brown}
          style={{ marginTop: 20 }}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.neutral.background },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 10,
    color: Colors.neutral.text,
  },
  subtitle: {
    textAlign: "center",
    color: Colors.neutral.textLight,
    marginBottom: 40,
  },
  btn: {
    backgroundColor: Colors.primary.brown,
    flexDirection: "row",
    padding: 18,
    width: "100%",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    marginBottom: 15,
  },
  secondaryBtn: { backgroundColor: Colors.primary.orangeDark },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  previewContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  preview: { width: "100%", height: "70%", resizeMode: "contain" },
  retryBtn: {
    marginTop: 20,
    backgroundColor: Colors.primary.brown,
    padding: 15,
    borderRadius: 10,
  },
  disabledBtn: {
    backgroundColor: Colors.neutral.textLight,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    width: "80%",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 20,
  },
  modalButton: {
    backgroundColor: Colors.primary.brown,
    padding: 15,
    borderRadius: 10,
    width: "100%",
    alignItems: "center",
    marginBottom: 10,
  },
  modalButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  cancelButton: {
    backgroundColor: Colors.neutral.textLight,
  },
  resultContainer: {
    flexGrow: 1,
    alignItems: "center",
    padding: 20,
  },
  resultImage: {
    width: "100%",
    height: 300,
    resizeMode: "contain",
    marginBottom: 20,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
  },
  resultText: {
    fontSize: 16,
    marginBottom: 5,
  },
  resultFeedback: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: "center",
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
  },
  resultContent: {
    flexGrow: 1,
    alignItems: "center",
    padding: 20,
  },
});
