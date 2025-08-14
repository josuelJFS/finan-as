import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useState, useEffect } from "react";
import { formatCurrency } from "../../src/lib/utils";

interface Budget {
  id: string;
  category: string;
  amount: number;
  spent: number;
  period: string;
}

export default function BudgetsScreen() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simular carregamento de orçamentos
    setTimeout(() => {
      setBudgets([
        {
          id: "1",
          category: "Alimentação",
          amount: 800,
          spent: 320,
          period: "Mensal",
        },
        {
          id: "2",
          category: "Transporte",
          amount: 400,
          spent: 380,
          period: "Mensal",
        },
        {
          id: "3",
          category: "Entretenimento",
          amount: 300,
          spent: 120,
          period: "Mensal",
        },
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  const getProgressColor = (spent: number, amount: number) => {
    const percentage = (spent / amount) * 100;
    if (percentage >= 100) return "bg-red-500";
    if (percentage >= 80) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getProgressPercentage = (spent: number, amount: number) => {
    return Math.min((spent / amount) * 100, 100);
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900">
        <View className="flex-1 justify-center items-center">
          <Text className="text-gray-600 dark:text-gray-400">Carregando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <View className="bg-white dark:bg-gray-800 px-4 py-4 border-b border-gray-200 dark:border-gray-700">
        <View className="flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-gray-900 dark:text-white">
            Orçamentos
          </Text>
          <TouchableOpacity className="bg-blue-500 rounded-lg px-4 py-2">
            <Text className="text-white font-medium">Novo</Text>
          </TouchableOpacity>
        </View>

        <Text className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {new Date().toLocaleDateString("pt-BR", {
            month: "long",
            year: "numeric",
          })}
        </Text>
      </View>

      <ScrollView className="flex-1">
        {budgets.length > 0 ? (
          <View className="p-4 space-y-4">
            {budgets.map((budget) => {
              const percentage = getProgressPercentage(budget.spent, budget.amount);
              const remaining = budget.amount - budget.spent;

              return (
                <TouchableOpacity
                  key={budget.id}
                  className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm"
                >
                  {/* Header do orçamento */}
                  <View className="flex-row items-center justify-between mb-3">
                    <View className="flex-row items-center">
                      <View className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full items-center justify-center mr-3">
                        <Ionicons name="pie-chart" size={20} className="text-blue-600" />
                      </View>
                      <View>
                        <Text className="text-base font-semibold text-gray-900 dark:text-white">
                          {budget.category}
                        </Text>
                        <Text className="text-sm text-gray-600 dark:text-gray-400">
                          {budget.period}
                        </Text>
                      </View>
                    </View>

                    <View className="items-end">
                      <Text className="text-lg font-bold text-gray-900 dark:text-white">
                        {formatCurrency(budget.amount)}
                      </Text>
                      <Text className="text-sm text-gray-600 dark:text-gray-400">
                        Orçado
                      </Text>
                    </View>
                  </View>

                  {/* Barra de progresso */}
                  <View className="mb-3">
                    <View className="flex-row justify-between items-center mb-2">
                      <Text className="text-sm text-gray-600 dark:text-gray-400">
                        Gasto: {formatCurrency(budget.spent)}
                      </Text>
                      <Text className="text-sm font-medium text-gray-900 dark:text-white">
                        {percentage.toFixed(0)}%
                      </Text>
                    </View>

                    <View className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                      <View
                        className={`h-2 rounded-full ${getProgressColor(budget.spent, budget.amount)}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </View>
                  </View>

                  {/* Informações adicionais */}
                  <View className="flex-row justify-between items-center">
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
                  {percentage >= 80 && (
                    <View
                      className={`mt-3 p-2 rounded-lg ${
                        percentage >= 100
                          ? "bg-red-50 dark:bg-red-900/20"
                          : "bg-yellow-50 dark:bg-yellow-900/20"
                      }`}
                    >
                      <View className="flex-row items-center">
                        <Ionicons
                          name={percentage >= 100 ? "warning" : "alert-circle"}
                          size={16}
                          className={
                            percentage >= 100 ? "text-red-500" : "text-yellow-500"
                          }
                        />
                        <Text
                          className={`text-sm ml-2 ${
                            percentage >= 100
                              ? "text-red-700 dark:text-red-300"
                              : "text-yellow-700 dark:text-yellow-300"
                          }`}
                        >
                          {percentage >= 100
                            ? "Orçamento excedido!"
                            : "Atenção: 80% do orçamento utilizado"}
                        </Text>
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View className="flex-1 justify-center items-center p-8">
            <Ionicons name="pie-chart-outline" size={64} className="text-gray-400 mb-4" />
            <Text className="text-lg font-medium text-gray-600 dark:text-gray-400 mb-2">
              Nenhum orçamento criado
            </Text>
            <Text className="text-gray-500 dark:text-gray-400 text-center mb-6">
              Crie seu primeiro orçamento para controlar seus gastos mensais
            </Text>
            <TouchableOpacity className="bg-blue-500 rounded-lg px-6 py-3">
              <Text className="text-white font-semibold">Criar Orçamento</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
