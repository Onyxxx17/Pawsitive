import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { usePet } from '../context/PetContext';

export default function SignUpScreen() {
  const router = useRouter();
  const { addPet } = usePet();
  const [petName, setPetName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [petType, setPetType] = useState('Dog');

  const handleSignUp = () => {
    if (!petName || !ownerName) { Alert.alert("Missing Info", "Please fill in all fields."); return; }
    addPet(petName, petType);
    router.replace('/(tabs)');
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color={Colors.primary.brown} />
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={styles.welcome}>Join Pawsitive</Text>
        <Text style={styles.sub}>Create a profile for your best friend.</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <Ionicons name="person-outline" size={20} color={Colors.neutral.textLight} style={styles.icon} />
          <TextInput style={styles.input} placeholder="Your Name" placeholderTextColor="#aaa" value={ownerName} onChangeText={setOwnerName} />
        </View>
        <View style={styles.inputContainer}>
          <Ionicons name="paw-outline" size={20} color={Colors.neutral.textLight} style={styles.icon} />
          <TextInput style={styles.input} placeholder="Pet's Name" placeholderTextColor="#aaa" value={petName} onChangeText={setPetName} />
        </View>
        
        <View style={styles.typeRow}>
          {['Dog', 'Cat'].map((type) => (
            <TouchableOpacity key={type} style={[styles.typeBtn, petType === type && styles.typeBtnActive]} onPress={() => setPetType(type)}>
              <Text style={[styles.typeText, petType === type && styles.typeTextActive]}>{type}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.signupBtn} onPress={handleSignUp}>
          <Text style={styles.signupText}>Get Started</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 24, justifyContent: 'center' },
  backBtn: { position: 'absolute', top: 60, left: 24, zIndex: 10 },
  header: { marginBottom: 40 },
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
  signupText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});