import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { useVet } from '@/context/VetContext';
import { createImageUploadPayload } from '@/lib/imageUpload';
import * as ImagePicker from 'expo-image-picker';

type VetProfile = {
  id: string;
  name: string;
  email: string;
  clinic_name: string;
  specializations: string[];
  bio: string;
  profile_photo_url: string;
  license_number: string;
  years_experience: number;
  consultation_fee: number;
  languages: string[];
  rating: number;
  total_reviews: number;
};

export default function VetProfileScreen() {
  const router = useRouter();
  const { vetId: globalVetId, clearVetSession } = useVet();
  const [vet, setVet] = useState<VetProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [bio, setBio] = useState('');
  const [consultationFee, setConsultationFee] = useState('');
  const [specializations, setSpecializations] = useState('');
  const [languages, setLanguages] = useState('');
  const [yearsExperience, setYearsExperience] = useState('');

  const fetchVetProfile = useCallback(async () => {
    try {
      if (!globalVetId) {
        setVet(null);
        return;
      }

      const { data, error } = await supabase
        .from('veterinarians')
        .select('*')
        .eq('id', globalVetId)
        .single();

      if (error) throw error;

      setVet(data);
      setName(data.name || '');
      setClinicName(data.clinic_name || '');
      setBio(data.bio || '');
      setConsultationFee(data.consultation_fee?.toString() || '');
      setSpecializations(data.specializations?.join(', ') || '');
      setLanguages(data.languages?.join(', ') || '');
      setYearsExperience(data.years_experience?.toString() || '');
    } catch (error: any) {
      console.error('Error fetching vet profile:', error);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [globalVetId]);

  const performLogout = useCallback(async () => {
    try {
      setLoggingOut(true);
      setVet(null);
      setEditing(false);
      await clearVetSession();
      router.replace('/vet-login');
    } catch (error: any) {
      console.error('Error logging out veterinarian:', error);
      Alert.alert('Error', error?.message || 'Failed to logout');
    } finally {
      setLoggingOut(false);
    }
  }, [clearVetSession, router]);

  useEffect(() => {
    fetchVetProfile();
  }, [fetchVetProfile]);

  useEffect(() => {
    if (!globalVetId && !loggingOut) {
      setVet(null);
      router.replace('/vet-login');
    }
  }, [globalVetId, loggingOut, router]);

  const handleSaveProfile = async () => {
    try {
      setLoading(true);

      if (!globalVetId) {
        Alert.alert('Error', 'No vet session found');
        return;
      }

      const updates = {
        name: name,
        clinic_name: clinicName,
        bio: bio,
        consultation_fee: parseFloat(consultationFee) || 0,
        specializations: specializations.split(',').map(s => s.trim()).filter(Boolean),
        languages: languages.split(',').map(l => l.trim()).filter(Boolean),
        years_experience: parseInt(yearsExperience) || 0,
      };

      const { error } = await supabase
        .from('veterinarians')
        .update(updates)
        .eq('id', globalVetId);

      if (error) throw error;

      Alert.alert('Success', 'Profile updated successfully');
      setEditing(false);
      fetchVetProfile();
    } catch (error: any) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      const confirmed = typeof globalThis.confirm === 'function'
        ? globalThis.confirm('Are you sure you want to logout?')
        : true;

      if (confirmed) {
        void performLogout();
      }
      return;
    }

    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: () => {
            void performLogout();
          }
        },
      ]
    );
  };

  const handlePickImage = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera roll permissions to upload a photo.');
        return;
      }

      // Pick image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadImage(result.assets[0].uri);
      }
    } catch (error: any) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const uploadImage = async (imageUri: string) => {
    try {
      setUploadingPhoto(true);

      if (!globalVetId) {
        Alert.alert('Error', 'No vet session found');
        return;
      }

      const { file, fileName, mimeType } = await createImageUploadPayload(imageUri, `${globalVetId}-${Date.now()}`);
      const filePath = `vet-profiles/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('user_profiles')
        .upload(filePath, file, {
          contentType: mimeType,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('user_profiles')
        .getPublicUrl(filePath);

      // Update vet profile with new photo URL
      const { error: updateError } = await supabase
        .from('veterinarians')
        .update({ profile_photo_url: publicUrl })
        .eq('id', globalVetId);

      if (updateError) throw updateError;

      Alert.alert('Success', 'Profile photo updated successfully');
      fetchVetProfile();
    } catch (error: any) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', error.message || 'Failed to upload image');
    } finally {
      setUploadingPhoto(false);
    }
  };

  if (loading && !vet) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity 
          onPress={() => editing ? handleSaveProfile() : setEditing(true)}
          disabled={loading}
        >
          <Text style={styles.editButton}>
            {editing ? 'Save' : 'Edit'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Photo Section with gradient background */}
        <View style={styles.photoSection}>
          <View style={styles.photoContainer}>
            {vet?.profile_photo_url ? (
              <Image source={{ uri: vet.profile_photo_url }} style={styles.photo} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Ionicons name="person" size={60} color="#FFF" />
              </View>
            )}
            {uploadingPhoto && (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator size="large" color="#FFF" />
              </View>
            )}
            <TouchableOpacity 
              style={styles.editPhotoButton}
              onPress={handlePickImage}
              disabled={uploadingPhoto}
            >
              <Ionicons name="camera" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
          <Text style={styles.name}>Dr. {vet?.name}</Text>
          <Text style={styles.email}>{vet?.email}</Text>
          
          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="star" size={24} color="#FFB300" />
              <Text style={styles.statValue}>{vet?.rating?.toFixed(1)}</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="people" size={24} color="#2196F3" />
              <Text style={styles.statValue}>{vet?.total_reviews}</Text>
              <Text style={styles.statLabel}>Reviews</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="briefcase" size={24} color="#4CAF50" />
              <Text style={styles.statValue}>{vet?.years_experience || 0}</Text>
              <Text style={styles.statLabel}>Years Exp</Text>
            </View>
          </View>
        </View>

        {/* Profile Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Professional Information</Text>

          {/* Name */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Name</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Enter your name"
                placeholderTextColor={Colors.neutral.textLight}
              />
            ) : (
              <Text style={styles.fieldValue}>{name || 'Not set'}</Text>
            )}
          </View>

          {/* License Number (Read-only) */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>License Number</Text>
            <Text style={styles.fieldValue}>{vet?.license_number || 'Not set'}</Text>
          </View>

          {/* Years of Experience */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Years of Experience</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={yearsExperience}
                onChangeText={setYearsExperience}
                placeholder="Enter years of experience"
                placeholderTextColor={Colors.neutral.textLight}
                keyboardType="numeric"
              />
            ) : (
              <Text style={styles.fieldValue}>{yearsExperience || 0} years</Text>
            )}
          </View>

          {/* Clinic Name */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Clinic Name</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={clinicName}
                onChangeText={setClinicName}
                placeholder="Enter clinic name"
                placeholderTextColor={Colors.neutral.textLight}
              />
            ) : (
              <Text style={styles.fieldValue}>{clinicName || 'Not set'}</Text>
            )}
          </View>

          {/* Consultation Fee */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Consultation Fee</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={consultationFee}
                onChangeText={setConsultationFee}
                placeholder="Enter fee (e.g., 50.00)"
                placeholderTextColor={Colors.neutral.textLight}
                keyboardType="numeric"
              />
            ) : (
              <Text style={styles.fieldValue}>${consultationFee || '0.00'}</Text>
            )}
          </View>

          {/* Specializations */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Specializations</Text>
            {editing ? (
              <TextInput
                style={[styles.input, styles.textArea]}
                value={specializations}
                onChangeText={setSpecializations}
                placeholder="e.g., Surgery, Cardiology"
                placeholderTextColor={Colors.neutral.textLight}
                multiline
              />
            ) : (
              <Text style={styles.fieldValue}>{specializations || 'Not set'}</Text>
            )}
          </View>

          {/* Languages */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Languages</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={languages}
                onChangeText={setLanguages}
                placeholder="e.g., English, Chinese"
                placeholderTextColor={Colors.neutral.textLight}
              />
            ) : (
              <Text style={styles.fieldValue}>{languages || 'Not set'}</Text>
            )}
          </View>

          {/* Bio */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Bio</Text>
            {editing ? (
              <TextInput
                style={[styles.input, styles.textArea]}
                value={bio}
                onChangeText={setBio}
                placeholder="Tell us about yourself..."
                placeholderTextColor={Colors.neutral.textLight}
                multiline
                numberOfLines={4}
              />
            ) : (
              <Text style={styles.fieldValue}>{bio || 'Not set'}</Text>
            )}
          </View>
        </View>

        {editing && (
          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={() => {
              setEditing(false);
              fetchVetProfile();
            }}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        )}

        {/* Logout Button */}
        {!editing && (
          <View style={styles.logoutSection}>
            <TouchableOpacity 
              style={styles.logoutButton}
              onPress={handleLogout}
              disabled={loggingOut}
            >
              <Ionicons name="log-out-outline" size={18} color="#757575" />
              <Text style={styles.logoutButtonText}>
                {loggingOut ? 'Logging out...' : 'Logout'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.neutral.background,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.neutral.textLight,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#FFF',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.primary.brown,
  },
  editButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2196F3',
  },
  content: {
    flex: 1,
  },
  photoSection: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
    backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', // Will fallback to solid color
    marginBottom: 16,
  },
  photoContainer: {
    marginBottom: 20,
    position: 'relative',
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#FFF',
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FFF',
  },
  editPhotoButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#2196F3',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.primary.brown,
    marginBottom: 6,
    textAlign: 'center',
  },
  email: {
    fontSize: 14,
    color: Colors.neutral.textLight,
    marginBottom: 20,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral.border,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.neutral.border,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary.brown,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.neutral.textLight,
    marginTop: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rating: {
    fontSize: 14,
    color: Colors.primary.brown,
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#FFF',
    padding: 24,
    marginBottom: 16,
    borderRadius: 16,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.primary.brown,
    marginBottom: 24,
  },
  field: {
    marginBottom: 24,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6C757D',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldValue: {
    fontSize: 16,
    color: Colors.neutral.text,
    lineHeight: 24,
  },
  input: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.primary.brown,
    borderWidth: 2,
    borderColor: '#E9ECEF',
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
    paddingTop: 16,
  },
  cancelButton: {
    backgroundColor: Colors.neutral.background,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 24,
    marginTop: 8,
    borderWidth: 1,
    borderColor: Colors.neutral.border,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary.brown,
  },
  logoutSection: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  logoutButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#757575',
  },
});
