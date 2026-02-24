import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  style?: object;
  disabled?: boolean; // Added disabled prop
}

export default function Button({ title, onPress, variant = 'primary', style, disabled = false }: ButtonProps) {
  return (
    <TouchableOpacity 
      style={[styles.button, styles[variant], disabled && styles.disabled, style]} 
      onPress={onPress}
      activeOpacity={0.8}
      disabled={disabled} // Pass disabled to TouchableOpacity
    >
      <Text style={[styles.text, disabled && styles.disabledText]}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  primary: {
    backgroundColor: Colors.primary.brown,
  },
  secondary: {
    backgroundColor: Colors.primary.orange,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.primary.brown,
  },
  text: {
    color: Colors.primary.orange,
    fontSize: 16,
    fontWeight: '600',
  },
  disabled: {
    backgroundColor: Colors.neutral.disabled, // Greyed-out background for disabled state
  },
  disabledText: {
    color: Colors.neutral.textDisabled, // Greyed-out text for disabled state
  },
});
