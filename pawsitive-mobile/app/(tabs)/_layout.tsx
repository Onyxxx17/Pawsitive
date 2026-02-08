import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { Platform } from 'react-native';
import Header from '@/components/shared/Header'; 

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        header: () => <Header />,
        headerShown: true,
        tabBarActiveTintColor: Colors.primary.brown,
        tabBarInactiveTintColor: Colors.primary.brown,
        tabBarStyle: {
          backgroundColor: Colors.primary.orange,
          position: 'absolute',
          bottom: 25,
          left: 20,
          right: 20,
          height: 65,
          borderRadius: 35,
          borderTopWidth: 0,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.15,
          shadowRadius: 10,
          elevation: 5,
        },
        tabBarShowLabel: false,
        tabBarItemStyle: {
          paddingTop: 12,
        }
      }}
    >
      <Tabs.Screen 
        name="index" 
        options={{ 
          title: 'Home', 
          tabBarIcon: ({ focused }) => <Ionicons name={focused ? "home" : "home-outline"} size={26} color={Colors.primary.brown} /> 
        }} 
      />
      
      <Tabs.Screen 
        name="checks" 
        options={{ 
          title: 'Checks', 
          tabBarIcon: ({ focused }) => <Ionicons name={focused ? "checkmark-circle" : "checkmark-circle-outline"} size={26} color={Colors.primary.brown} /> 
        }} 
      />

      {/* --- ADDED FROM TEAMMATE (Video Call) --- */}
      {/* <Tabs.Screen 
        name="teleconsult" 
        options={{ 
          title: 'Video', 
          tabBarIcon: ({ focused }) => <Ionicons name={focused ? "videocam" : "videocam-outline"} size={26} color={Colors.primary.brown} /> 
        }} 
      /> */}

      <Tabs.Screen 
        name="care" 
        options={{ 
          title: 'Care', 
          tabBarIcon: ({ focused }) => <Ionicons name={focused ? "heart" : "heart-outline"} size={26} color={Colors.primary.brown} /> 
        }} 
      />
      
      <Tabs.Screen 
        name="health" 
        options={{ 
          title: 'Health', 
          tabBarIcon: ({ focused }) => <Ionicons name={focused ? "medkit" : "medkit-outline"} size={26} color={Colors.primary.brown} /> 
        }} 
      />

      <Tabs.Screen 
        name="chat" 
        options={{ 
          title: 'Chat',
          tabBarIcon: ({ focused }) => (
            <Ionicons 
              name={focused ? "chatbubbles" : "chatbubbles-outline"} 
              size={26} 
              color={Colors.primary.brown} 
            />
          )
        }} 
      />
    </Tabs>
  );
}