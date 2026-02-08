import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { usePetsStore } from '@/store/pets';

export default function Header() {
  const { width } = useWindowDimensions();
  const { pets, currentPetId, setCurrentPet } = usePetsStore();
  const currentPet = pets.find(p => p.id === currentPetId);

  return (
    <View style={[styles.header, { width }]}>
      {/* Menu Button */}
      <TouchableOpacity style={styles.iconButton}>
        <Ionicons name="menu-outline" size={24} color={Colors.primary.brown} />
      </TouchableOpacity>

      {/* Pet Selector */}
      <View style={styles.petSelector}>
        <Text style={styles.petName}>{currentPet?.name || 'Mochi'}</Text>
        <Text style={styles.petDetails}>
          {currentPet?.breed} • {currentPet?.age}y • {currentPet?.weight}kg
        </Text>
      </View>

      {/* User Avatar */}
      <TouchableOpacity style={styles.avatar}>
        <Ionicons name="person-circle-outline" size={32} color={Colors.primary.brown} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 80,
    backgroundColor: Colors.primary.orange,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  iconButton: {
    padding: 8,
  },
  petSelector: {
    flex: 1,
    marginLeft: 8,
    paddingLeft: 8,
  },
  petName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary.brown,
    marginBottom: 2,
  },
  petDetails: {
    fontSize: 14,
    color: Colors.primary.brown,
    opacity: 0.8,
  },
  avatar: {
    padding: 8,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
});
