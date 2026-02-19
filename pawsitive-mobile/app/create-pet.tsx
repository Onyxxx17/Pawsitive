import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';

export default function CreatePetScreen() {
  const router = useRouter();
  
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
  
  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Pick photo from library
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

  // Upload photo to Supabase Storage
  const uploadPhoto = async (userId: string): Promise<string | null> => {
    if (!photoUri) return null;

    try {
      setUploadingPhoto(true);
      const response = await fetch(photoUri);
      const blob = await response.blob();
      const ext = photoUri.split('.').pop() ?? 'jpg';
      const fileName = `${userId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('pet-photos')
        .upload(fileName, blob, { 
          contentType: `image/${ext}`,
          upsert: false 
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return null;
      }

      const { data } = supabase.storage.from('pet-photos').getPublicUrl(fileName);
      return data.publicUrl;
    } catch (error) {
      console.error('Photo upload failed:', error);
      return null;
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleCreatePet = async () => {
    // Validation
    if (!petName.trim()) {
      Alert.alert("Missing Info", "Please enter your pet's name.");
      return;
    }

    if (!species) {
      Alert.alert("Missing Info", "Please select a species.");
      return;
    }

    setLoading(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        Alert.alert("Error", "Please log in first.");
        setLoading(false);
        return;
      }

      // Upload photo if selected
      let photoUrl: string | null = null;
      if (photoUri) {
        photoUrl = await uploadPhoto(user.id);
      }

      // Insert pet into database
      const { error } = await supabase
        .from('pets')
        .insert({
          owner_id: user.id,
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
        });

      setLoading(false);

      if (error) {
        Alert.alert("Error", error.message);
      } else {
        Alert.alert("Success!", "Pet profile created!", [
          { text: "OK", onPress: () => router.back() }
        ]);
      }
    } catch (err: any) {
      setLoading(false);
      Alert.alert("Error", err.message || "Failed to create pet profile");
    }
  };

  const handleSkip = () => {
    router.back();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary.brown} />
        </TouchableOpacity>
        <Text style={styles.title}>Add Your Pet</Text>
        <Text style={styles.subtitle}>Create a profile for your furry friend</Text>
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
                  name={type === 'dog' ? 'paw' : 'fish'} 
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
          style={[styles.createBtn, (loading || uploadingPhoto) && styles.btnDisabled]}
          onPress={handleCreatePet}
          disabled={loading || uploadingPhoto}
        >
          <Text style={styles.createText}>
            {loading ? 'Creating...' : uploadingPhoto ? 'Uploading photo...' : 'Create Pet Profile'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
          <Text style={styles.skipText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { paddingBottom: 40 },
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
  
  // Type buttons (Species, Gender, etc.)
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
  createBtn: {
    backgroundColor: Colors.primary.orangeDark,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  btnDisabled: { opacity: 0.6 },
  createText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  skipBtn: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipText: { color: Colors.neutral.textLight, fontSize: 16, fontWeight: '600' },
});
