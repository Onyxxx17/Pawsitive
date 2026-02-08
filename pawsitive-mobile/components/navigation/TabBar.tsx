import React, { useState, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  Animated,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useRouter, usePathname } from 'expo-router';

const tabs = [
  { name: 'Home', href: '/', icon: 'home-outline', label: 'Overview' },
  { name: 'Checks', href: '/checks', icon: 'camera-outline', label: 'AI Scans' },
  { name: 'Care', href: '/care', icon: 'checkmark-circle-outline', label: 'Routines' },
  { name: 'Health', href: '/health', icon: 'heart-outline', label: 'Health & TeleVet' },
];

interface TabBarProps {
  scrollY: Animated.Value;
}

export default function CustomTabBar({ scrollY }: TabBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [translateY] = useState(new Animated.Value(0));
  const [opacity] = useState(new Animated.Value(1));

  useEffect(() => {
    const listener = scrollY.addListener(({ value }) => {
      const direction = value > 0 ? -1 : 1;
      Animated.spring(translateY, {
        toValue: direction * 100,
        tension: 200,
        friction: 8,
        useNativeDriver: true,
      }).start();
      
      Animated.timing(opacity, {
        toValue: direction === -1 ? 0 : 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });

    return () => scrollY.removeListener(listener);
  }, [scrollY, translateY, opacity]);

  return (
    <Animated.View 
      style={[
        styles.tabBar,
        {
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.tabItem}
            onPress={() => router.push(tab.href as any)}
          >
            <Ionicons 
              name={isActive ? (tab.icon.replace('-outline', '-sharp') as keyof typeof Ionicons.glyphMap) : (tab.icon as keyof typeof Ionicons.glyphMap)}
              size={24} 
              color={Colors.primary.brown} 
            />
            <Text style={[styles.tabLabel, isActive && styles.activeLabel]}>
              {tab.label}
            </Text>
            {isActive && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
        );
      })}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.primary.orange,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral.border,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  tabLabel: {
    fontSize: 12,
    color: Colors.primary.brown,
    opacity: 0.7,
    marginTop: 4,
    fontWeight: '500',
  },
  activeLabel: {
    opacity: 1,
    fontWeight: '700',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary.brown,
  },
});
