import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { createImageUploadPayload, isRemoteImageUri } from '@/lib/imageUpload';
import * as ImagePicker from 'expo-image-picker';

export default function EditPetScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  
  // Form fields
  const [petName, setPetName] = useState('');
  const [species, setSpecies] = useState('dog');
  const [breed, setBreed] = useState('');
  const [gender, setGender] = useState('');
  const [dob, setDob] = useState('');
  const [weight, setWeight] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [existingConditions, setExistingConditions] = useState('');
  const [neutered, setNeutered] = useState<boolean | null>(null);
  const [microchipId, setMicrochipId] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchPetData();
  }, [id]);

  const fetchPetData = async () => {
    if (!id) {
      console.log('No pet ID provided!');
      Alert.alert('Error', 'No pet ID provided');
      router.back();
      return;
    }
    
    console.log('Fetching pet data for ID:', id);
    setLoading(true);
    const { data, error } = await supabase
      .from('pets')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching pet:', error);
      Alert.alert('Error', `Failed to load pet data: ${error.message}`);
      router.back();
      return;
    }

    if (data) {
      console.log('Pet data loaded:', data);
      setPetName(data.name || '');
      setSpecies(data.species || 'dog');
      setBreed(data.breed || '');
      setGender(data.gender || '');
      setDob(data.date_of_birth || '');
      setWeight(data.weight_kg ? data.weight_kg.toString() : '');
      setPhotoUri(data.profile_photo_url || null);
      setExistingConditions(
        Array.isArray(data.existing_conditions) 
          ? data.existing_conditions.join(', ') 
          : ''
      );
      setNeutered(data.is_neutered);
      setMicrochipId(data.microchip_id || '');
      setNotes(data.notes || '');
    }
    setLoading(false);
  };

  const handlePickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Please allow photo library access.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const uploadPhoto = async (userId: string): Promise<string | null> => {
    if (!photoUri || isRemoteImageUri(photoUri)) {
      return photoUri; // Already uploaded
    }

    try {
      setUploadingPhoto(true);
      const uploadBaseName = `photo-${Date.now()}`;
      const { file, fileName, mimeType } = await createImageUploadPayload(photoUri, uploadBaseName);
      const filePath = `pet_profiles/${userId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file, {
          contentType: mimeType,
          upsert: false 
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return photoUri;
      }

      const { data } = supabase.storage.from('images').getPublicUrl(filePath);
      return data.publicUrl;
    } catch (error) {
      console.error('Photo upload failed:', error);
      return photoUri;
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = async () => {
    if (!petName.trim()) {
      Alert.alert("Missing Info", "Please enter your pet's name.");
      return;
    }

    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        Alert.alert("Error", "Please log in first.");
        setSaving(false);
        return;
      }

      // Upload photo if changed
      let photoUrl: string | null = photoUri;
      if (photoUri && !isRemoteImageUri(photoUri)) {
        photoUrl = await uploadPhoto(user.id);
      }

      // Update pet in database
      const { error } = await supabase
        .from('pets')
        .update({
          name: petName.trim(),
          species: species.toLowerCase(),
          breed: breed.trim() || null,
          gender: gender ? gender.toLowerCase() : null,
          date_of_birth: dob || null,
          weight_kg: weight ? parseFloat(weight) : null,
          profile_photo_url: photoUrl,
          existing_conditions: existingConditions.trim() 
            ? existingConditions.split(',').map(c => c.trim()).filter(c => c) 
            : [],
          is_neutered: neutered,
          microchip_id: microchipId.trim() || null,
          notes: notes.trim() || null,
        })
        .eq('id', id);

      setSaving(false);

      if (error) {
        Alert.alert("Error", error.message);
      } else {
        Alert.alert("Success!", "Pet profile updated!", [
          { text: "OK", onPress: () => router.back() }
        ]);
      }
    } catch (err: any) {
      setSaving(false);
      Alert.alert("Error", err.message || "Failed to update pet profile");
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Pet",
      `Are you sure you want to delete ${petName}? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase
              .from('pets')
              .delete()
              .eq('id', id);

            if (error) {
              Alert.alert("Error", error.message);
            } else {
              Alert.alert("Deleted", "Pet profile has been deleted.", [
                { text: "OK", onPress: () => router.back() }
              ]);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary.orangeDark} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary.brown} />
        </TouchableOpacity>
        <Text style={styles.title}>Edit {petName || 'Pet'}</Text>
        <Text style={styles.subtitle}>
          {id ? `ID: ${id.toString().substring(0, 8)}...` : 'No ID received'}
        </Text>
      </View>

      <View style={styles.form}>
        {/* Photo Upload */}
        <View style={styles.photoSection}>
          <Text style={styles.label}>Pet Photo</Text>
          <TouchableOpacity 
            style={styles.photoContainer} 
            onPress={handlePickPhoto}
            disabled={uploadingPhoto}
          >
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.photo} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Ionicons name="camera" size={40} color={Colors.neutral.textLight} />
                <Text style={styles.photoHint}>Tap to add photo</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Pet Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Pet Name *</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="paw-outline" size={20} color={Colors.neutral.textLight} />
            <TextInput
              style={styles.input}
              placeholder="e.g., Buddy"
              value={petName}
              onChangeText={setPetName}
            />
          </View>
        </View>

        {/* Species */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Species *</Text>
          <View style={styles.typeRow}>
            {['dog', 'cat'].map((type) => (
              <TouchableOpacity
                key={type}
                style={[styles.typeBtn, species === type && styles.typeBtnActive]}
                onPress={() => setSpecies(type)}
              >
                <Ionicons 
                  name={type === 'dog' ? 'paw' : 'heart'} 
                  size={22} 
                  color={species === type ? Colors.primary.orangeDark : Colors.neutral.textLight} 
                />
                <Text style={[styles.typeText, species === type && styles.typeTextActive]}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Breed */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Breed</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="flask-outline" size={20} color={Colors.neutral.textLight} />
            <TextInput
              style={styles.input}
              placeholder="e.g., Golden Retriever"
              value={breed}
              onChangeText={setBreed}
            />
          </View>
        </View>

        {/* Gender */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Gender</Text>
          <View style={styles.typeRow}>
            {[
              { label: 'Male', value: 'male', icon: 'male' },
              { label: 'Female', value: 'female', icon: 'female' }
            ].map((g) => (
              <TouchableOpacity
                key={g.value}
                style={[styles.typeBtn, gender === g.value && styles.typeBtnActive]}
                onPress={() => setGender(g.value)}
              >
                <Ionicons 
                  name={g.icon as any} 
                  size={20} 
                  color={gender === g.value ? Colors.primary.orangeDark : Colors.neutral.textLight} 
                />
                <Text style={[styles.typeText, gender === g.value && styles.typeTextActive]}>{g.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Date of Birth */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Date of Birth (YYYY-MM-DD)</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="calendar-outline" size={20} color={Colors.neutral.textLight} />
            <TextInput
              style={styles.input}
              placeholder="2020-05-15"
              value={dob}
              onChangeText={setDob}
            />
          </View>
        </View>

        {/* Weight */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Weight (kg)</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="fitness-outline" size={20} color={Colors.neutral.textLight} />
            <TextInput
              style={styles.input}
              placeholder="e.g., 25.5"
              value={weight}
              onChangeText={setWeight}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        {/* Neutered/Spayed */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Neutered/Spayed?</Text>
          <View style={styles.typeRow}>
            {[
              { label: 'Yes', value: true },
              { label: 'No', value: false },
              { label: 'Unknown', value: null }
            ].map((option) => (
              <TouchableOpacity
                key={option.label}
                style={[styles.typeBtn, neutered === option.value && styles.typeBtnActive]}
                onPress={() => setNeutered(option.value)}
              >
                <Text style={[styles.typeText, neutered === option.value && styles.typeTextActive]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Microchip ID */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Microchip ID</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="hardware-chip-outline" size={20} color={Colors.neutral.textLight} />
            <TextInput
              style={styles.input}
              placeholder="e.g., 123456789012345"
              value={microchipId}
              onChangeText={setMicrochipId}
            />
          </View>
        </View>

        {/* Existing Medical Conditions */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Existing Medical Conditions</Text>
          <Text style={styles.hint}>Separate multiple conditions with commas</Text>
          <View style={[styles.inputContainer, styles.textArea]}>
            <TextInput
              style={[styles.input, styles.textAreaInput]}
              placeholder="e.g., Allergies, Arthritis, Hip dysplasia"
              value={existingConditions}
              onChangeText={setExistingConditions}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Notes */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Additional Notes</Text>
          <View style={[styles.inputContainer, styles.textArea]}>
            <TextInput
              style={[styles.input, styles.textAreaInput]}
              placeholder="Any other important information about your pet..."
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Buttons */}
        <TouchableOpacity
          style={[styles.saveBtn, (saving || uploadingPhoto) && styles.btnDisabled]}
          onPress={handleSave}
          disabled={saving || uploadingPhoto}
        >
          <Text style={styles.saveText}>
            {saving ? 'Saving...' : uploadingPhoto ? 'Uploading photo...' : 'Save Changes'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
          <Ionicons name="trash-outline" size={20} color={Colors.health.poor} />
          <Text style={styles.deleteText}>Delete Pet Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { paddingBottom: 40 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  header: { padding: 24, paddingTop: 60, backgroundColor: Colors.neutral.background },
  backBtn: { marginBottom: 20 },
  title: { fontSize: 28, fontWeight: '800', color: Colors.primary.brown, marginBottom: 8 },
  subtitle: { fontSize: 16, color: Colors.neutral.textLight },
  form: { padding: 24, gap: 20 },
  
  // Photo
  photoSection: { alignItems: 'center', marginBottom: 10 },
  photoContainer: { width: 120, height: 120, borderRadius: 60, overflow: 'hidden', marginTop: 8 },
  photo: { width: '100%', height: '100%' },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.neutral.border,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.neutral.border,
    borderStyle: 'dashed',
  },
  photoHint: { fontSize: 12, color: Colors.neutral.textLight, marginTop: 8 },
  
  // Form fields
  inputGroup: { gap: 8 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.primary.brown },
  hint: { fontSize: 12, color: Colors.neutral.textLight, marginTop: -4 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 1,
    borderColor: '#eee',
    gap: 12,
  },
  textArea: { 
    height: 'auto', 
    minHeight: 100,
    alignItems: 'flex-start', 
    paddingVertical: 12 
  },
  input: { flex: 1, fontSize: 16, color: Colors.neutral.text },
  textAreaInput: { 
    minHeight: 80, 
    paddingTop: 4,
  },
  
  // Type buttons
  typeRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  typeBtn: {
    flex: 1,
    minWidth: 100,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#eee',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  typeBtnActive: {
    backgroundColor: Colors.primary.orange + '25',
    borderColor: Colors.primary.orangeDark,
    borderWidth: 2,
  },
  typeText: { fontWeight: '600', color: Colors.neutral.textLight, fontSize: 15 },
  typeTextActive: { color: Colors.primary.orangeDark, fontWeight: '700' },
  
  // Buttons
  saveBtn: {
    backgroundColor: Colors.primary.orangeDark,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  btnDisabled: { opacity: 0.6 },
  saveText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 56,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.health.poor,
    backgroundColor: '#fff',
  },
  deleteText: { color: Colors.health.poor, fontSize: 16, fontWeight: '600' },
  
  cancelBtn: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelText: { color: Colors.neutral.textLight, fontSize: 16, fontWeight: '600' },
});
