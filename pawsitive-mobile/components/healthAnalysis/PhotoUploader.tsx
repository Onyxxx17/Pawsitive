import React, { Dispatch, SetStateAction } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Image,
  ScrollView
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Colors } from "@/constants/Colors";

const analysisTypes = {
  mood_analysis: "Mood Analysis",
  coat_and_body_condition: "Coat and Body Analysis",
  teeth_and_gums: "Teeth and Gums Analysis",
  poop_analysis: "Poop Analysis",
  body_weight: "Body Weight Analysis"
};

export function PhotoUploader({ 
  onAllImagesSelected,
  loading,
  setLoading,
  uploadedImages,
  setUploadedImages
 }: { 
  onAllImagesSelected: (images: Record<string, string>) => void,
  loading: boolean,
  setLoading: Dispatch<SetStateAction<boolean>>,
  uploadedImages: Record<string, string>,
  setUploadedImages: Dispatch<SetStateAction<Record<string, string>>>
  }) 
{
  const handleImageSelected = (analysis: string, uri: string) => {
    setUploadedImages((prev) => {
      const updatedImages = { ...prev, [analysis]: uri };
      return updatedImages;
    });
  };

  const openCamera = async (analysis: string) => {
    const { granted } = await ImagePicker.requestCameraPermissionsAsync();
    if (!granted) {
      Alert.alert("Permission Required", "Camera access is needed.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
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
      Alert.alert("Permission Required", "Gallery access is needed.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      handleImageSelected(analysis, result.assets[0].uri);
    }
  };

  const handleSubmit = () => {
    if (Object.keys(uploadedImages).length === Object.keys(analysisTypes).length) {
      setLoading(true);
      onAllImagesSelected(uploadedImages);
    } else {
      Alert.alert("Incomplete", "Please upload images for all analyses.");
    }
  };

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { paddingBottom: 80 }]} // Add padding to avoid TabBar overlap
      showsVerticalScrollIndicator={false}
    >
      {Object.entries(analysisTypes).map(([key, value]) => (
        <View key={key} style={styles.analysisContainer}>
          <Text style={styles.analysisTitle}>{value}</Text>
          {uploadedImages[key] ? (
            <>
              <Image source={{ uri: uploadedImages[key] }} style={styles.imagePreview} />
              <TouchableOpacity
                style={[styles.btn, styles.secondaryBtn, loading && styles.btnDisabled]}
                onPress={() => pickImage(key)}
                disabled={loading}
              >
                <Ionicons name="images" size={24} color="#fff" />
                <Text style={styles.btnText}>Reupload</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.btn, loading && styles.btnDisabled]}
                onPress={() => openCamera(key)}
                disabled={loading}
              >
                <Ionicons name="camera" size={24} color="#fff" />
                <Text style={styles.btnText}>Take Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btn, styles.secondaryBtn, loading && styles.btnDisabled]}
                onPress={() => pickImage(key)}
                disabled={loading}
              >
                <Ionicons name="images" size={24} color="#fff" />
                <Text style={styles.btnText}>Upload from Gallery</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      ))}

      <TouchableOpacity
        style={[styles.submitBtn, loading && styles.btnDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        <Text style={styles.submitBtnText}>{loading ? "Submitting..." : "Submit All"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  analysisContainer: {
    marginBottom: 30,
  },
  analysisTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    color: Colors.neutral.text,
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginBottom: 10,
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
  btnDisabled: {
    backgroundColor: Colors.primary.orange,
  },
  secondaryBtn: { backgroundColor: Colors.primary.orangeDark },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  submitBtn: {
    backgroundColor: Colors.primary.orangeDark,
    padding: 18,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  submitBtnText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});