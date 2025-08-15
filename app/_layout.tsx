import "../global.css";
import { Stack } from "expo-router";
import { useColorScheme } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { View } from "react-native";
import { useAppStore } from "../src/lib/store";
import { useEffect } from "react";
import { initializeDatabase, materializeDueRecurrences } from "../src/lib/database";
import { ChartTooltipProvider } from "../src/components/charts/common/ChartTooltip";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { theme } = useAppStore();

  useEffect(() => {
    (async () => {
      try {
        await initializeDatabase();
        await materializeDueRecurrences();
      } catch (e) {
        console.warn("[Startup] Erro durante init/materialize", e);
      }
    })();
  }, []);

  // Determinar tema atual
  const currentTheme = theme === "system" ? colorScheme : theme;
  const isDark = currentTheme === "dark";

  return (
    <SafeAreaProvider>
      {/* Wrapper força cor de fundo imediata evitando flash ao alternar tema/system */}
      <View style={{ flex: 1, backgroundColor: isDark ? "#0f172a" : "#ffffff" }}>
        <ChartTooltipProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: {
                backgroundColor: isDark ? "#0f172a" : "#ffffff",
              },
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="budgets/create" options={{ presentation: "modal" }} />
            <Stack.Screen name="recurrences/index" />
            <Stack.Screen name="recurrences/new" options={{ presentation: "modal" }} />
          </Stack>
          <StatusBar style={isDark ? "light" : "dark"} />
        </ChartTooltipProvider>
      </View>
    </SafeAreaProvider>
  );
}
