import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');

  const handleLogin = () => {
    if (!email) { Alert.alert("Error", "Please enter an email"); return; }
    router.replace('/(tabs)');
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      
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
          <TextInput style={styles.input} placeholder="Password" placeholderTextColor="#aaa" secureTextEntry />
        </View>
        <TouchableOpacity style={styles.loginBtn} onPress={handleLogin}>
          <Text style={styles.loginText}>Log In</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.footer}>
        <Text style={styles.footerText}>New to Pawsitive? </Text>
        <TouchableOpacity onPress={() => router.push('/signup')}>
          <Text style={styles.signupText}>Sign Up</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 24, justifyContent: 'center' },
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
  loginText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 40 },
  footerText: { color: Colors.neutral.textLight },
  signupText: { color: Colors.primary.orangeDark, fontWeight: 'bold' },
});