import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, Image, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState(process.env.EXPO_PUBLIC_DEV_LOGIN_EMAIL?? "");
  const [password, setPassword] = useState(process.env.EXPO_PUBLIC_DEV_LOGIN_PW?? "");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter both email and password");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);

    if (error) {
      Alert.alert("Login Failed", error.message);
    } else {
      router.replace('/(tabs)');
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
      
      {/* 📸 Logo Header */}
      <View style={styles.logoHeader}>
        <Image source={require('@/assets/images/pawsitive.png')} style={styles.smallLogo} resizeMode="contain" />
        <Text style={styles.brandName}>Pawsitive</Text>
      </View>

      <View style={styles.header}>
        <Text style={styles.welcome}>Welcome Back!</Text>
        <Text style={styles.sub}>Sign in to stay Pawsitive.</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <Ionicons name="mail-outline" size={20} color={Colors.neutral.textLight} style={styles.icon} />
          <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#aaa" value={email} onChangeText={setEmail} autoCapitalize="none" />
        </View>
        <View style={styles.inputContainer}>
          <Ionicons name="lock-closed-outline" size={20} color={Colors.neutral.textLight} style={styles.icon} />
          <TextInput 
            style={styles.input} 
            placeholder="Password" 
            placeholderTextColor="#aaa" 
            secureTextEntry 
            value={password}
            onChangeText={setPassword}
          />
        </View>
        <TouchableOpacity 
          style={[styles.loginBtn, loading && styles.loginBtnDisabled]} 
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.loginText}>Log In</Text>
          )}
        </TouchableOpacity>
      </View>
      
      <View style={styles.footer}>
        <Text style={styles.footerText}>New to Pawsitive? </Text>
        <TouchableOpacity onPress={() => router.push('/signup')}>
          <Text style={styles.signupText}>Sign Up</Text>
        </TouchableOpacity>
      </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { flexGrow: 1, padding: 24, justifyContent: 'center', paddingBottom: 36 },
  logoHeader: { alignItems: 'center', marginBottom: 30 },
  smallLogo: { width: 60, height: 60 },
  brandName: { fontSize: 24, fontWeight: '900', color: Colors.primary.orangeDark, marginTop: 5 },
  header: { marginBottom: 30 },
  welcome: { fontSize: 32, fontWeight: '800', color: Colors.primary.brown, marginBottom: 5 },
  sub: { fontSize: 16, color: Colors.neutral.textLight },
  form: { gap: 15 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9f9f9', borderRadius: 16, paddingHorizontal: 16, height: 60, borderWidth: 1, borderColor: '#eee' },
  icon: { marginRight: 12 },
  input: { flex: 1, height: '100%', fontSize: 16 },
  loginBtn: { backgroundColor: Colors.primary.brown, height: 60, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 10, elevation: 5 },
  loginBtnDisabled: { opacity: 0.6 },
  loginText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 28 },
  footerText: { color: Colors.neutral.textLight },
  signupText: { color: Colors.primary.orangeDark, fontWeight: 'bold' },
});