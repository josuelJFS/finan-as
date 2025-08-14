import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme, View, Text } from "react-native";
import { useAppStore } from "../../src/lib/store";
import { useEffect, useState } from "react";
import { BudgetDAO } from "../../src/lib/database/BudgetDAO";
import { Events } from "../../src/lib/events";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { theme } = useAppStore();
  const [budgetAlerts, setBudgetAlerts] = useState<number>(0);

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
        tabBarActiveTintColor: "#3b82f6",
        tabBarInactiveTintColor: isDark ? "#6b7280" : "#9ca3af",
        tabBarStyle: {
          backgroundColor: isDark ? "#1f2937" : "#ffffff",
          borderTopColor: isDark ? "#374151" : "#e5e7eb",
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
          tabBarIcon: ({ color }) => <Ionicons name="home" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: "Transações",
          tabBarIcon: ({ color }) => <Ionicons name="list" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="budgets"
        options={{
          title: "Orçamentos",
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
                >
                  <Text style={{ color: "white", fontSize: 10, fontWeight: "600" }}>
                    {budgetAlerts > 9 ? "9+" : budgetAlerts}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Configurações",
          tabBarIcon: ({ color }) => <Ionicons name="settings" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
