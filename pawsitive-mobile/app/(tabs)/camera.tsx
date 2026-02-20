import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Colors } from "@/constants/Colors";

export default function CameraScreen() {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 1. Helper to determine Mime Type from URI
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

  // 2. Refactored Upload Logic
  const uploadImage = async (photoUri: string) => {
    setLoading(true);
    try {
      const formData = new FormData();
      // Use our helper to format the photo object
      const filePayload = getFileInfo(photoUri) as any;
      formData.append("photo", filePayload);

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
        Alert.alert("Analysis Result", data.response || "No text found.");
      } else {
        Alert.alert("Error", data.response || "Failed to analyze the photo.");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "An error occurred while sending the photo.");
    } finally {
      setLoading(false);
    }
  };

  // 3. Launch Camera
  const openCamera = async () => {
    const { granted } = await ImagePicker.requestCameraPermissionsAsync();
    if (!granted) {
      Alert.alert("Permission Required", "Camera access is needed.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"], // Supports jpeg, png, etc.
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
      uploadImage(result.assets[0].uri);
    }
  };

  // 4. Launch Gallery (Supports PNG, WEBP, JPEG)
  const pickImage = async () => {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) {
      Alert.alert("Permission Required", "Gallery access is needed.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
      uploadImage(result.assets[0].uri);
    }
  };

  return (
    <View style={styles.container}>
      {image ? (
        <View style={styles.previewContainer}>
          <Image source={{ uri: image }} style={styles.preview} />
          {loading ? (
            <ActivityIndicator
              size="large"
              color={Colors.primary.brown}
              style={{ marginTop: 20 }}
            />
          ) : (
            <TouchableOpacity
              onPress={() => setImage(null)}
              style={styles.retryBtn}
            >
              <Text style={{ color: "#fff" }}>Scan Another</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons
            name="scan-circle"
            size={100}
            color={Colors.primary.orangeDark}
          />
          <Text style={styles.title}>AI Health Scan</Text>
          <Text style={styles.subtitle}>
            Take a photo or upload one for an instant check.
          </Text>

          <TouchableOpacity style={styles.btn} onPress={openCamera}>
            <Ionicons name="camera" size={24} color="#fff" />
            <Text style={styles.btnText}>Take Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, styles.secondaryBtn]}
            onPress={pickImage}
          >
            <Ionicons name="images" size={24} color="#fff" />
            <Text style={styles.btnText}>Upload from Gallery</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
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
});
