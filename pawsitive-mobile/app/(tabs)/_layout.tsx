import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Platform, Alert, Modal } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { usePet } from '../../context/PetContext';
import { supabase } from '@/lib/supabase';

// 🎨 Custom Header with Functional Dropdown and Sidebar
const CustomHeader = () => {
  const router = useRouter();
  const { activePet, setActivePet, pets } = usePet();
  const [expanded, setExpanded] = React.useState(false);
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const handleLogout = async () => {
    setSidebarOpen(false);
    Alert.alert(
      "Log Out",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log Out",
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase.auth.signOut();
            if (error) {
              Alert.alert("Error", error.message);
            } else {
              router.replace('/login');
            }
          }
        }
      ]
    );
  };

  const handleSelect = (pet: any) => {
    setActivePet(pet);
    setExpanded(false);
  };

  return (
    <>
      <SafeAreaView edges={['top']} style={styles.headerContainer}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.iconButton} onPress={() => setSidebarOpen(true)}>
            <Ionicons name="menu" size={26} color={Colors.primary.brown} />
          </TouchableOpacity>

        {/* 🐾 Functional Dropdown */}
        <View style={{ zIndex: 100 }}>
          <TouchableOpacity 
            style={styles.petDropdown} 
            onPress={() => setExpanded(!expanded)}
          >
            <Image source={{ uri: activePet.avatar }} style={styles.tinyAvatar} />
            <Text style={styles.petName}>{activePet.name}</Text>
            <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={16} color={Colors.primary.brown} />
          </TouchableOpacity>

          {/* Dropdown Menu (Absolute Position) */}
          {expanded && (
            <View style={styles.dropdownMenu}>
              {pets.map((pet: any) => (
                <TouchableOpacity 
                  key={pet.id} 
                  style={styles.dropdownItem} 
                  onPress={() => handleSelect(pet)}
                >
                  <Image source={{ uri: pet.avatar }} style={styles.tinyAvatar} />
                  <Text style={[
                    styles.dropdownText, 
                    activePet.id === pet.id && { color: Colors.primary.orangeDark, fontWeight: 'bold' }
                  ]}>
                    {pet.name}
                  </Text>
                  {activePet.id === pet.id && <Ionicons name="checkmark" size={16} color={Colors.primary.orangeDark} />}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.iconButton}>
          <Ionicons name="notifications-outline" size={26} color={Colors.primary.brown} />
          <View style={styles.badge} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>

      {/* 🔹 Sidebar Menu Modal */}
      <Modal
        visible={sidebarOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSidebarOpen(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setSidebarOpen(false)}
        >
          <View style={styles.sidebar}>
            {/* Header */}
            <View style={styles.sidebarHeader}>
              <Text style={styles.sidebarTitle}>Menu</Text>
              <TouchableOpacity onPress={() => setSidebarOpen(false)}>
                <Ionicons name="close" size={28} color={Colors.primary.brown} />
              </TouchableOpacity>
            </View>

            {/* Menu Items */}
            <View style={styles.menuItems}>
              <TouchableOpacity style={styles.menuItem} onPress={() => {
                setSidebarOpen(false);
                router.push('/profile');
              }}>
                <Ionicons name="person-outline" size={24} color={Colors.primary.brown} />
                <Text style={styles.menuText}>Profile</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem} onPress={() => {
                setSidebarOpen(false);
                // Add your settings navigation here
              }}>
                <Ionicons name="settings-outline" size={24} color={Colors.primary.brown} />
                <Text style={styles.menuText}>Settings</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem} onPress={() => {
                setSidebarOpen(false);
                // Add your help navigation here
              }}>
                <Ionicons name="help-circle-outline" size={24} color={Colors.primary.brown} />
                <Text style={styles.menuText}>Help & Support</Text>
              </TouchableOpacity>

              <View style={styles.menuDivider} />

              <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={24} color="#e74c3c" />
                <Text style={[styles.menuText, { color: '#e74c3c' }]}>Log Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

// 📸 The "Nicer" Featured Camera Button
const CustomCVButton = ({ onPress }: any) => (
  <TouchableOpacity
    style={styles.cameraButtonContainer}
    onPress={onPress}
    activeOpacity={0.9}
  >
    <View style={styles.cameraButtonOuter}>
        <MaterialCommunityIcons name="camera-iris" size={32} color="#FFF" />
    </View>
  </TouchableOpacity>
);

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        header: () => <CustomHeader />,
        tabBarShowLabel: false,
        tabBarActiveTintColor: Colors.primary.brown,
        tabBarInactiveTintColor: Colors.neutral.textLight,
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: { height: '100%', justifyContent: 'center', alignItems: 'center' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "home" : "home-outline"} size={28} color={color} />,
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: 'Activity',
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "calendar" : "calendar-outline"} size={28} color={color} />,
        }}
      />
      <Tabs.Screen
        name="camera"
        options={{
          title: '',
          tabBarButton: (props) => <CustomCVButton {...props} />,
        }}
      />
      <Tabs.Screen
        name="health"
        options={{
          title: 'Health',
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "heart" : "heart-outline"} size={28} color={color} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'PawPal',
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "chatbubble-ellipses" : "chatbubble-ellipses-outline"} size={28} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{ href: null }} // hidden from tab bar; accessible via hamburger menu
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  headerContainer: { backgroundColor: Colors.neutral.background, borderBottomWidth: 1, borderBottomColor: Colors.neutral.border, zIndex: 999 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 10, height: 60 },
  
  // Dropdown Styles
  petDropdown: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#eee' },
  petName: { fontSize: 16, fontWeight: '700', color: Colors.primary.brown, marginRight: 6 },
  tinyAvatar: { width: 24, height: 24, borderRadius: 12, marginRight: 8 },
  
  dropdownMenu: { position: 'absolute', top: 45, left: 0, right: 0, backgroundColor: '#fff', borderRadius: 12, padding: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', padding: 10, borderBottomWidth: 0.5, borderBottomColor: '#eee' },
  dropdownText: { fontSize: 14, color: Colors.primary.brown, flex: 1 },

  iconButton: { padding: 5 },
  badge: { position: 'absolute', top: 5, right: 5, width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.health.poor },

  tabBar: { height: Platform.OS === 'ios' ? 90 : 70, backgroundColor: '#ffffff', borderTopWidth: 0, elevation: 8, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: -2 }, position: 'absolute', bottom: 0, paddingTop: 10 },
  
  cameraButtonContainer: { top: -25, justifyContent: 'center', alignItems: 'center' },
  cameraButtonOuter: { width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.primary.orangeDark, justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: '#ffffff', shadowColor: Colors.primary.orangeDark, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8 },

  // Sidebar Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-start' },
  sidebar: { width: 280, height: '100%', backgroundColor: '#fff', paddingTop: 60, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10, elevation: 10 },
  sidebarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#eee' },
  sidebarTitle: { fontSize: 24, fontWeight: 'bold', color: Colors.primary.brown },
  menuItems: { paddingTop: 20 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 20, gap: 15 },
  menuText: { fontSize: 16, color: Colors.primary.brown, fontWeight: '500' },
  menuDivider: { height: 1, backgroundColor: '#eee', marginVertical: 10, marginHorizontal: 20 },
});