import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { StatusBar } from 'expo-status-bar';

export default function SplashScreen() {
  const router = useRouter();
  const fadeAnim = new Animated.Value(0);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 1000, useNativeDriver: true }).start();
    
    const timer = setTimeout(() => {
      router.replace('/onboarding');
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <Animated.View style={{ opacity: fadeAnim, alignItems: 'center' }}>
        {/* 📸 YOUR CUSTOM LOGO */}
        <View style={styles.logoContainer}>
          <Image 
            source={require('@/assets/images/pawsitive.png')} 
            style={styles.logo} 
            resizeMode="contain" 
          />
        </View>
        <Text style={styles.appName}>Pawsitive</Text>
        <Text style={styles.tagline}>Positive vibes for your pets</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primary.orange, justifyContent: 'center', alignItems: 'center' },
  logoContainer: { 
    width: 120, height: 120, 
    backgroundColor: '#fff', 
    borderRadius: 60, 
    justifyContent: 'center', alignItems: 'center', 
    marginBottom: 20, 
    elevation: 10, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10 
  },
  logo: { width: 80, height: 80 },
  appName: { fontSize: 42, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  tagline: { fontSize: 16, color: 'rgba(255,255,255,0.9)', marginTop: 5, fontWeight: '600' },
});