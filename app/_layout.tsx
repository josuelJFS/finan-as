import "../global.css";
import { Stack } from "expo-router";
import { useColorScheme } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useAppStore } from "../src/lib/store";
import { useEffect } from "react";
import { initializeDatabase } from "../src/lib/database";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { theme } = useAppStore();

  useEffect(() => {
    initializeDatabase().catch(console.error);
  }, []);

  // Determinar tema atual
  const currentTheme = theme === "system" ? colorScheme : theme;
  const isDark = currentTheme === "dark";

  return (
    <SafeAreaProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: isDark ? "#000000" : "#ffffff",
          },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
      </Stack>
      <StatusBar style={isDark ? "light" : "dark"} />
    </SafeAreaProvider>
  );
}
