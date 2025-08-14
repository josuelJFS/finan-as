import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { useRouter, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { AccountDAO, TransactionDAO, BudgetDAO } from "../../src/lib/database";
import { MonthlyTrendsChart } from "../../src/components";
import { Events } from "../../src/lib/events";
import { formatCurrency } from "../../src/lib/utils";
import type { Account, BalanceSummary } from "../../src/types/entities";
import { useAppStore } from "../../src/lib/store";

// Resumo simples de tendência (regressão linear) textual para MVP
function TrendLineSummary({ data, range }: { data: any[]; range: number }) {
  try {
    if (!data || data.length === 0) return null;
    const sliced = data.slice(-range);
    if (sliced.length < 2) return null;
    // Usar saldo líquido (receita - despesa) como métrica
    const points = sliced.map((m: any, i: number) => ({
      x: i,
      y: (m.total_income || 0) - (m.total_expense || 0),
    }));
    const n = points.length;
    const sumX = points.reduce((s, p) => s + p.x, 0);
    const sumY = points.reduce((s, p) => s + p.y, 0);
    const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
    const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0);
    const denom = n * sumX2 - sumX * sumX;
    if (denom === 0) return null;
    const slope = (n * sumXY - sumX * sumY) / denom; // tendência mensal média
    const avg = sumY / n;
    const slopePct = avg !== 0 ? (slope / Math.abs(avg)) * 100 : 0;
    const direction = slope > 0 ? "alta" : slope < 0 ? "queda" : "estável";
    return (
      <View className="mt-3 rounded-md bg-white p-3 dark:bg-gray-800">
        <Text className="text-xs text-gray-600 dark:text-gray-400">
          Tendência ({range}m): {direction} {Math.abs(slope).toFixed(0)} / mês (
          {slopePct.toFixed(1)}%)
        </Text>
      </View>
    );
  } catch (e) {
    return null;
  }
}

