import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { useRouter, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { AccountDAO, TransactionDAO } from "../../src/lib/database";
import { formatCurrency } from "../../src/lib/utils";
import type { Account, BalanceSummary } from "../../src/types/entities";

export default function DashboardScreen() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [balanceSummary, setBalanceSummary] = useState<BalanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const accountDAO = AccountDAO.getInstance();
  const transactionDAO = TransactionDAO.getInstance();

  useEffect(() => {
    loadDashboardData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Carregar contas
      const accountsData = await accountDAO.findAll();
      setAccounts(accountsData);

      // Calcular resumo de saldos
      const { total } = await accountDAO.getBalanceSummary();

      // Buscar transações do mês atual
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const endOfMonth = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23,
        59,
        59
      ).toISOString();

      const incomeTransactions = await transactionDAO.findAll({
        transaction_types: ["income"],
        date_from: startOfMonth,
        date_to: endOfMonth,
        is_pending: false,
      });

      const expenseTransactions = await transactionDAO.findAll({
        transaction_types: ["expense"],
        date_from: startOfMonth,
        date_to: endOfMonth,
        is_pending: false,
      });

      const totalIncome = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
      const totalExpenses = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);

      setBalanceSummary({
        total_balance: total,
        total_income: totalIncome,
        total_expenses: totalExpenses,
        period_start: startOfMonth,
        period_end: endOfMonth,
      });
    } catch (error) {
      console.error("Erro ao carregar dados do dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white dark:bg-gray-900">
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-600 dark:text-gray-400">Carregando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900">
      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View className="border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-700 dark:bg-gray-800">
          <Text className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</Text>
          <Text className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {new Date().toLocaleDateString("pt-BR", {
              month: "long",
              year: "numeric",
            })}
          </Text>
        </View>

        {/* Saldo Total */}
        {balanceSummary && (
          <View className="mx-4 mt-4 rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                Saldo Total
              </Text>
              <Ionicons name="wallet" size={24} className="text-blue-500" />
            </View>

            <Text className="mb-4 text-3xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(balanceSummary.total_balance)}
            </Text>

            <View className="flex-row justify-between">
              <View className="flex-1">
                <Text className="text-sm text-gray-600 dark:text-gray-400">Receitas</Text>
                <Text className="text-lg font-semibold text-green-600">
                  {formatCurrency(balanceSummary.total_income)}
                </Text>
              </View>

              <View className="flex-1">
                <Text className="text-sm text-gray-600 dark:text-gray-400">Despesas</Text>
                <Text className="text-lg font-semibold text-red-600">
                  {formatCurrency(balanceSummary.total_expenses)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Contas */}
        <View className="mx-4 mt-6">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-lg font-semibold text-gray-900 dark:text-white">
              Minhas Contas
            </Text>
            <TouchableOpacity onPress={() => router.push("/accounts")}>
              <Text className="font-medium text-blue-500">Ver todas</Text>
            </TouchableOpacity>
          </View>

          {accounts.length > 0 ? (
            <View className="space-y-3">
              {accounts.slice(0, 4).map((account) => (
                <View
                  key={account.id}
                  className="rounded-lg bg-white p-4 shadow-sm dark:bg-gray-800"
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1 flex-row items-center">
                      <View
                        className="mr-3 h-10 w-10 items-center justify-center rounded-full"
                        style={{ backgroundColor: account.color }}
                      >
                        <Ionicons name={account.icon as any} size={20} color="white" />
                      </View>

                      <View className="flex-1">
                        <Text className="text-base font-medium text-gray-900 dark:text-white">
                          {account.name}
                        </Text>
                        <Text className="text-sm capitalize text-gray-600 dark:text-gray-400">
                          {account.type.replace("_", " ")}
                        </Text>
                      </View>
                    </View>

                    <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(account.current_balance)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View className="items-center rounded-lg bg-white p-8 dark:bg-gray-800">
              <Ionicons name="wallet-outline" size={48} className="mb-4 text-gray-400" />
              <Text className="text-center text-gray-600 dark:text-gray-400">
                Nenhuma conta encontrada.{"\n"}
                Adicione sua primeira conta para começar.
              </Text>
              <TouchableOpacity
                onPress={() => router.push("/accounts/create")}
                className="mt-4 rounded-lg bg-blue-500 px-6 py-3"
              >
                <Text className="font-semibold text-white">Adicionar Conta</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Ações Rápidas */}
        <View className="mx-4 mb-6 mt-6">
          <Text className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Ações Rápidas
          </Text>

          <View className="flex-row justify-between">
            <TouchableOpacity
              className="mr-2 flex-1 items-center rounded-lg bg-green-500 p-4"
              onPress={() => router.push("/transactions/create?type=income")}
            >
              <Ionicons name="add" size={24} color="white" />
              <Text className="mt-2 font-medium text-white">Receita</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="mx-2 flex-1 items-center rounded-lg bg-red-500 p-4"
              onPress={() => router.push("/transactions/create?type=expense")}
            >
              <Ionicons name="remove" size={24} color="white" />
              <Text className="mt-2 font-medium text-white">Despesa</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="ml-2 flex-1 items-center rounded-lg bg-blue-500 p-4"
              onPress={() => router.push("/transactions/create?type=transfer")}
            >
              <Ionicons name="swap-horizontal" size={24} color="white" />
              <Text className="mt-2 font-medium text-white">Transferir</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
