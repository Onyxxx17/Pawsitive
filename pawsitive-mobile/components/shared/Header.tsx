import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Header() {
  return (
    <View style={{ backgroundColor: Colors.neutral.background }}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.container}>
          {/* Left: Profile / Menu */}
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="menu" size={24} color={Colors.primary.brown} />
          </TouchableOpacity>

          {/* Center: Brand Name */}
          <View style={styles.titleContainer}>
            <Ionicons name="paw" size={20} color={Colors.primary.orange} />
            <Text style={styles.title}>PAWSITIVE</Text>
          </View>

          {/* Right: Notifications */}
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="notifications-outline" size={24} color={Colors.primary.brown} />
            <View style={styles.badge} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: Colors.neutral.background,
    // Add a little extra padding for Android if needed
    paddingTop: Platform.OS === 'android' ? 10 : 0, 
  },
  container: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.primary.brown,
    letterSpacing: 1,
  },
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary.orange,
    borderWidth: 1,
    borderColor: '#fff',
  },
});