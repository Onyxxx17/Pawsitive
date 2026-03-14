import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';

type FAQItem = {
  id: string;
  question: string;
  answer: string;
};

const FAQ_DATA: FAQItem[] = [
  {
    id: '1',
    question: 'How do I add a new pet profile?',
    answer: 'Go to your Profile tab, scroll down to the Pets section, and tap the "+" button. Fill in your pet\'s details including name, species, breed, and other information. Don\'t forget to add a photo!',
  },
  {
    id: '2',
    question: 'How do I change my email address?',
    answer: 'Tap the menu (☰) in the top-left corner, select "Settings", then enter your new email and current password. We\'ll send a verification link to your new email address. Click the link to confirm the change.',
  },
  {
    id: '4',
    question: 'How do I edit my pet\'s information?',
    answer: 'Go to the Profile tab, find your pet in the Pets section, and tap on their card. Then tap the edit icon to update their information.',
  },
  {
    id: '5',
    question: 'Is my pet\'s health data secure?',
    answer: 'Yes! All data is encrypted and stored securely in our database. We use industry-standard security practices and never share your information without permission.',
  },
  
];

const CONTACT_OPTIONS = [
  {
    id: 'email',
    icon: 'mail-outline' as const,
    title: 'Email Support',
    subtitle: 'support@pawsitive.com',
    action: () => Linking.openURL('mailto:support@pawsitive.com'),
  },
  {
    id: 'website',
    icon: 'globe-outline' as const,
    title: 'Visit Our Website',
    subtitle: 'www.pawsitive.com',
    action: () => Linking.openURL('https://www.pawsitive.com'),
  },
  {
    id: 'feedback',
    icon: 'chatbubble-outline' as const,
    title: 'Send Feedback',
    subtitle: 'We love to hear from you!',
    action: () => Linking.openURL('mailto:feedback@pawsitive.com?subject=App Feedback'),
  },
  {
    id: 'bug',
    icon: 'bug-outline' as const,
    title: 'Report a Bug',
    subtitle: 'Help us improve',
    action: () => Linking.openURL('mailto:support@pawsitive.com?subject=Bug Report'),
  },
];

export default function HelpScreen() {
  const router = useRouter();
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);

  const toggleFAQ = (id: string) => {
    setExpandedFAQ(expandedFAQ === id ? null : id);
  };

  const handleContactPress = async (action: () => void) => {
    try {
      await action();
    } catch {
      Alert.alert('Error', 'Unable to open this option. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary.brown} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Ionicons name="help-circle" size={48} color={Colors.primary.orange} />
          <Text style={styles.welcomeTitle}>How can we help you?</Text>
          <Text style={styles.welcomeSubtitle}>
            Find answers to common questions or get in touch with our support team
          </Text>
        </View>

        {/* FAQ Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          {FAQ_DATA.map((faq) => (
            <TouchableOpacity
              key={faq.id}
              style={styles.faqItem}
              onPress={() => toggleFAQ(faq.id)}
              activeOpacity={0.7}
            >
              <View style={styles.faqHeader}>
                <Text style={styles.faqQuestion}>{faq.question}</Text>
                <Ionicons
                  name={expandedFAQ === faq.id ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={Colors.primary.brown}
                />
              </View>
              {expandedFAQ === faq.id && (
                <Text style={styles.faqAnswer}>{faq.answer}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Contact Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Get in Touch</Text>
          {CONTACT_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={styles.contactItem}
              onPress={() => handleContactPress(option.action)}
              activeOpacity={0.7}
            >
              <View style={styles.contactIcon}>
                <Ionicons name={option.icon} size={24} color={Colors.primary.orange} />
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactTitle}>{option.title}</Text>
                <Text style={styles.contactSubtitle}>{option.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.neutral.textLight} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick Tips Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Tips</Text>
          <View style={styles.tipCard}>
            <Ionicons name="bulb-outline" size={24} color={Colors.primary.orange} />
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>{`Keep Your Pet's Info Updated`}</Text>
              <Text style={styles.tipText}>
                {`Regular updates to weight, medications, and health conditions help us provide better insights!`}
              </Text>
            </View>
          </View>
          <View style={styles.tipCard}>
            <Ionicons name="camera-outline" size={24} color={Colors.primary.orange} />
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Add Photos</Text>
              <Text style={styles.tipText}>
                Upload clear photos of your pet to track their appearance and health over time.
              </Text>
            </View>
          </View>
          <View style={styles.tipCard}>
            <Ionicons name="shield-checkmark-outline" size={24} color={Colors.primary.orange} />
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Enable Notifications</Text>
              <Text style={styles.tipText}>
                {`Stay on top of your pet's care with reminders for feeding, medication, and vet appointments.`}
              </Text>
            </View>
          </View>
        </View>

        {/* Version Info */}
        <View style={styles.versionSection}>
          <Text style={styles.versionText}>Pawsitive v1.0.0</Text>
          <Text style={styles.versionSubtext}>© 2026 Pawsitive. All rights reserved.</Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral.border,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary.brown,
  },
  content: {
    flex: 1,
  },
  welcomeSection: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    backgroundColor: Colors.neutral.background,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.primary.brown,
    marginTop: 16,
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 15,
    color: Colors.neutral.textLight,
    textAlign: 'center',
    lineHeight: 22,
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary.brown,
    marginBottom: 16,
  },
  faqItem: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.neutral.border,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  faqQuestion: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primary.brown,
    flex: 1,
    marginRight: 8,
  },
  faqAnswer: {
    fontSize: 14,
    color: Colors.neutral.textLight,
    lineHeight: 20,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral.border,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.neutral.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  contactIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contactInfo: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primary.brown,
    marginBottom: 2,
  },
  contactSubtitle: {
    fontSize: 13,
    color: Colors.neutral.textLight,
  },
  tipCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF8F0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FFE5CC',
  },
  tipContent: {
    flex: 1,
    marginLeft: 12,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary.brown,
    marginBottom: 4,
  },
  tipText: {
    fontSize: 13,
    color: Colors.neutral.textLight,
    lineHeight: 18,
  },
  versionSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  versionText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.neutral.textLight,
    marginBottom: 4,
  },
  versionSubtext: {
    fontSize: 12,
    color: Colors.neutral.textLight,
  },
});
