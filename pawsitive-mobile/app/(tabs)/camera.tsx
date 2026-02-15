import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '@/constants/Colors';

export default function CameraScreen() {
  const [image, setImage] = useState<string | null>(null);

  const openCamera = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert("Permission Required", "Camera access is needed.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled) {
      setImage(result.assets[0].uri);
      Alert.alert("Photo Taken", "Analyzing photo...");
    }
  };

  return (
    <View style={styles.container}>
      {image ? (
        <View style={styles.previewContainer}>
          <Image source={{ uri: image }} style={styles.preview} />
          <TouchableOpacity onPress={() => setImage(null)} style={styles.retryBtn}>
            <Text style={{color:'#fff'}}>Scan Another</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="scan-circle" size={100} color={Colors.primary.orangeDark} />
          <Text style={styles.title}>AI Health Scan</Text>
          <Text style={styles.subtitle}>Take a photo of your pet for an instant health check.</Text>
          
          <TouchableOpacity style={styles.btn} onPress={openCamera}>
            <Ionicons name="camera" size={24} color="#fff" />
            <Text style={styles.btnText}>Open Camera</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.neutral.background },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  title: { fontSize: 24, fontWeight: 'bold', marginTop: 20, marginBottom: 10, color: Colors.neutral.text },
  subtitle: { textAlign: 'center', color: Colors.neutral.textLight, marginBottom: 40 },
  btn: { backgroundColor: Colors.primary.brown, flexDirection: 'row', padding: 18, width: '100%', borderRadius: 16, justifyContent: 'center', alignItems: 'center', gap: 10 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  previewContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  preview: { width: '100%', height: '70%', resizeMode: 'contain' },
  retryBtn: { marginTop: 20, backgroundColor: Colors.primary.brown, padding: 15, borderRadius: 10 },
});