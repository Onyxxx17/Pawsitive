import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

export default function LandingScreen() {
  const router = useRouter();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      bounces={false}
    >
      <View style={styles.heroGlow} />
      <View style={styles.header}>
        <View style={styles.logoBadge}>
          <Ionicons name="paw" size={28} color={Colors.primary.orangeDark} />
          <Text style={styles.logoWordmark}>PAWSITIVE</Text>
        </View>
        <Text style={styles.kicker}>Pet care that feels organized</Text>
        <Text style={styles.tagline}>Track routines, health insights, and vet support in one place.</Text>
      </View>

      <View style={styles.heroSection}>
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons name="paw" size={58} color="#fff" />
          </View>
          <Text style={styles.heroTitle}>Choose your workspace</Text>
          <Text style={styles.heroDescription}>
            Owner tools stay focused on daily care. Vet tools stay focused on appointments and follow-up.
          </Text>
        </View>
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
              <Text style={styles.buttonSubtitle}>Manage your pet&apos;s health</Text>
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
          Don&apos;t have an account?{' '}
          <Text style={styles.signupLink} onPress={() => router.push('/signup')}>
            Sign up
          </Text>
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F4ED',
    paddingHorizontal: 24,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  heroGlow: {
    position: 'absolute',
    top: 0,
    right: -40,
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: '#F5B27A55',
  },
  header: {
    marginTop: 76,
    marginBottom: 28,
  },
  logoBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFF7EE',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#F1D2AD',
  },
  logoWordmark: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.primary.brown,
    letterSpacing: 1.2,
  },
  kicker: {
    marginTop: 22,
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    color: Colors.primary.orangeDark,
  },
  tagline: {
    marginTop: 10,
    fontSize: 32,
    lineHeight: 38,
    color: Colors.primary.brown,
    fontWeight: '800',
    maxWidth: '92%',
  },
  heroSection: {
    marginBottom: 28,
  },
  heroCard: {
    backgroundColor: Colors.primary.brown,
    borderRadius: 28,
    padding: 24,
    shadowColor: '#7A4B24',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 6,
  },
  heroIcon: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: Colors.primary.orangeDark,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFF9F2',
    marginBottom: 8,
  },
  heroDescription: {
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(255,249,242,0.84)',
  },
  optionsContainer: {
    gap: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary.brown,
    marginBottom: 2,
  },
  optionButton: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  ownerButton: {
    borderWidth: 1,
    borderColor: '#F5C28D',
  },
  vetButton: {
    borderWidth: 1,
    borderColor: '#B7D7F6',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 22,
    backgroundColor: '#FFF1E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  vetIconContainer: {
    backgroundColor: '#E9F4FF',
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
    alignItems: 'center',
    marginTop: 28,
    marginBottom: 8,
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
