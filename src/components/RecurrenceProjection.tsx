import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import PagerView from "react-native-pager-view";
import { formatCurrency } from "../lib/utils";
import { RecurrenceDAO } from "../lib/database/RecurrenceDAO";
import { TransactionDAO } from "../lib/database/TransactionDAO";
import { AccountDAO } from "../lib/database/AccountDAO";
import { CategoryDAO } from "../lib/database/CategoryDAO";
import { Events } from "../lib/events";
import type { Recurrence, Account, Category } from "../types/entities";

const { width } = Dimensions.get("window");

interface MonthProjection {
  month: string; // YYYY-MM
  year: number;
  monthIndex: number; // 0-11
  monthName: string;
  totalIncome: number;
  totalExpenses: number;
  netFlow: number;
  status: "positive" | "negative" | "neutral";
  recurrences: {
    income: RecurrenceWithDetails[];
    expenses: RecurrenceWithDetails[];
  };
}

interface RecurrenceWithDetails extends Recurrence {
  account_name: string;
  category_name?: string;
  projected_amount: number; // Valor para o mês específico
}

const RecurrenceProjectionComponent: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [projections, setProjections] = useState<MonthProjection[]>([]);
  const [currentMonthIndex, setCurrentMonthIndex] = useState(0);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Gerar próximos 12 meses a partir de hoje
  const generateMonthsRange = (): string[] => {
    const months: string[] = [];
    const today = new Date();

    for (let i = 0; i < 12; i++) {
      const targetDate = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const monthStr = `${targetDate.getFullYear()}-${(targetDate.getMonth() + 1).toString().padStart(2, "0")}`;
      months.push(monthStr);
    }

    return months;
  };

  // Calcular se uma recorrência tem ocorrência em um mês específico
  const hasOccurrenceInMonth = (recurrence: Recurrence, targetMonth: string): boolean => {
    const [year, month] = targetMonth.split("-").map(Number);
    const targetDate = new Date(year, month - 1, 1);
    const startDate = new Date(recurrence.start_date);
    const endDate = recurrence.end_date ? new Date(recurrence.end_date) : null;

    // Verificar se o mês está no range da recorrência
    if (targetDate < new Date(startDate.getFullYear(), startDate.getMonth(), 1)) {
      return false;
    }

    if (endDate && targetDate > new Date(endDate.getFullYear(), endDate.getMonth(), 1)) {
      return false;
    }

    // Para simplicidade, considerar que todas as recorrências mensais ativas têm ocorrência
    // TODO: Implementar lógica mais precisa para frequências específicas
    return (
      recurrence.frequency === "monthly" ||
      recurrence.frequency === "weekly" ||
      recurrence.frequency === "daily"
    );
  };

  const loadProjections = useCallback(async () => {
    setLoading(true);

    try {
      const recurrenceDAO = RecurrenceDAO.getInstance();
      const accountDAO = AccountDAO.getInstance();
      const categoryDAO = CategoryDAO.getInstance();

      // Carregar dados base
      const [allRecurrences, allAccounts, allCategories] = await Promise.all([
        recurrenceDAO.listAll(),
        accountDAO.findAll(),
        categoryDAO.findAll(),
      ]);

      setAccounts(allAccounts);
      setCategories(allCategories);

      // Filtrar apenas recorrências ativas
      const activeRecurrences = allRecurrences.filter((rec) => rec.is_active);

      // Gerar projeções para os próximos 12 meses
      const months = generateMonthsRange();
      const monthProjections: MonthProjection[] = [];

      for (const month of months) {
        const [year, monthNum] = month.split("-").map(Number);
        const monthDate = new Date(year, monthNum - 1, 1);
        const monthName = monthDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

        let totalIncome = 0;
        let totalExpenses = 0;
        const incomeRecurrences: RecurrenceWithDetails[] = [];
        const expenseRecurrences: RecurrenceWithDetails[] = [];

        for (const recurrence of activeRecurrences) {
          if (hasOccurrenceInMonth(recurrence, month)) {
            const account = allAccounts.find((acc) => acc.id === recurrence.account_id);
            const category = recurrence.category_id
              ? allCategories.find((cat) => cat.id === recurrence.category_id)
              : undefined;

            const recurrenceWithDetails: RecurrenceWithDetails = {
              ...recurrence,
              account_name: account?.name || "Conta não encontrada",
              category_name: category?.name,
              projected_amount: recurrence.amount,
            };

            if (recurrence.type === "income") {
              totalIncome += recurrence.amount;
              incomeRecurrences.push(recurrenceWithDetails);
            } else if (recurrence.type === "expense") {
              totalExpenses += recurrence.amount;
              expenseRecurrences.push(recurrenceWithDetails);
            }
          }
        }

        const netFlow = totalIncome - totalExpenses;
        const status: "positive" | "negative" | "neutral" =
          netFlow > 0 ? "positive" : netFlow < 0 ? "negative" : "neutral";

        monthProjections.push({
          month,
          year,
          monthIndex: monthNum - 1,
          monthName,
          totalIncome,
          totalExpenses,
          netFlow,
          status,
          recurrences: {
            income: incomeRecurrences,
            expenses: expenseRecurrences,
          },
        });
      }

      setProjections(monthProjections);
    } catch (error) {
      console.error("Erro ao carregar projeções:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjections();
  }, [loadProjections]);

  useEffect(() => {
    const unsubscribe = Events.on("transactions:changed", loadProjections);
    return unsubscribe;
  }, [loadProjections]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "positive":
        return "text-green-600 dark:text-green-400";
      case "negative":
        return "text-red-600 dark:text-red-400";
      default:
        return "text-gray-600 dark:text-gray-400";
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case "positive":
        return "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800";
      case "negative":
        return "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800";
      default:
        return "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700";
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50 dark:bg-gray-900">
        {/* Header skeleton */}
        <View className="border-b border-gray-200 bg-white px-4 py-6 dark:border-gray-700 dark:bg-gray-800">
          <View className="mb-4 h-8 w-3/4 rounded-lg bg-gray-200 dark:bg-gray-700" />
          <View className="h-4 w-1/2 rounded bg-gray-200 dark:bg-gray-700" />
        </View>

        {/* Content skeleton */}
        <View className="flex-1 items-center justify-center">
          <View className="items-center rounded-2xl bg-white p-6 shadow-lg dark:bg-gray-800">
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text className="mt-3 font-medium text-gray-600 dark:text-gray-400">
              Calculando projeções das recorrências...
            </Text>
          </View>
        </View>
      </View>
    );
  }

  if (projections.length === 0) {
    return (
      <View className="flex-1 bg-gray-50 dark:bg-gray-900">
        <View className="border-b border-gray-200 bg-white px-4 py-6 dark:border-gray-700 dark:bg-gray-800">
          <Text className="text-xl font-bold text-gray-900 dark:text-white">
            📅 Projeção de Recorrências
          </Text>
          <Text className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Visualize seus gastos e receitas recorrentes mês a mês
          </Text>
        </View>

        <View className="flex-1 items-center justify-center px-8">
          <MaterialIcons name="event-repeat" size={64} color="#9CA3AF" />
          <Text className="mt-4 text-xl font-bold text-gray-700 dark:text-gray-300">
            Nenhuma recorrência ativa
          </Text>
          <Text className="mt-2 text-center text-gray-500 dark:text-gray-400">
            Crie recorrências para salários, gastos fixos e outras transações que se repetem
            mensalmente
          </Text>
          <TouchableOpacity
            className="mt-6 rounded-xl bg-blue-600 px-6 py-3"
            onPress={() => {
              /* TODO: Navegar para criação de recorrência */
            }}
            activeOpacity={0.8}
          >
            <Text className="font-bold text-white">Criar Primeira Recorrência</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const currentProjection = projections[currentMonthIndex];

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <View className="border-b border-gray-200 bg-white px-4 py-6 dark:border-gray-700 dark:bg-gray-800">
        <Text className="text-xl font-bold text-gray-900 dark:text-white">
          📅 Projeção de Recorrências
        </Text>
        <Text className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Deslize para navegar pelos meses
        </Text>
      </View>

      {/* Navigation dots */}
      <View className="border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ alignItems: "center" }}
        >
          {projections.map((projection, index) => (
            <TouchableOpacity
              key={projection.month}
              onPress={() => setCurrentMonthIndex(index)}
              className={`mx-2 rounded-lg px-3 py-2 ${
                index === currentMonthIndex ? "bg-blue-600" : "bg-gray-100 dark:bg-gray-700"
              }`}
            >
              <Text
                className={`text-xs font-medium ${
                  index === currentMonthIndex ? "text-white" : "text-gray-600 dark:text-gray-300"
                }`}
              >
                {projection.month.split("-")[1]}/{projection.month.split("-")[0].slice(2)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Pager View */}
      <PagerView
        style={{ flex: 1 }}
        initialPage={0}
        onPageSelected={(e: any) => setCurrentMonthIndex(e.nativeEvent.position)}
      >
        {projections.map((projection, index) => (
          <View key={projection.month} className="flex-1 p-4">
            {/* Month Header Card */}
            <View
              className={`mb-4 rounded-2xl border-2 p-6 ${getStatusBgColor(projection.status)}`}
            >
              <Text className="text-center text-2xl font-bold text-gray-900 dark:text-white">
                {projection.monthName}
              </Text>

              <View className="mt-4 space-y-3">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <MaterialIcons name="trending-up" size={20} color="#10B981" />
                    <Text className="ml-2 text-gray-600 dark:text-gray-400">Receitas</Text>
                  </View>
                  <Text className="text-lg font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(projection.totalIncome)}
                  </Text>
                </View>

                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <MaterialIcons name="trending-down" size={20} color="#EF4444" />
                    <Text className="ml-2 text-gray-600 dark:text-gray-400">Despesas</Text>
                  </View>
                  <Text className="text-lg font-bold text-red-600 dark:text-red-400">
                    -{formatCurrency(projection.totalExpenses)}
                  </Text>
                </View>

                <View className="border-t border-gray-200 pt-3 dark:border-gray-700">
                  <View className="flex-row items-center justify-between">
                    <Text className="font-bold text-gray-900 dark:text-white">Saldo Projetado</Text>
                    <Text className={`text-xl font-bold ${getStatusColor(projection.status)}`}>
                      {formatCurrency(projection.netFlow)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Recurrences Details */}
            <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
              {/* Receitas */}
              {projection.recurrences.income.length > 0 && (
                <View className="mb-6">
                  <View className="mb-3 flex-row items-center">
                    <MaterialIcons name="trending-up" size={20} color="#10B981" />
                    <Text className="ml-2 text-lg font-bold text-gray-900 dark:text-white">
                      Receitas Recorrentes
                    </Text>
                  </View>

                  {projection.recurrences.income.map((recurrence, idx) => (
                    <View
                      key={`income-${idx}`}
                      className="mb-2 rounded-xl border border-green-200 bg-white p-4 dark:border-green-800 dark:bg-gray-800"
                    >
                      <View className="flex-row items-start justify-between">
                        <View className="flex-1">
                          <Text className="font-semibold text-gray-900 dark:text-white">
                            {recurrence.name}
                          </Text>
                          <Text className="text-sm text-gray-600 dark:text-gray-400">
                            {recurrence.account_name}
                            {recurrence.category_name && ` • ${recurrence.category_name}`}
                          </Text>
                          <Text className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                            {recurrence.frequency === "monthly"
                              ? "Mensal"
                              : recurrence.frequency === "weekly"
                                ? "Semanal"
                                : recurrence.frequency === "daily"
                                  ? "Diário"
                                  : "Personalizado"}
                          </Text>
                        </View>
                        <Text className="font-bold text-green-600 dark:text-green-400">
                          {formatCurrency(recurrence.projected_amount)}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Despesas */}
              {projection.recurrences.expenses.length > 0 && (
                <View className="mb-6">
                  <View className="mb-3 flex-row items-center">
                    <MaterialIcons name="trending-down" size={20} color="#EF4444" />
                    <Text className="ml-2 text-lg font-bold text-gray-900 dark:text-white">
                      Despesas Recorrentes
                    </Text>
                  </View>

                  {projection.recurrences.expenses.map((recurrence, idx) => (
                    <View
                      key={`expense-${idx}`}
                      className="mb-2 rounded-xl border border-red-200 bg-white p-4 dark:border-red-800 dark:bg-gray-800"
                    >
                      <View className="flex-row items-start justify-between">
                        <View className="flex-1">
                          <Text className="font-semibold text-gray-900 dark:text-white">
                            {recurrence.name}
                          </Text>
                          <Text className="text-sm text-gray-600 dark:text-gray-400">
                            {recurrence.account_name}
                            {recurrence.category_name && ` • ${recurrence.category_name}`}
                          </Text>
                          <Text className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                            {recurrence.frequency === "monthly"
                              ? "Mensal"
                              : recurrence.frequency === "weekly"
                                ? "Semanal"
                                : recurrence.frequency === "daily"
                                  ? "Diário"
                                  : "Personalizado"}
                          </Text>
                        </View>
                        <Text className="font-bold text-red-600 dark:text-red-400">
                          -{formatCurrency(recurrence.projected_amount)}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Empty state para o mês */}
              {projection.recurrences.income.length === 0 &&
                projection.recurrences.expenses.length === 0 && (
                  <View className="items-center py-8">
                    <MaterialIcons name="event-available" size={48} color="#9CA3AF" />
                    <Text className="mt-2 text-center text-gray-500 dark:text-gray-400">
                      Nenhuma recorrência ativa para este mês
                    </Text>
                  </View>
                )}
            </ScrollView>
          </View>
        ))}
      </PagerView>
    </View>
  );
};

export default RecurrenceProjectionComponent;
