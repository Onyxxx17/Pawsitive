import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary.brown,
        tabBarInactiveTintColor: Colors.primary.brown,
        tabBarStyle: {
          backgroundColor: Colors.primary.orange, 
          height: 80,
          position: 'absolute',
          borderRadius: 24,
          marginHorizontal: 16,
          marginBottom: 16,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.25,
          shadowRadius: 16,
          elevation: 12,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '800',
          color: Colors.primary.brown,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "home" : "home-outline"} size={26} color={Colors.primary.brown} /> }} />
      <Tabs.Screen name="checks" options={{ title: 'Daily', tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "checkmark-circle" : "checkmark-circle-outline"} size={26} color={Colors.primary.brown} /> }} />
      <Tabs.Screen name="teleconsult" options={{ title: 'Video', tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "videocam" : "videocam-outline"} size={26} color={Colors.primary.brown} /> }} />
      <Tabs.Screen name="care" options={{ title: 'Care', tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "heart" : "heart-outline"} size={26} color={Colors.primary.brown} /> }} />
      <Tabs.Screen name="health" options={{ title: 'Health', tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "medkit" : "medkit-outline"} size={26} color={Colors.primary.brown} /> }} />
      <Tabs.Screen name="chat" options={{ title: 'Chat', tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "chatbubble" : "chatbubble-outline"} size={26} color={Colors.primary.brown} /> }} />
    </Tabs>
  );
}
