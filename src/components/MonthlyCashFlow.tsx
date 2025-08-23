import React, { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { formatCurrency } from "../lib/utils";
import { TransactionDAO } from "../lib/database/TransactionDAO";
import { BudgetDAO, BudgetProgress } from "../lib/database/BudgetDAO";
import type { Transaction } from "../types/entities";

interface MonthlyFlowData {
  month: string;
  totalIncome: number;
  totalExpenses: number;
  fixedExpenses: number;
  variableExpenses: number;
  remaining: number;
  budgetStatus: {
    totalBudget: number;
    spent: number;
    overBudget: boolean;
  };
  topCategories: Array<{
    name: string;
    amount: number;
    isOverBudget: boolean;
  }>;
}

export const MonthlyCashFlow: React.FC = () => {
  const [data, setData] = useState<MonthlyFlowData | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [loading, setLoading] = useState(true);

  const loadMonthlyData = useCallback(async () => {
    setLoading(true);
    try {
      const year = parseInt(selectedMonth.split("-")[0]);
      const month = parseInt(selectedMonth.split("-")[1]);

      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      // Buscar transações do mês usando filtros
      const transactionDAO = TransactionDAO.getInstance();
      const transactions = await transactionDAO.findAll({
        date_from: startDate.toISOString().split("T")[0],
        date_to: endDate.toISOString().split("T")[0],
      });

      // Calcular receitas e despesas
      const income = transactions
        .filter((t: Transaction) => t.type === "income")
        .reduce((sum: number, t: Transaction) => sum + t.amount, 0);

      const expenses = transactions
        .filter((t: Transaction) => t.type === "expense")
        .reduce((sum: number, t: Transaction) => sum + t.amount, 0);

      // Separar despesas fixas vs variáveis (baseado em recorrência)
      const fixedExpenses = transactions
        .filter((t: Transaction) => t.type === "expense" && t.recurrence_id)
        .reduce((sum: number, t: Transaction) => sum + t.amount, 0);

      const variableExpenses = expenses - fixedExpenses;

      // Buscar orçamentos do mês
      const budgetDAO = BudgetDAO.getInstance();
      const budgets = await budgetDAO.getActiveBudgetsProgressOptimized();

      const totalBudget = budgets.reduce(
        (sum: number, b: BudgetProgress) => sum + b.budget.amount,
        0
      );
      const totalSpent = budgets.reduce((sum: number, b: BudgetProgress) => sum + b.spent, 0);

      // Top categorias com alertas
      const topCategories = budgets
        .sort((a: BudgetProgress, b: BudgetProgress) => b.spent - a.spent)
        .slice(0, 5)
        .map((b: BudgetProgress) => ({
          name: (b.budget as any).category_name || "Sem categoria",
          amount: b.spent,
          isOverBudget: b.spent > b.budget.amount,
        }));

      setData({
        month: selectedMonth,
        totalIncome: income,
        totalExpenses: expenses,
        fixedExpenses,
        variableExpenses,
        remaining: income - expenses,
        budgetStatus: {
          totalBudget,
          spent: totalSpent,
          overBudget: totalSpent > totalBudget,
        },
        topCategories,
      });
    } catch (error) {
      console.error("Erro ao carregar dados do fluxo mensal:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    loadMonthlyData();
  }, [loadMonthlyData]);

  const getMonthName = (monthStr: string) => {
    const [year, month] = monthStr.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Text className="text-gray-600 dark:text-gray-400">Carregando fluxo de caixa...</Text>
      </View>
    );
  }

  if (!data) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Text className="text-gray-600 dark:text-gray-400">Erro ao carregar dados</Text>
      </View>
    );
  }

  const remainingColor =
    data.remaining >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400";

  return (
    <ScrollView className="flex-1 bg-gray-50 p-4 dark:bg-gray-900">
      {/* Seletor de Mês */}
      <View className="mb-4 rounded-xl bg-white p-4 dark:bg-gray-800">
        <Text className="mb-2 text-lg font-bold text-gray-900 dark:text-white">Fluxo de Caixa</Text>
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => {
              const current = new Date(selectedMonth + "-01");
              current.setMonth(current.getMonth() - 1);
              setSelectedMonth(current.toISOString().slice(0, 7));
            }}
            className="p-2"
          >
            <MaterialIcons name="chevron-left" size={24} color="#6B7280" />
          </TouchableOpacity>

          <Text className="text-lg font-semibold capitalize text-gray-900 dark:text-white">
            {getMonthName(selectedMonth)}
          </Text>

          <TouchableOpacity
            onPress={() => {
              const current = new Date(selectedMonth + "-01");
              current.setMonth(current.getMonth() + 1);
              setSelectedMonth(current.toISOString().slice(0, 7));
            }}
            className="p-2"
          >
            <MaterialIcons name="chevron-right" size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Resumo Geral */}
      <View className="mb-4 rounded-xl bg-white p-4 dark:bg-gray-800">
        <Text className="mb-3 text-base font-bold text-gray-900 dark:text-white">
          Resumo do Mês
        </Text>

        <View className="space-y-3">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <MaterialIcons name="trending-up" size={20} color="#10B981" />
              <Text className="ml-2 text-gray-700 dark:text-gray-300">Receitas</Text>
            </View>
            <Text className="font-semibold text-green-600 dark:text-green-400">
              {formatCurrency(data.totalIncome)}
            </Text>
          </View>

          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <MaterialIcons name="trending-down" size={20} color="#EF4444" />
              <Text className="ml-2 text-gray-700 dark:text-gray-300">Despesas Totais</Text>
            </View>
            <Text className="font-semibold text-red-600 dark:text-red-400">
              {formatCurrency(data.totalExpenses)}
            </Text>
          </View>

          <View className="h-px bg-gray-200 dark:bg-gray-700" />

          <View className="flex-row items-center justify-between">
            <Text className="font-bold text-gray-900 dark:text-white">Saldo do Mês</Text>
            <Text className={`text-lg font-bold ${remainingColor}`}>
              {formatCurrency(data.remaining)}
            </Text>
          </View>
        </View>
      </View>

      {/* Breakdown de Despesas */}
      <View className="mb-4 rounded-xl bg-white p-4 dark:bg-gray-800">
        <Text className="mb-3 text-base font-bold text-gray-900 dark:text-white">
          Detalhamento de Gastos
        </Text>

        <View className="space-y-3">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <MaterialIcons name="repeat" size={20} color="#F59E0B" />
              <Text className="ml-2 text-gray-700 dark:text-gray-300">Despesas Fixas</Text>
            </View>
            <Text className="font-semibold text-amber-600 dark:text-amber-400">
              {formatCurrency(data.fixedExpenses)}
            </Text>
          </View>

          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <MaterialIcons name="shopping-cart" size={20} color="#8B5CF6" />
              <Text className="ml-2 text-gray-700 dark:text-gray-300">Despesas Variáveis</Text>
            </View>
            <Text className="font-semibold text-purple-600 dark:text-purple-400">
              {formatCurrency(data.variableExpenses)}
            </Text>
          </View>
        </View>
      </View>

      {/* Status do Orçamento */}
      <View className="mb-4 rounded-xl bg-white p-4 dark:bg-gray-800">
        <View className="mb-3 flex-row items-center justify-between">
          <Text className="text-base font-bold text-gray-900 dark:text-white">
            Controle de Orçamento
          </Text>
          {data.budgetStatus.overBudget && (
            <View className="rounded-full bg-red-100 px-2 py-1 dark:bg-red-900/30">
              <Text className="text-xs font-medium text-red-600 dark:text-red-400">
                Acima do orçamento
              </Text>
            </View>
          )}
        </View>

        <View className="space-y-2">
          <View className="flex-row justify-between">
            <Text className="text-gray-600 dark:text-gray-400">Orçado:</Text>
            <Text className="font-medium text-gray-900 dark:text-white">
              {formatCurrency(data.budgetStatus.totalBudget)}
            </Text>
          </View>

          <View className="flex-row justify-between">
            <Text className="text-gray-600 dark:text-gray-400">Gasto:</Text>
            <Text
              className={`font-medium ${
                data.budgetStatus.overBudget
                  ? "text-red-600 dark:text-red-400"
                  : "text-gray-900 dark:text-white"
              }`}
            >
              {formatCurrency(data.budgetStatus.spent)}
            </Text>
          </View>

          {/* Barra de Progresso */}
          <View className="mt-2">
            <View className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
              <View
                className={`h-full rounded-full ${
                  data.budgetStatus.overBudget ? "bg-red-500" : "bg-blue-500"
                }`}
                style={{
                  width: `${Math.min(
                    (data.budgetStatus.spent / data.budgetStatus.totalBudget) * 100,
                    100
                  )}%`,
                }}
              />
            </View>
            <Text className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {((data.budgetStatus.spent / data.budgetStatus.totalBudget) * 100).toFixed(1)}% usado
            </Text>
          </View>
        </View>
      </View>

      {/* Top Categorias */}
      <View className="mb-4 rounded-xl bg-white p-4 dark:bg-gray-800">
        <Text className="mb-3 text-base font-bold text-gray-900 dark:text-white">
          Maiores Gastos por Categoria
        </Text>

        {data.topCategories.map((category, index) => (
          <View key={index} className="flex-row items-center justify-between py-2">
            <View className="flex-1 flex-row items-center">
              <Text className="flex-1 text-gray-700 dark:text-gray-300">{category.name}</Text>
              {category.isOverBudget && <MaterialIcons name="warning" size={16} color="#EF4444" />}
            </View>
            <Text
              className={`ml-2 font-medium ${
                category.isOverBudget
                  ? "text-red-600 dark:text-red-400"
                  : "text-gray-900 dark:text-white"
              }`}
            >
              {formatCurrency(category.amount)}
            </Text>
          </View>
        ))}
      </View>

      {/* Dicas */}
      {data.remaining < 0 && (
        <View className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <View className="mb-2 flex-row items-center">
            <MaterialIcons name="warning" size={20} color="#EF4444" />
            <Text className="ml-2 font-medium text-red-800 dark:text-red-300">
              Atenção: Saldo Negativo
            </Text>
          </View>
          <Text className="text-sm text-red-700 dark:text-red-400">
            Você gastou R$ {formatCurrency(Math.abs(data.remaining))} a mais que suas receitas este
            mês. Considere revisar seus gastos ou ajustar orçamentos.
          </Text>
        </View>
      )}
    </ScrollView>
  );
};
