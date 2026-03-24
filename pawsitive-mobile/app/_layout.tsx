import { Stack } from "expo-router";
import { PetProvider } from "../context/PetContext";
import { UserProvider } from "../context/UserContext";
import { VetProvider } from "../context/VetContext";
import { StatusBar } from "expo-status-bar";
import React from "react";

export default function RootLayout() {
  return (
    <VetProvider>
      <UserProvider>
        <PetProvider>
          <StatusBar style="dark" />
          {/* This Stack manages the pages: Splash -> Login -> Tabs */}
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="landing" />
            <Stack.Screen name="login" />
            <Stack.Screen name="signup" />
            <Stack.Screen name="vet-login" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="(vet)" />
          </Stack>
        </PetProvider>
      </UserProvider>
    </VetProvider>
  );
}
