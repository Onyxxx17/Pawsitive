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
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { useUser } from '../../context/UserContext';
import { supabase } from '@/lib/supabase';

// ─── Tiny section label ───────────────────────────────────────────────────────
const SectionLabel = ({ label }: { label: string }) => (
  <Text style={styles.sectionLabel}>{label}</Text>
);

// ─── Locked field (email) ─────────────────────────────────────────────────────
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
    <Text style={styles.lockedHint}>Change your email through Supabase account settings.</Text>
  </View>
);

// ─── Editable field ───────────────────────────────────────────────────────────
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

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const router = useRouter();
  const { profile, loading, updateProfile, uploadAvatar } = useUser();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [timezone, setTimezone] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  // Sync form with loaded profile
  useEffect(() => {
    if (profile) {
      setName(profile.name ?? '');
      setPhone(profile.phone_number ?? '');
      setTimezone(profile.timezone ?? 'Asia/Singapore');
      setAvatarUri(profile.avatar_url ?? null);
    }
  }, [profile]);

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
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
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

        {/* ── Danger zone ───────────────────────────────────────────────── */}
        <SectionLabel label="ACCOUNT ACTIONS" />
        <View style={styles.card}>
          <TouchableOpacity style={styles.actionRow} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={22} color={Colors.health.poor} />
            <Text style={[styles.actionText, { color: Colors.health.poor }]}>Sign out</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
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
});
