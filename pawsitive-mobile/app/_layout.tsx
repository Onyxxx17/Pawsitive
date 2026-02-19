import { Stack } from "expo-router";
import { PetProvider } from "../context/PetContext";
import { UserProvider } from "../context/UserContext";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <UserProvider>
      <PetProvider>
        <StatusBar style="dark" />
        {/* This Stack manages the pages: Splash -> Login -> Tabs */}
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="login" />
          <Stack.Screen name="signup" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </PetProvider>
    </UserProvider>
  );
}