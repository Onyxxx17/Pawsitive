import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Platform, Alert, Modal } from 'react-native';
import { Tabs, usePathname, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { usePet } from '../../context/PetContext';
import { supabase } from '@/lib/supabase';
import NotificationPanel from '@/components/shared/NotificationPanel';
import type { Pet } from '@/context/PetContext';

// 🎨 Custom Header with Functional Dropdown and Sidebar
const CustomHeader = () => {
  const router = useRouter();
  const { activePet, setActivePet, pets } = usePet();
  const [expanded, setExpanded] = React.useState(false);
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [showNotifications, setShowNotifications] = React.useState(false);

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

  const handleSelect = (pet: Pet) => {
    setActivePet(pet);
    setExpanded(false);
  };

  const navigateTo = (route: '/profile' | '/help') => {
    setExpanded(false);
    setSidebarOpen(false);
    router.push(route);
  };

  return (
    <>
      <SafeAreaView edges={['top']} style={styles.headerContainer}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.iconButton} onPress={() => setSidebarOpen(true)}>
            <Ionicons name="menu" size={26} color={Colors.primary.brown} />
          </TouchableOpacity>

        {/* 🐾 Functional Dropdown */}
        <View style={styles.petDropdownWrap}>
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
              {pets.map((pet: Pet) => (
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

        <TouchableOpacity style={styles.headerActionButton} onPress={() => setShowNotifications(true)}>
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
              <TouchableOpacity style={styles.menuItem} onPress={() => navigateTo('/profile')}>
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

              <TouchableOpacity style={styles.menuItem} onPress={() => navigateTo('/help')}>
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
      <NotificationPanel visible={showNotifications} onClose={() => setShowNotifications(false)} />
    </>
  );
};

// 📸 The "Nicer" Featured Camera Button
const CustomCVButton = ({ onPress, isSelected, label }: { onPress?: (...args: any[]) => void; isSelected: boolean; label: string }) => {
  return (
  <TouchableOpacity
    style={styles.cameraButtonContainer}
    onPress={onPress}
    activeOpacity={0.9}
  >
    <View style={[styles.cameraButtonOuter, isSelected && styles.cameraButtonOuterActive]}>
        <MaterialCommunityIcons
          name="camera-iris"
          size={32}
          color="#FFF"
        />
    </View>
    <Text style={[styles.cameraButtonLabel, isSelected && styles.cameraButtonLabelActive]}>{label}</Text>
  </TouchableOpacity>
  );
};

export default function TabLayout() {
  const pathname = usePathname();
  const isCameraActive = pathname === '/camera';

  return (
    <Tabs
      screenOptions={{
        header: () => <CustomHeader />,
        tabBarShowLabel: true,
        tabBarActiveTintColor: Colors.primary.brown,
        tabBarInactiveTintColor: Colors.neutral.textLight,
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabBarItem,
        tabBarLabelStyle: styles.tabBarLabel,
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
          title: 'Scan',
          tabBarButton: ({ onPress }) => <CustomCVButton onPress={onPress} isSelected={isCameraActive} label="Scan" />,
        }}
      />
      <Tabs.Screen
        name="health"
        options={{
          title: 'Health',
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "medkit" : "medkit-outline"} size={28} color={color} />,
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
  headerContainer: { backgroundColor: '#F8F4ED', borderBottomWidth: 1, borderBottomColor: '#E9DDCD', zIndex: 999 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12, paddingTop: 6, minHeight: 68 },
  
  petDropdownWrap: { flex: 1, alignItems: 'center', zIndex: 100 },
  petDropdown: { flexDirection: 'row', alignItems: 'center', maxWidth: '88%', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#fff', borderRadius: 22, borderWidth: 1, borderColor: '#EADCC9' },
  petName: { fontSize: 15, fontWeight: '700', color: Colors.primary.brown, marginRight: 6 },
  tinyAvatar: { width: 26, height: 26, borderRadius: 13, marginRight: 8 },
  
  dropdownMenu: { position: 'absolute', top: 48, left: 12, right: 12, backgroundColor: '#fff', borderRadius: 16, padding: 6, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, elevation: 5 },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', padding: 10, borderBottomWidth: 0.5, borderBottomColor: '#eee' },
  dropdownText: { fontSize: 14, color: Colors.primary.brown, flex: 1 },

  iconButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#EADCC9' },
  headerActionButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#EADCC9' },
  badge: { position: 'absolute', top: 5, right: 5, width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.health.poor },

  tabBar: { height: Platform.OS === 'ios' ? 96 : 78, backgroundColor: '#ffffff', borderTopWidth: 0, elevation: 8, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: -2 }, position: 'absolute', bottom: 0, paddingTop: 8, paddingBottom: Platform.OS === 'ios' ? 16 : 10 },
  tabBarItem: { height: '100%', justifyContent: 'center', alignItems: 'center', paddingTop: 4 },
  tabBarLabel: { fontSize: 11, fontWeight: '700', marginTop: -2, marginBottom: 2 },
  
  cameraButtonContainer: { top: -18, justifyContent: 'center', alignItems: 'center', width: 78 },
  cameraButtonOuter: { width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.primary.orangeDark, justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: '#ffffff', shadowColor: Colors.primary.orangeDark, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8 },
  cameraButtonOuterActive: { backgroundColor: Colors.primary.brown, borderColor: '#FFF3E6', shadowColor: Colors.primary.brown },
  cameraButtonLabel: { marginTop: 6, fontSize: 11, fontWeight: '700', color: Colors.neutral.textLight },
  cameraButtonLabelActive: { color: Colors.primary.brown },

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
