import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

export default function LandingScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* Logo/Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>🐾 PAWSITIVE</Text>
        <Text style={styles.tagline}>Your Pet's Health Companion</Text>
      </View>

      {/* Illustration/Hero */}
      <View style={styles.heroSection}>
        <Ionicons name="paw" size={100} color={Colors.primary.orange} />
      </View>

      {/* Login Options */}
      <View style={styles.optionsContainer}>
        <Text style={styles.title}>Continue as</Text>

        {/* Pet Owner Login */}
        <TouchableOpacity
          style={[styles.optionButton, styles.ownerButton]}
          onPress={() => router.push('/login')}
          activeOpacity={0.8}
        >
          <View style={styles.buttonContent}>
            <View style={styles.iconContainer}>
              <Ionicons name="heart" size={32} color={Colors.primary.orange} />
            </View>
            <View style={styles.buttonText}>
              <Text style={styles.buttonTitle}>Pet Owner</Text>
              <Text style={styles.buttonSubtitle}>Manage your pet's health</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={Colors.primary.brown} />
          </View>
        </TouchableOpacity>

        {/* Veterinarian Login */}
        <TouchableOpacity
          style={[styles.optionButton, styles.vetButton]}
          onPress={() => router.push('/vet-login')}
          activeOpacity={0.8}
        >
          <View style={styles.buttonContent}>
            <View style={[styles.iconContainer, styles.vetIconContainer]}>
              <Ionicons name="medical" size={32} color="#2196F3" />
            </View>
            <View style={styles.buttonText}>
              <Text style={styles.buttonTitle}>Veterinarian</Text>
              <Text style={styles.buttonSubtitle}>Access vet dashboard</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={Colors.primary.brown} />
          </View>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Don't have an account?{' '}
          <Text style={styles.signupLink} onPress={() => router.push('/signup')}>
            Sign up
          </Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral.background,
  },
  header: {
    alignItems: 'center',
    marginTop: 80,
    marginBottom: 40,
  },
  logo: {
    fontSize: 36,
    fontWeight: '800',
    color: Colors.primary.brown,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: Colors.neutral.textLight,
    fontWeight: '500',
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 60,
  },
  optionsContainer: {
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.primary.brown,
    marginBottom: 24,
    textAlign: 'center',
  },
  optionButton: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  ownerButton: {
    borderWidth: 2,
    borderColor: Colors.primary.orange,
  },
  vetButton: {
    borderWidth: 2,
    borderColor: '#2196F3',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFE5E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  vetIconContainer: {
    backgroundColor: '#E3F2FD',
  },
  buttonText: {
    flex: 1,
  },
  buttonTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary.brown,
    marginBottom: 4,
  },
  buttonSubtitle: {
    fontSize: 14,
    color: Colors.neutral.textLight,
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: Colors.neutral.textLight,
  },
  signupLink: {
    color: Colors.primary.orange,
    fontWeight: '600',
  },
});