export default function DashboardScreen() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [balanceSummary, setBalanceSummary] = useState<BalanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [budgetAlerts, setBudgetAlerts] = useState<
    { id: string; name: string; percentage: number; remaining: number }[]
  >([]);
  const [monthlyTrends, setMonthlyTrends] = useState<any[]>([]);

  const accountDAO = AccountDAO.getInstance();
  const transactionDAO = TransactionDAO.getInstance();
  const budgetDAO = BudgetDAO.getInstance();
  const lastUsedFilters = useAppStore((s) => s.lastUsedFilters);
  const filtersActive = !!(
    lastUsedFilters &&
    (lastUsedFilters.account_ids?.length ||
      lastUsedFilters.transaction_types?.length ||
      lastUsedFilters.category_ids?.length ||
      lastUsedFilters.date_from ||
      lastUsedFilters.date_to)
  );

  const [trendRange, setTrendRange] = useState<6 | 12>(6);
  useEffect(() => {
    loadDashboardData();
    const off1 = Events.on("accounts:balancesChanged", () => {
      // Atualiza saldos e contas rapidamente
      loadDashboardData();
    });
    const off2 = Events.on("transactions:changed", () => {
      loadDashboardData();
    });
    return () => {
      off1();
      off2();
    };
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

      // Aplicar período dos filtros ou mês atual
      let date_from: string;
      let date_to: string;
      if (lastUsedFilters?.date_from && lastUsedFilters?.date_to) {
        date_from = lastUsedFilters.date_from;
        date_to = lastUsedFilters.date_to;
      } else {
        const now = new Date();
        date_from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        date_to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
      }

      const baseFilter = {
        date_from,
        date_to,
        is_pending: false,
        account_ids: lastUsedFilters?.account_ids,
      } as any;

      const incomeTransactions = await transactionDAO.findAll({
        ...baseFilter,
        transaction_types: ["income"],
      });

      const expenseTransactions = await transactionDAO.findAll({
        ...baseFilter,
        transaction_types: ["expense"],
      });

      const totalIncome = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
      const totalExpenses = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);

      // Tendências mensais (últimos 12 meses) para gráfico
      try {
        const trends = await transactionDAO.getMonthlyTrends(12);
        setMonthlyTrends(trends);
      } catch (e) {
        console.warn("Falha ao carregar tendências mensais", e);
      }

      // Orçamentos em alerta (top 3 por %)
      try {
        const alerts = await budgetDAO.getBudgetsWithAlerts();
        setBudgetAlerts(
          alerts
            .sort((a, b) => b.percentage - a.percentage)
            .slice(0, 3)
            .map((p) => ({
              id: p.budget.id,
              name: p.budget.category_id
                ? (p.budget as any).category_name || p.budget.name
                : p.budget.name,
              percentage: p.percentage,
              remaining: p.remaining,
            }))
        );
      } catch (e) {
        console.warn("Falha ao carregar alertas de orçamento", e);
      }

      setBalanceSummary({
        total_balance: total,
        total_income: totalIncome,
        total_expenses: totalExpenses,
        period_start: date_from,
        period_end: date_to,
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
          <View className="flex-row items-center justify-between">
            <Text className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</Text>
            {filtersActive && (
              <View className="rounded-full border border-indigo-400 bg-indigo-50 px-3 py-1 dark:border-indigo-600 dark:bg-indigo-900/30">
                <Text className="text-xs font-medium text-indigo-700 dark:text-indigo-300">
                  Filtros Ativos
                </Text>
              </View>
            )}
          </View>
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

        {/* Gráfico Entradas vs Saídas */}
        {monthlyTrends.length > 1 && (
          <View className="mx-4 mt-6">
            <MonthlyTrendsChart data={monthlyTrends} months={6} showTrendLine />
            {monthlyTrends.length >= 12 && (
              <View className="mt-4 rounded-lg bg-white p-4 dark:bg-gray-800">
                {(() => {
                  const last6 = monthlyTrends.slice(-6);
                  const prev6 = monthlyTrends.slice(-12, -6);
                  const sum = (arr: any[], k: string) => arr.reduce((s, v) => s + (v[k] || 0), 0);
                  const incNow = sum(last6, "income");
                  const incPrev = sum(prev6, "income");
                  const expNow = sum(last6, "expenses");
                  const expPrev = sum(prev6, "expenses");
                  const balNow = incNow - expNow;
                  const balPrev = incPrev - expPrev;
                  function delta(curr: number, prev: number) {
                    if (prev === 0) return null;
                    return ((curr - prev) / prev) * 100;
                  }
                  const di = delta(incNow, incPrev);
                  const de = delta(expNow, expPrev);
                  const db = delta(balNow, balPrev);
                  const Pill = ({ label, value, invert }: any) => {
                    if (value === null) {
                      return (
                        <View className="rounded-md bg-gray-100 px-2 py-1 dark:bg-gray-700">
                          <Text className="text-[10px] text-gray-600 dark:text-gray-300">
                            {label}: -
                          </Text>
                        </View>
                      );
                    }
                    const positive = invert ? value < 0 : value > 0; // invert para despesas
                    const color = positive
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                      : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
                    return (
                      <View className={`rounded-md px-2 py-1 ${color}`}>
                        <Text className="text-[10px] font-semibold">
                          {label}: {value > 0 ? "+" : ""}
                          {value.toFixed(1)}%
                        </Text>
                      </View>
                    );
                  };
                  return (
                    <View>
                      <Text className="mb-2 text-xs font-semibold text-gray-700 dark:text-gray-300">
                        Comparativo últimos 6m vs 6m anteriores
                      </Text>
                      <View className="flex-row flex-wrap gap-2">
                        <Pill label="Receitas" value={di} />
                        <Pill label="Despesas" value={de} invert />
                        <Pill label="Saldo" value={db} />
                      </View>
                      <Text className="mt-2 text-[10px] text-gray-500 dark:text-gray-400">
                        Base: R$ {incPrev.toFixed(0)}→{incNow.toFixed(0)} / R$ {expPrev.toFixed(0)}→
                        {expNow.toFixed(0)} / Saldo {balPrev.toFixed(0)}→{balNow.toFixed(0)}
                      </Text>
                    </View>
                  );
                })()}
              </View>
            )}
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

        {/* Alertas de Orçamento */}
        {budgetAlerts.length > 0 && (
          <View className="mx-4 mb-8">
            <Text className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
              Alertas de Orçamento
            </Text>
            <View className="space-y-3">
              {budgetAlerts.map((a) => (
                <View
                  key={a.id}
                  className="rounded-lg border border-yellow-300 bg-yellow-50 p-4 dark:border-yellow-700 dark:bg-yellow-900/20"
                >
                  <View className="flex-row items-center justify-between">
                    <Text className="flex-1 text-base font-medium text-yellow-800 dark:text-yellow-200">
                      {a.name}
                    </Text>
                    <Text
                      className={`text-sm font-semibold ${
                        a.percentage >= 100
                          ? "text-red-600 dark:text-red-400"
                          : "text-yellow-700 dark:text-yellow-300"
                      }`}
                    >
                      {a.percentage.toFixed(0)}%
                    </Text>
                  </View>
                  <Text className="mt-1 text-xs text-yellow-700 dark:text-yellow-300">
                    {a.remaining >= 0
                      ? `Restam ${formatCurrency(a.remaining)} antes do limite`
                      : `Excedeu em ${formatCurrency(Math.abs(a.remaining))}`}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
