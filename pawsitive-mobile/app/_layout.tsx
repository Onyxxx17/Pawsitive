import { Stack } from "expo-router";
import { PetProvider } from "./context/PetContext"; // Import the provider

export default function RootLayout() {
  return (
    // 🐾 Wrap everything in PetProvider
    <PetProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </PetProvider>
  );
}