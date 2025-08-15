import "../global.css";
import React from "react";
import { Stack } from "expo-router";
import { useColorScheme } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { View } from "react-native";
import { useAppStore } from "../src/lib/store";
import { authenticateOnce, checkBiometricSupport } from "../src/lib/biometric";
import { useEffect } from "react";
import { initializeDatabase, materializeDueRecurrences } from "../src/lib/database";
import { ChartTooltipProvider } from "../src/components/charts/common/ChartTooltip";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { theme } = useAppStore();

  const biometricEnabled = useAppStore((s) => s.biometricEnabled);
  const [authChecked, setAuthChecked] = React.useState(false);

  useEffect(() => {
    (async () => {
      try {
        await initializeDatabase();
        await materializeDueRecurrences();
        // Gate biometria
        if (biometricEnabled) {
          const support = await checkBiometricSupport();
          if (support.canUse) {
            const ok = await authenticateOnce("Desbloquear App");
            if (!ok) {
              // tentar novamente ou manter bloqueado
              // Poderíamos oferecer botão retry; simplificado para loop curto
              let retried = 0;
              while (retried < 1 && !(await authenticateOnce("Desbloquear App"))) {
                retried++;
              }
            }
          }
        }
      } catch (e) {
        console.warn("[Startup] Erro durante init/materialize", e);
      } finally {
        setAuthChecked(true);
      }
    })();
  }, [biometricEnabled]);

  // Determinar tema atual
  const currentTheme = theme === "system" ? colorScheme : theme;
  const isDark = currentTheme === "dark";

  return (
    <SafeAreaProvider>
      {/* Wrapper força cor de fundo imediata evitando flash ao alternar tema/system */}
      <View style={{ flex: 1, backgroundColor: isDark ? "#0f172a" : "#ffffff" }}>
        <ChartTooltipProvider>
          {!authChecked ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <StatusBar style={isDark ? "light" : "dark"} />
              <></>
            </View>
          ) : (
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
          )}
          <StatusBar style={isDark ? "light" : "dark"} />
        </ChartTooltipProvider>
      </View>
    </SafeAreaProvider>
  );
}
