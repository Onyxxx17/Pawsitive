import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';

export default function SignUpScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [loading, setLoading] = useState(false);

  const isAlreadyRegisteredError = (error: any) => {
    const message = String(error?.message || '').toLowerCase();
    const code = String(error?.code || error?.error_code || '').toLowerCase();
    return code === 'user_already_exists' || message.includes('already registered');
  };

  const handleSignUp = async () => {
    if (!email || !password || !ownerName) {
      Alert.alert("Missing Info", "Please fill in all fields.");
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedOwnerName = ownerName.trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }

    if (!normalizedOwnerName) {
      Alert.alert("Missing Info", "Please enter your name.");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Weak Password", "Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          full_name: normalizedOwnerName,
        }
      }
    });
    setLoading(false);

    if (error) {
      if (isAlreadyRegisteredError(error)) {
        Alert.alert(
          "Account already exists",
          "That email is already registered. Log in instead?",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Go to Login", onPress: () => router.replace('/login') },
          ]
        );
        return;
      }
      Alert.alert("Sign Up Failed", error.message);
    } else if (data.user) {
      Alert.alert("Success!", "Account created! Please log in.", [
        { text: "OK", onPress: () => router.replace('/login') }
      ]);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary.brown} />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.welcome}>Join Pawsitive</Text>
          <Text style={styles.sub}>Create your account to get started.</Text>
        </View>

        <View style={styles.form}>
        <View style={styles.inputContainer}>
          <Ionicons name="person-outline" size={20} color={Colors.neutral.textLight} style={styles.icon} />
          <TextInput 
            style={styles.input} 
            placeholder="Your Name" 
            placeholderTextColor="#aaa" 
            value={ownerName} 
            onChangeText={setOwnerName} 
          />
        </View>
        <View style={styles.inputContainer}>
          <Ionicons name="mail-outline" size={20} color={Colors.neutral.textLight} style={styles.icon} />
          <TextInput 
            style={styles.input} 
            placeholder="Email" 
            placeholderTextColor="#aaa" 
            value={email} 
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>
        <View style={styles.inputContainer}>
          <Ionicons name="lock-closed-outline" size={20} color={Colors.neutral.textLight} style={styles.icon} />
          <TextInput 
            style={styles.input} 
            placeholder="Password (min 6 chars)" 
            placeholderTextColor="#aaa" 
            value={password} 
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity 
          style={[styles.signupBtn, loading && styles.signupBtnDisabled]} 
          onPress={handleSignUp}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.signupText}>Get Started</Text>
          )}
        </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { flexGrow: 1, padding: 24, justifyContent: 'center', paddingBottom: 36 },
  backBtn: { marginBottom: 20, alignSelf: 'flex-start' },
  header: { marginBottom: 32 },
  welcome: { fontSize: 32, fontWeight: '800', color: Colors.primary.brown, marginBottom: 10 },
  sub: { fontSize: 16, color: Colors.neutral.textLight },
  form: { gap: 20 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9f9f9', borderRadius: 16, paddingHorizontal: 16, height: 60, borderWidth: 1, borderColor: '#eee' },
  icon: { marginRight: 12 },
  input: { flex: 1, height: '100%', fontSize: 16 },
  typeRow: { flexDirection: 'row', gap: 10 },
  typeBtn: { flex: 1, padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#eee', alignItems: 'center' },
  typeBtnActive: { backgroundColor: Colors.primary.orange + '20', borderColor: Colors.primary.orange },
  typeText: { fontWeight: '600', color: Colors.neutral.textLight },
  typeTextActive: { color: Colors.primary.orangeDark, fontWeight: 'bold' },
  signupBtn: { backgroundColor: Colors.primary.orangeDark, height: 60, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 10, elevation: 5 },
  signupBtnDisabled: { opacity: 0.6 },
  signupText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
