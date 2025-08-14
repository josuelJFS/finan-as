import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useState, useEffect, useCallback } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { BudgetDAO } from "../../src/lib/database";
import { formatCurrency } from "../../src/lib/utils";
import type { BudgetProgress } from "../../src/lib/database/BudgetDAO";

export default function BudgetsScreen() {
  const router = useRouter();
  const [budgetProgressList, setBudgetProgressList] = useState<BudgetProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const budgetDAO = BudgetDAO.getInstance();

  useEffect(() => {
    loadBudgets();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadBudgets();
    }, [])
  );

  const loadBudgets = async () => {
    try {
      setLoading(true);
      console.log("Iniciando carregamento de orçamentos...");

      // Primeiro, teste simples de conexão
      const testResults = await budgetDAO.testConnection();
      console.log("Teste de conexão:", testResults);

      // Se chegou até aqui, agora tenta carregamento completo
      const progressList = await budgetDAO.getCurrentActiveBudgets();
      console.log("Orçamentos carregados:", progressList);

      setBudgetProgressList(progressList);
    } catch (error) {
      console.error("Erro ao carregar orçamentos:", error);
      if (error instanceof Error) {
        console.error("Stack trace:", error.stack);
      }
      // Não vamos quebrar a UI, apenas mostrar lista vazia
      setBudgetProgressList([]);
    } finally {
      setLoading(false);
    }
  };
  const onRefresh = async () => {
    setRefreshing(true);
    await loadBudgets();
    setRefreshing(false);
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return "bg-red-500";
    if (percentage >= 80) return "bg-yellow-500";
    return "bg-green-500";
  };

  const confirmDelete = (id: string) => {
    Alert.alert(
      "Excluir orçamento",
      "Tem certeza que deseja excluir este orçamento? Esta ação não pode ser desfeita.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: () => handleDelete(id),
        },
      ]
    );
  };

  const handleDelete = async (id: string) => {
    try {
      setDeletingId(id);
      await budgetDAO.delete(id);
      // Remover localmente para sensação imediata
      setBudgetProgressList((prev) => prev.filter((p) => p.budget.id !== id));
      // Recarregar para garantir consistência (gastos, etc.)
      await loadBudgets();
    } catch (error) {
      console.error("Erro ao excluir orçamento:", error);
      Alert.alert("Erro", "Não foi possível excluir o orçamento");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900">
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-600 dark:text-gray-400">Carregando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <View className="border-b border-gray-200 bg-white px-4 py-4 dark:border-gray-700 dark:bg-gray-800">
        <View className="flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-gray-900 dark:text-white">Orçamentos</Text>
          <TouchableOpacity
            className="rounded-lg bg-blue-500 px-4 py-2"
            onPress={() => router.push("/budgets/create")}
          >
            <Text className="font-medium text-white">Novo</Text>
          </TouchableOpacity>
        </View>

        <Text className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {new Date().toLocaleDateString("pt-BR", {
            month: "long",
            year: "numeric",
          })}
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Painel Consolidado de Alertas */}
        {budgetProgressList.some(
          (p) => p.percentage >= p.budget.alert_percentage || p.percentage >= 100
        ) && (
          <View className="mx-4 mt-4 rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800">
            <Text className="mb-3 text-base font-semibold text-gray-900 dark:text-white">
              Alertas de Orçamentos
            </Text>
            <View className="space-y-3">
              {budgetProgressList
                .filter((p) => p.percentage >= p.budget.alert_percentage || p.percentage >= 100)
                .sort((a, b) => b.percentage - a.percentage)
                .slice(0, 10)
                .map((p) => {
                  const exceeded = p.percentage >= 100;
                  const critical = exceeded;
                  return (
                    <TouchableOpacity
                      key={p.budget.id}
                      onPress={() => router.push(`/budgets/create?id=${p.budget.id}`)}
                      className={`rounded-lg border p-3 ${
                        critical
                          ? "border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/30"
                          : "border-yellow-300 bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-900/20"
                      }`}
                    >
                      <View className="flex-row items-center justify-between">
                        <View className="flex-1 pr-2">
                          <Text
                            className={`text-sm font-medium ${
                              critical
                                ? "text-red-700 dark:text-red-300"
                                : "text-yellow-700 dark:text-yellow-300"
                            }`}
                            numberOfLines={1}
                          >
                            {p.budget.category_id
                              ? (p.budget as any).category_name || "Categoria"
                              : p.budget.name || "Geral"}
                          </Text>
                          <Text className="text-[11px] text-gray-600 dark:text-gray-400">
                            {p.percentage.toFixed(0)}% usado • Gasto {formatCurrency(p.spent)} de{" "}
                            {formatCurrency(p.budget.amount)}
                          </Text>
                        </View>
                        <View className="flex-row items-center">
                          <Ionicons
                            name={critical ? "warning" : "alert-circle"}
                            size={16}
                            color={critical ? "#dc2626" : "#d97706"}
                          />
                          <Text
                            className={`ml-1 text-xs font-semibold ${
                              critical
                                ? "text-red-700 dark:text-red-300"
                                : "text-yellow-700 dark:text-yellow-300"
                            }`}
                          >
                            {critical ? "Excedido" : `${p.budget.alert_percentage}%+`}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
            </View>
          </View>
        )}

        {budgetProgressList.length > 0 ? (
          <View className="space-y-4 p-4">
            {budgetProgressList.map((progress) => {
              const { budget, spent, percentage, remaining } = progress;

              return (
                <TouchableOpacity
                  key={budget.id}
                  className="rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800"
                  onPress={() => router.push(`/budgets/create?id=${budget.id}`)}
                >
                  {/* Header do orçamento */}
                  <View className="mb-3 flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
                        <Ionicons name="pie-chart" size={20} className="text-blue-600" />
                      </View>
                      <View>
                        <Text className="text-base font-semibold text-gray-900 dark:text-white">
                          {budget.category_id
                            ? (budget as any).category_name || "Categoria"
                            : "Geral"}
                        </Text>
                        <Text className="text-sm text-gray-600 dark:text-gray-400">
                          {budget.period_type === "monthly" ? "Mensal" : budget.period_type}
                        </Text>
                      </View>
                    </View>

                    <View className="items-end">
                      <Text className="text-lg font-bold text-gray-900 dark:text-white">
                        {formatCurrency(budget.amount)}
                      </Text>
                      <Text className="text-sm text-gray-600 dark:text-gray-400">Orçado</Text>
                    </View>
                    <TouchableOpacity
                      className={`ml-3 rounded-md px-2 py-1 ${
                        deletingId === budget.id ? "bg-red-300" : "bg-red-500"
                      }`}
                      disabled={deletingId === budget.id}
                      onPress={() => confirmDelete(budget.id)}
                    >
                      <Text className="text-xs font-semibold text-white">
                        {deletingId === budget.id ? "Excluindo..." : "Excluir"}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Barra de progresso */}
                  <View className="mb-3">
                    <View className="mb-2 flex-row items-center justify-between">
                      <Text className="text-sm text-gray-600 dark:text-gray-400">
                        Gasto: {formatCurrency(spent)}
                      </Text>
                      <Text className="text-sm font-medium text-gray-900 dark:text-white">
                        {percentage.toFixed(0)}%
                      </Text>
                    </View>

                    <View className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                      <View
                        className={`h-2 rounded-full ${getProgressColor(percentage)}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </View>
                  </View>

                  {/* Informações adicionais */}
                  <View className="flex-row items-center justify-between">
                    <View>
                      <Text className="text-sm text-gray-600 dark:text-gray-400">
                        {remaining >= 0 ? "Restante" : "Excedente"}
                      </Text>
                      <Text
                        className={`text-sm font-semibold ${
                          remaining >= 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {remaining >= 0
                          ? formatCurrency(remaining)
                          : formatCurrency(Math.abs(remaining))}
                      </Text>
                    </View>

                    {/* Alerta de excesso */}
                    {percentage >= budget.alert_percentage && (
                      <View
                        className={`rounded-lg p-2 ${
                          percentage >= 100
                            ? "bg-red-50 dark:bg-red-900/20"
                            : "bg-yellow-50 dark:bg-yellow-900/20"
                        }`}
                      >
                        <View className="flex-row items-center">
                          <Ionicons
                            name={percentage >= 100 ? "warning" : "alert-circle"}
                            size={16}
                            className={percentage >= 100 ? "text-red-500" : "text-yellow-500"}
                          />
                          <Text
                            className={`ml-2 text-sm ${
                              percentage >= 100
                                ? "text-red-700 dark:text-red-300"
                                : "text-yellow-700 dark:text-yellow-300"
                            }`}
                          >
                            {percentage >= 100
                              ? "Excedido!"
                              : `${budget.alert_percentage}% atingido`}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View className="flex-1 items-center justify-center p-8">
            <Ionicons name="pie-chart-outline" size={64} className="mb-4 text-gray-400" />
            <Text className="mb-2 text-lg font-medium text-gray-600 dark:text-gray-400">
              Nenhum orçamento criado
            </Text>
            <Text className="mb-6 text-center text-gray-500 dark:text-gray-400">
              Crie seu primeiro orçamento para controlar seus gastos mensais
            </Text>
            <TouchableOpacity
              className="rounded-lg bg-blue-500 px-6 py-3"
              onPress={() => router.push("/budgets/create")}
            >
              <Text className="font-semibold text-white">Criar Orçamento</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
