import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  Modal,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { useUser } from '../../context/UserContext';
import { usePet } from '../../context/PetContext';
import { supabase } from '@/lib/supabase';

// ─── Tiny section label 
const SectionLabel = ({ label }: { label: string }) => (
  <Text style={styles.sectionLabel}>{label}</Text>
);

// ─── Locked field (email) 
const LockedField = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.fieldGroup}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <View style={styles.lockedRow}>
      <Text style={styles.lockedValue}>{value || '—'}</Text>
      <View style={styles.lockBadge}>
        <Ionicons name="lock-closed" size={12} color={Colors.neutral.textLight} />
        <Text style={styles.lockText}>Locked</Text>
      </View>
    </View>
    <Text style={styles.lockedHint}>Change your email through the account settings.</Text>
  </View>
);

// ─── Editable field 
const EditableField = ({
  label,
  value,
  placeholder,
  onChangeText,
  keyboardType,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChangeText: (v: string) => void;
  keyboardType?: any;
}) => (
  <View style={styles.fieldGroup}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder ?? label}
      placeholderTextColor={Colors.neutral.textLight}
      keyboardType={keyboardType ?? 'default'}
      autoCapitalize="none"
    />
  </View>
);

// ─── Main Screen

export default function ProfileScreen() {
  const router = useRouter();
  const { profile, loading, updateProfile, uploadAvatar } = useUser();
  const { fetchPets: refreshPetContext } = usePet();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [timezone, setTimezone] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [pets, setPets] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  
  // Edit pet modal
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedPet, setSelectedPet] = useState<any>(null);

  // Sync form with loaded profile
  useEffect(() => {
    if (profile) {
      setName(profile.name ?? '');
      setPhone(profile.phone_number ?? '');
      setTimezone(profile.timezone ?? 'Asia/Singapore');
      setAvatarUri(profile.avatar_url ?? null);
      fetchPets();
    }
  }, [profile]);

  // Re-fetch pets when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      fetchPets();
    }, [])
  );

  // Fetch user's pets (raw database format for editing)
  const fetchPets = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('pets')
      .select('*')
      .eq('owner_id', user.id);

    if (error) {
      console.error('Error fetching pets:', error);
      setPets([]);
    } else if (data) {
      console.log('Fetched pets:', data);
      setPets(data);
      // Also refresh the global PetContext
      refreshPetContext();
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPets();
    setRefreshing(false);
  };

  const handleEditPet = (pet: any) => {
    setSelectedPet(pet);
    setEditModalVisible(true);
  };

  const handleDeletePet = async (petId: string, petName: string) => {
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
              .eq('id', petId);

            if (error) {
              Alert.alert("Error", error.message);
            } else {
              Alert.alert("Deleted", `${petName} has been removed.`);
              fetchPets(); // Refresh list
            }
          },
        },
      ]
    );
  };

  const markDirty = (setter: (v: string) => void) => (val: string) => {
    setter(val);
    setDirty(true);
  };

  // ── Pick photo from library ──────────────────────────────────────────────────
  const handlePickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Please allow photo library access to change your avatar.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: false,
    });

    if (result.canceled) return;

    const uri = result.assets[0].uri;
    setUploading(true);
    setAvatarUri(uri); // optimistic preview

    const { url, error } = await uploadAvatar(uri);
    setUploading(false);

    if (error) {
      Alert.alert('Upload failed', error);
      setAvatarUri(profile?.avatar_url ?? null); // revert
    } else if (url) {
      // Strip cache-buster from display URI to avoid broken URLs
      setAvatarUri(url);
    }
  };

  // ── Save text fields ─────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    const { error } = await updateProfile({
      name: name.trim() || undefined,
      phone_number: phone.trim() || undefined,
      timezone: timezone.trim() || undefined,
    });
    setSaving(false);

    if (error) {
      Alert.alert('Error', error);
    } else {
      setDirty(false);
      Alert.alert('Saved', 'Your profile has been updated.');
    }
  };

  // ── Sign out ─────────────────────────────────────────────────────────────────
  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace('/login');
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary.orangeDark} />
      </SafeAreaView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* ── Avatar ────────────────────────────────────────────────────── */}
        <View style={styles.avatarSection}>
          <TouchableOpacity style={styles.avatarWrapper} onPress={handlePickPhoto} activeOpacity={0.8}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={48} color={Colors.neutral.textLight} />
              </View>
            )}
            <View style={styles.cameraOverlay}>
              {uploading
                ? <ActivityIndicator size="small" color="#fff" />
                : <MaterialCommunityIcons name="camera" size={18} color="#fff" />
              }
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarHint}>Tap to change photo</Text>
        </View>

        {/* ── Account info ──────────────────────────────────────────────── */}
        <SectionLabel label="ACCOUNT" />
        <View style={styles.card}>
          <LockedField label="Email" value={profile?.email ?? ''} />
        </View>

        {/* ── Personal info ─────────────────────────────────────────────── */}
        <SectionLabel label="PERSONAL" />
        <View style={styles.card}>
          <EditableField
            label="Display name"
            value={name}
            placeholder="Your name"
            onChangeText={markDirty(setName)}
          />
          <View style={styles.divider} />
          <EditableField
            label="Phone number"
            value={phone}
            placeholder="+65 9123 4567"
            onChangeText={markDirty(setPhone)}
            keyboardType="phone-pad"
          />
          <View style={styles.divider} />
          <EditableField
            label="Timezone"
            value={timezone}
            placeholder="Asia/Singapore"
            onChangeText={markDirty(setTimezone)}
          />
        </View>

        {/* ── My Pets ───────────────────────────────────────────────────── */}
        <SectionLabel label="MY PETS" />
        
        {/* Debug: Show pet count */}
        {pets.length === 0 && (
          <Text style={{ fontSize: 12, color: Colors.neutral.textLight, marginBottom: 8 }}>
            No pets found. Pull down to refresh.
          </Text>
        )}
        
        {/* Pet Profile Icons */}
        <View style={styles.petIconsRow}>
          {pets.map((pet) => (
            <View key={pet.id} style={styles.petProfileWrapper}>
              {pet.profile_photo_url ? (
                <Image source={{ uri: pet.profile_photo_url }} style={styles.petProfileImage} />
              ) : (
                <View style={styles.petProfilePlaceholder}>
                  <Ionicons 
                    name={pet.species === 'dog' ? 'paw' : 'heart'} 
                    size={28} 
                    color={Colors.primary.orangeDark} 
                  />
                </View>
              )}
              <Text style={styles.petProfileName} numberOfLines={1}>{pet.name}</Text>
            </View>
          ))}
          
          {/* Add Pet Button */}
          <TouchableOpacity 
            style={styles.addPetIconWrapper}
            onPress={() => router.push('/create-pet')}
          >
            <View style={styles.addPetIconCircle}>
              <Ionicons name="add" size={32} color={Colors.primary.orangeDark} />
            </View>
            <Text style={styles.addPetIconText}>Add Pet</Text>
          </TouchableOpacity>
        </View>

        {/* Pet Details Card (only if pets exist) */}
        {pets.length > 0 && (
          <View style={styles.card}>
            {pets.map((pet, idx) => (
              <View key={pet.id}>
                {idx > 0 && <View style={styles.divider} />}
                <TouchableOpacity 
                  style={styles.petRow}
                  onPress={() => handleEditPet(pet)}
                  activeOpacity={0.7}
                >
                  <View style={styles.petIcon}>
                    {pet.profile_photo_url ? (
                      <Image source={{ uri: pet.profile_photo_url }} style={styles.petIconImage} />
                    ) : (
                      <Ionicons 
                        name={pet.species === 'dog' ? 'paw' : 'heart'} 
                        size={24} 
                        color={Colors.primary.orangeDark} 
                      />
                    )}
                  </View>
                  <View style={styles.petInfo}>
                    <Text style={styles.petName}>{pet.name}</Text>
                    <Text style={styles.petDetails}>
                      {pet.species.charAt(0).toUpperCase() + pet.species.slice(1)}
                      {pet.breed ? ` • ${pet.breed}` : ''}
                      {pet.gender ? ` • ${pet.gender.charAt(0).toUpperCase() + pet.gender.slice(1)}` : ''}
                    </Text>
                  </View>
                  <Ionicons name="create-outline" size={24} color={Colors.primary.orangeDark} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* ── Save ──────────────────────────────────────────────────────── */}
        <TouchableOpacity
          style={[styles.saveBtn, (!dirty || saving) && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={!dirty || saving}
          activeOpacity={0.8}
        >
          {saving
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.saveBtnText}>Save changes</Text>
          }
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Edit Pet Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedPet?.name || 'Pet Details'}
              </Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={28} color={Colors.neutral.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {selectedPet && (
                <>
                  {/* Pet Photo */}
                  <View style={styles.modalPhotoSection}>
                    {selectedPet.profile_photo_url ? (
                      <Image 
                        source={{ uri: selectedPet.profile_photo_url }} 
                        style={styles.modalPetPhoto} 
                      />
                    ) : (
                      <View style={styles.modalPetPhotoPlaceholder}>
                        <Ionicons 
                          name={selectedPet.species === 'dog' ? 'paw' : 'heart'} 
                          size={60} 
                          color={Colors.primary.orangeDark} 
                        />
                      </View>
                    )}
                  </View>

                  {/* Pet Info */}
                  <View style={styles.modalInfoRow}>
                    <Ionicons name="paw-outline" size={20} color={Colors.neutral.textLight} />
                    <View style={styles.modalInfoText}>
                      <Text style={styles.modalInfoLabel}>Name</Text>
                      <Text style={styles.modalInfoValue}>{selectedPet.name}</Text>
                    </View>
                  </View>

                  <View style={styles.modalInfoRow}>
                    <Ionicons name="medical-outline" size={20} color={Colors.neutral.textLight} />
                    <View style={styles.modalInfoText}>
                      <Text style={styles.modalInfoLabel}>Species</Text>
                      <Text style={styles.modalInfoValue}>
                        {selectedPet.species.charAt(0).toUpperCase() + selectedPet.species.slice(1)}
                      </Text>
                    </View>
                  </View>

                  {selectedPet.breed && (
                    <View style={styles.modalInfoRow}>
                      <Ionicons name="flask-outline" size={20} color={Colors.neutral.textLight} />
                      <View style={styles.modalInfoText}>
                        <Text style={styles.modalInfoLabel}>Breed</Text>
                        <Text style={styles.modalInfoValue}>{selectedPet.breed}</Text>
                      </View>
                    </View>
                  )}

                  {selectedPet.gender && (
                    <View style={styles.modalInfoRow}>
                      <Ionicons 
                        name={selectedPet.gender === 'male' ? 'male' : 'female'} 
                        size={20} 
                        color={Colors.neutral.textLight} 
                      />
                      <View style={styles.modalInfoText}>
                        <Text style={styles.modalInfoLabel}>Gender</Text>
                        <Text style={styles.modalInfoValue}>
                          {selectedPet.gender.charAt(0).toUpperCase() + selectedPet.gender.slice(1)}
                        </Text>
                      </View>
                    </View>
                  )}

                  {selectedPet.date_of_birth && (
                    <View style={styles.modalInfoRow}>
                      <Ionicons name="calendar-outline" size={20} color={Colors.neutral.textLight} />
                      <View style={styles.modalInfoText}>
                        <Text style={styles.modalInfoLabel}>Date of Birth</Text>
                        <Text style={styles.modalInfoValue}>{selectedPet.date_of_birth}</Text>
                      </View>
                    </View>
                  )}

                  {selectedPet.weight_kg && (
                    <View style={styles.modalInfoRow}>
                      <Ionicons name="fitness-outline" size={20} color={Colors.neutral.textLight} />
                      <View style={styles.modalInfoText}>
                        <Text style={styles.modalInfoLabel}>Weight</Text>
                        <Text style={styles.modalInfoValue}>{selectedPet.weight_kg} kg</Text>
                      </View>
                    </View>
                  )}

                  {selectedPet.microchip_id && (
                    <View style={styles.modalInfoRow}>
                      <Ionicons name="hardware-chip-outline" size={20} color={Colors.neutral.textLight} />
                      <View style={styles.modalInfoText}>
                        <Text style={styles.modalInfoLabel}>Microchip ID</Text>
                        <Text style={styles.modalInfoValue}>{selectedPet.microchip_id}</Text>
                      </View>
                    </View>
                  )}

                  {selectedPet.is_neutered !== null && (
                    <View style={styles.modalInfoRow}>
                      <Ionicons name="medkit-outline" size={20} color={Colors.neutral.textLight} />
                      <View style={styles.modalInfoText}>
                        <Text style={styles.modalInfoLabel}>Neutered/Spayed</Text>
                        <Text style={styles.modalInfoValue}>
                          {selectedPet.is_neutered ? 'Yes' : 'No'}
                        </Text>
                      </View>
                    </View>
                  )}

                  {selectedPet.existing_conditions && selectedPet.existing_conditions.length > 0 && (
                    <View style={styles.modalInfoRow}>
                      <Ionicons name="clipboard-outline" size={20} color={Colors.neutral.textLight} />
                      <View style={styles.modalInfoText}>
                        <Text style={styles.modalInfoLabel}>Medical Conditions</Text>
                        <Text style={styles.modalInfoValue}>
                          {selectedPet.existing_conditions.join(', ')}
                        </Text>
                      </View>
                    </View>
                  )}

                  {selectedPet.notes && (
                    <View style={styles.modalInfoRow}>
                      <Ionicons name="document-text-outline" size={20} color={Colors.neutral.textLight} />
                      <View style={styles.modalInfoText}>
                        <Text style={styles.modalInfoLabel}>Notes</Text>
                        <Text style={styles.modalInfoValue}>{selectedPet.notes}</Text>
                      </View>
                    </View>
                  )}
                </>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.modalDeleteBtn}
                onPress={() => {
                  setEditModalVisible(false);
                  setTimeout(() => {
                    handleDeletePet(selectedPet.id, selectedPet.name);
                  }, 300);
                }}
              >
                <Ionicons name="trash-outline" size={20} color={Colors.health.poor} />
                <Text style={styles.modalDeleteText}>Delete</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalEditBtn}
                onPress={() => {
                  setEditModalVisible(false);
                  // Navigate to edit-pet screen with the pet ID
                  setTimeout(() => {
                    router.push({
                      pathname: '/edit-pet',
                      params: { id: selectedPet.id }
                    } as any);
                  }, 300);
                }}
              >
                <Ionicons name="create-outline" size={20} color="#fff" />
                <Text style={styles.modalEditText}>Edit Details</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.neutral.background },
  content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.neutral.background },

  // Avatar
  avatarSection: { alignItems: 'center', marginBottom: 28 },
  avatarWrapper: { width: 100, height: 100, borderRadius: 50, position: 'relative' },
  avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: Colors.primary.orangeDark },
  avatarPlaceholder: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: Colors.neutral.border,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: Colors.neutral.border,
  },
  cameraOverlay: {
    position: 'absolute', bottom: 0, right: 0,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: Colors.primary.orangeDark,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  avatarHint: { marginTop: 8, fontSize: 12, color: Colors.neutral.textLight },

  // Section label
  sectionLabel: { fontSize: 11, fontWeight: '700', color: Colors.neutral.textLight, letterSpacing: 1, marginBottom: 8, marginTop: 20 },

  // Card
  card: { backgroundColor: Colors.neutral.card, borderRadius: 16, paddingHorizontal: 16, overflow: 'hidden', borderWidth: 1, borderColor: Colors.neutral.border },
  divider: { height: 1, backgroundColor: Colors.neutral.border, marginLeft: 0 },

  // Locked field
  fieldGroup: { paddingVertical: 14 },
  fieldLabel: { fontSize: 12, color: Colors.neutral.textLight, marginBottom: 4 },
  lockedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  lockedValue: { fontSize: 15, color: Colors.neutral.text, flex: 1 },
  lockBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.neutral.background, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1, borderColor: Colors.neutral.border },
  lockText: { fontSize: 11, color: Colors.neutral.textLight },
  lockedHint: { fontSize: 11, color: Colors.neutral.textLight, marginTop: 4 },

  // Editable field
  input: { fontSize: 15, color: Colors.neutral.text, paddingVertical: 4 },

  // Save button
  saveBtn: { backgroundColor: Colors.primary.orangeDark, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Action row
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16 },
  actionText: { fontSize: 15, fontWeight: '600' },

  // Pets section
  emptyPets: { paddingVertical: 32, alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 14, color: Colors.neutral.textLight },
  addPetBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  addPetText: { fontSize: 15, fontWeight: '600', color: Colors.primary.orangeDark },
  
  // Pet profile icons row
  petIconsRow: { 
    flexDirection: 'row', 
    gap: 20, 
    marginBottom: 16,
    paddingVertical: 8,
  },
  petProfileWrapper: { 
    alignItems: 'center', 
    width: 75,
  },
  petProfileImage: { 
    width: 70, 
    height: 70, 
    borderRadius: 35,
    borderWidth: 3,
    borderColor: Colors.primary.orangeDark,
  },
  petProfilePlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: Colors.primary.orange + '25',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.primary.orange,
  },
  petProfileName: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.neutral.text,
    marginTop: 8,
    textAlign: 'center',
  },
  addPetIconWrapper: {
    alignItems: 'center',
    width: 75,
  },
  addPetIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: Colors.neutral.background,
    borderWidth: 2.5,
    borderColor: Colors.primary.orange,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPetIconText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary.orangeDark,
    marginTop: 8,
    textAlign: 'center',
  },
  
  // Pet details in card
  petRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12 },
  petIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary.orange + '20', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  petIconImage: { width: 44, height: 44, borderRadius: 22 },
  petInfo: { flex: 1 },
  petName: { fontSize: 16, fontWeight: '600', color: Colors.neutral.text, marginBottom: 2 },
  petDetails: { fontSize: 13, color: Colors.neutral.textLight },
  addMoreBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14, justifyContent: 'center' },
  addMoreText: { fontSize: 15, fontWeight: '600', color: Colors.primary.orangeDark },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral.border,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.primary.brown,
  },
  modalBody: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  modalPhotoSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalPetPhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: Colors.primary.orangeDark,
  },
  modalPetPhotoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.primary.orange + '25',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: Colors.primary.orange,
  },
  modalInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral.border,
  },
  modalInfoText: {
    flex: 1,
  },
  modalInfoLabel: {
    fontSize: 13,
    color: Colors.neutral.textLight,
    marginBottom: 4,
  },
  modalInfoValue: {
    fontSize: 16,
    color: Colors.neutral.text,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  modalDeleteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.health.poor,
    backgroundColor: '#fff',
  },
  modalDeleteText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.health.poor,
  },
  modalEditBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: Colors.primary.orangeDark,
  },
  modalEditText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
