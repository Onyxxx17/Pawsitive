import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Card from '@/components/ui/Card';
import { Colors } from '@/constants/Colors';

const checkTypes = [
  { id: 'coat', title: 'Coat & Skin', icon: 'color-wand-outline' },
  { id: 'fit', title: 'Body Fit', icon: 'barbell-outline' },
  { id: 'teeth', title: 'Teeth', icon: 'happy-outline' },
  { id: 'poop', title: 'Digestion', icon: 'leaf-outline' }, 
  { id: 'face', title: 'Eyes & Face', icon: 'eye-outline' },
];

export default function ChecksScreen() {
  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.content} 
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity activeOpacity={0.9} style={styles.mainButton}>
          <View style={styles.mainButtonContent}>
            <View style={styles.cameraIconCircle}>
              <Ionicons name="camera" size={32} color={Colors.primary.brown} />
            </View>
            <View>
              <Text style={styles.mainButtonTitle}>Start Health Check</Text>
              <Text style={styles.mainButtonSubtitle}>AI-powered full body scan</Text>
            </View>
          </View>
          <Ionicons name="arrow-forward-circle" size={32} color={Colors.primary.brown} />
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Quick Checks</Text>

        <View style={styles.grid}>
          {checkTypes.map((check) => (
            <TouchableOpacity key={check.id} style={styles.gridItem} activeOpacity={0.8}>
              <Card style={styles.checkCard}>
                <View style={styles.iconContainer}>
                  <Ionicons name={check.icon as any} size={28} color={Colors.primary.brown} />
                </View>
                <Text style={styles.checkLabel}>{check.title}</Text>
              </Card>
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.neutral.background },
  content: { padding: 20, paddingBottom: 120 },
  
  mainButton: {
    backgroundColor: Colors.primary.orange,
    borderRadius: 24, padding: 24,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 32,
    shadowColor: Colors.primary.orange, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8,
  },
  mainButtonContent: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  cameraIconCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  mainButtonTitle: { fontSize: 20, fontWeight: '800', color: Colors.primary.brown },
  mainButtonSubtitle: { fontSize: 14, color: Colors.primary.brown, opacity: 0.8 },
  
  sectionTitle: { fontSize: 20, fontWeight: '800', color: Colors.primary.brown, marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridItem: { width: '48%' }, 
  checkCard: { padding: 20, alignItems: 'center', justifyContent: 'center', height: 140, gap: 12 },
  iconContainer: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.neutral.background, justifyContent: 'center', alignItems: 'center' },
  checkLabel: { fontSize: 16, fontWeight: '700', color: Colors.primary.brown },
});