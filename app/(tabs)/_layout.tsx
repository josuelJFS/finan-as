import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme, View, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import { BudgetDAO } from "../../src/lib/database/BudgetDAO";
import { Events } from "../../src/lib/events";
import { useAppStore } from "../../src/lib/store";
import {
  buildFiltersAccessibilityLabel,
  countActiveFilters,
} from "../../src/features/transactions/filtersUtil";
// Nota: reorganizado imports para incluir store e events antes

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { theme } = useAppStore();
  const [budgetAlerts, setBudgetAlerts] = useState<number>(0);
  const lastUsedFilters = useAppStore((s) => s.lastUsedFilters);
  const insets = useSafeAreaInsets();

  // Carrega alertas de orçamento (orçamentos onde percentage >= alert_percentage)
  async function loadBudgetAlerts() {
    try {
      const dao = BudgetDAO.getInstance();
      const alerts = await dao.getBudgetsWithAlerts();
      setBudgetAlerts(alerts.length);
    } catch (e) {
      console.warn("[TabLayout] Falha ao carregar alertas de orçamento", e);
    }
  }

  useEffect(() => {
    loadBudgetAlerts();
    // Reagir a mudanças relevantes: budgets invalidated ou transações alteradas
    const off1 = Events.on("budgets:progressInvalidated", () => loadBudgetAlerts());
    const off2 = Events.on("transactions:changed", () => loadBudgetAlerts());
    return () => {
      off1();
      off2();
    };
  }, []);

  // Determinar tema atual
  const currentTheme = theme === "system" ? colorScheme : theme;
  const isDark = currentTheme === "dark";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#16a34a",
        tabBarInactiveTintColor: isDark ? "#6b7280" : "#9ca3af",
        tabBarStyle: {
          backgroundColor: isDark ? "#1f2937" : "#ffffff",
          borderTopWidth: 0,
          height: 54 + insets.bottom,
          paddingBottom: insets.bottom,
        },
        headerStyle: {
          backgroundColor: isDark ? "#1f2937" : "#ffffff",
        },
        headerTintColor: isDark ? "#ffffff" : "#000000",
        headerTitleStyle: {
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          headerShown: false,
          tabBarIcon: ({ color }) => <Ionicons name="home" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: "Transações",
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <View style={{ width: 28, height: 24, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="list" size={22} color={color} />
              {lastUsedFilters && Object.keys(lastUsedFilters).length > 0 && (
                <View
                  style={{
                    position: "absolute",
                    top: -2,
                    right: -2,
                    minWidth: 14,
                    height: 14,
                    borderRadius: 7,
                    backgroundColor: "#6366f1",
                    paddingHorizontal: 3,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  accessibilityLabel={`${countActiveFilters(lastUsedFilters)} grupos de filtros ativos. ${buildFiltersAccessibilityLabel(lastUsedFilters)}`}
                >
                  <Text style={{ color: "white", fontSize: 9, fontWeight: "600" }}>•</Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="budgets"
        options={{
          title: "Orçamentos",
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <View style={{ width: 28, height: 24, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="pie-chart" size={22} color={color} />
              {budgetAlerts > 0 && (
                <View
                  style={{
                    position: "absolute",
                    top: -2,
                    right: -2,
                    minWidth: 16,
                    height: 16,
                    borderRadius: 8,
                    backgroundColor: "#ef4444",
                    paddingHorizontal: 4,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  accessibilityLabel={`${budgetAlerts} orçamentos em alerta`}
                >
                  <Text style={{ color: "white", fontSize: 10, fontWeight: "600" }}>
                    {budgetAlerts > 99 ? "99+" : budgetAlerts}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: "Relatórios",
          headerShown: false,
          tabBarIcon: ({ color }) => <Ionicons name="stats-chart" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Configurações",
          headerShown: false,
          tabBarIcon: ({ color }) => <Ionicons name="settings" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
