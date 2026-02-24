import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Dimensions, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

const { width } = Dimensions.get('window');

const SLIDES = [
  { id: '1', title: 'Scan & Detect', desc: 'Use Pawsitive AI to instantly analyze your pet\'s health.', icon: 'camera-iris', color: Colors.primary.orange },
  { id: '2', title: 'Track Vitals', desc: 'Keep a positive track of walks, meals, and vaccinations.', icon: 'chart-line', color: '#4CAF50' },
  { id: '3', title: 'Ask Pawsitive', desc: 'Get instant answers from our AI veterinary assistant.', icon: 'chat-processing', color: '#2196F3' }
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);

  return (
    <View style={styles.container}>
      <FlatList
        data={SLIDES}
        horizontal pagingEnabled showsHorizontalScrollIndicator={false}
        onScroll={(e) => setCurrentIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <View style={[styles.imageContainer, { backgroundColor: item.color + '20' }]}>
              <MaterialCommunityIcons name={item.icon as any} size={100} color={item.color} />
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.desc}>{item.desc}</Text>
          </View>
        )}
      />
      <View style={styles.footer}>
        <TouchableOpacity style={styles.btn} onPress={() => router.replace('/landing')}>
          <Text style={styles.btnText}>Get Started</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  slide: { width, alignItems: 'center', justifyContent: 'center', padding: 40 },
  imageContainer: { width: 250, height: 250, borderRadius: 125, justifyContent: 'center', alignItems: 'center', marginBottom: 40 },
  title: { fontSize: 28, fontWeight: '800', color: Colors.primary.brown, marginBottom: 15 },
  desc: { fontSize: 16, color: Colors.neutral.textLight, textAlign: 'center', lineHeight: 24 },
  footer: { padding: 40, alignItems: 'center' },
  btn: { backgroundColor: Colors.primary.brown, paddingVertical: 15, paddingHorizontal: 40, borderRadius: 30 },
  btnText: { fontSize: 16, fontWeight: '700', color: '#fff' }
});