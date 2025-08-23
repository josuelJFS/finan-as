import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { AccountDAO, TransactionDAO, materializeDueRecurrences } from "../../src/lib/database";
import type { CategorySummary } from "../../src/lib/database/TransactionDAO";
import { FixedExpenseDAO } from "../../src/lib/database/FixedExpenseDAO";
import { BudgetDAO } from "../../src/lib/database/BudgetDAO";
import { formatCurrency } from "../../src/lib/utils";
import { Events } from "../../src/lib/events";
import type { Account, Transaction } from "../../src/types/entities";
import Svg, { Circle, Path, Defs, LinearGradient, Stop } from "react-native-svg";

interface HomeData {
  totalBalance: number;
  primaryBalance: number; // Saldo das contas principais (sem investimento)
  investmentBalance: number; // Saldo das contas de investimento
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlyBalance: number; // Saldo do mês (receitas - despesas)
  remainingBudget: number; // Quanto sobra para gastar no mês
  accounts: Account[];
  primaryAccounts: Account[]; // Contas principais
  investmentAccounts: Account[]; // Contas de investimento
  incomeChart: number[];
  expenseChart: number[];
  categoryExpenses: Array<{ name: string; amount: number; color: string; percentage: number }>; // Para gráfico pizza
  fixedExpensesStatus: {
    total: number;
    paid: number;
    pending: number;
  };
  quickBudgets: Array<{
    categoryName: string;
    budgetAmount: number;
    spentAmount: number;
    percentage: number;
    status: "ok" | "warning" | "exceeded";
  }>;
  coverageSuggestion?: {
    needed: number; // Valor necessário para cobrir déficit
    availableFromInvestments: number; // Disponível nas contas de investimento
    message: string; // Mensagem explicativa
  };
}

const { width } = Dimensions.get("window");

// Mini Components
const MiniSparkline = ({
  data,
  color = "#3b82f6",
  height = 40,
  width = 80,
}: {
  data: number[];
  color?: string;
  height?: number;
  width?: number;
}) => {
  if (!data || data.length < 2) {
    return (
      <View style={{ width, height }} className="rounded bg-gray-100 dark:bg-gray-800">
        <Text className="mt-3 text-center text-xs text-gray-400">Sem dados</Text>
      </View>
    );
  }

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <Stop offset="100%" stopColor={color} stopOpacity="0.1" />
          </LinearGradient>
        </Defs>
        <Path d={`M ${points} L ${width},${height} L 0,${height} Z`} fill="url(#gradient)" />
        <Path d={`M ${points}`} fill="none" stroke={color} strokeWidth={2} />
      </Svg>
    </View>
  );
};

const MiniDonut = ({
  value,
  total,
  color = "#3b82f6",
  size = 40,
}: {
  value: number;
  total: number;
  color?: string;
  size?: number;
}) => {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  const circumference = 2 * Math.PI * 12;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={12}
          stroke="#e5e7eb"
          strokeWidth={3}
          fill="transparent"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={12}
          stroke={color}
          strokeWidth={3}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View className="absolute inset-0 items-center justify-center">
        <Text className="text-xs font-bold text-gray-700 dark:text-gray-300">
          {Math.round(percentage)}%
        </Text>
      </View>
    </View>
  );
};

// Componente de gráfico pizza simples
const PieChart = ({
  data,
  size = 120,
}: {
  data: Array<{ name: string; amount: number; color: string; percentage: number }>;
  size?: number;
}) => {
  const radius = size / 2 - 10;
  const center = size / 2;
  let cumulativePercentage = 0;

  const pathElements = data.map((item, index) => {
    const startAngle = cumulativePercentage * 3.6; // Convert to degrees
    const endAngle = (cumulativePercentage + item.percentage) * 3.6;
    cumulativePercentage += item.percentage;

    const startX = center + radius * Math.cos((startAngle - 90) * (Math.PI / 180));
    const startY = center + radius * Math.sin((startAngle - 90) * (Math.PI / 180));
    const endX = center + radius * Math.cos((endAngle - 90) * (Math.PI / 180));
    const endY = center + radius * Math.sin((endAngle - 90) * (Math.PI / 180));

    const largeArcFlag = item.percentage > 50 ? 1 : 0;

    const pathData = [
      `M ${center} ${center}`,
      `L ${startX} ${startY}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`,
      `Z`,
    ].join(" ");

    return <Path key={index} d={pathData} fill={item.color} stroke="white" strokeWidth={2} />;
  });

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        {pathElements}
      </Svg>
    </View>
  );
};

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const loadingRef = React.useRef(false);
  const reloadTimerRef = React.useRef<number | null>(null);

  const loadData = useCallback(async () => {
    try {
      if (loadingRef.current) return;
      loadingRef.current = true;
      setLoading((prev) => (data ? prev : true));
      const accountDAO = AccountDAO.getInstance();
      const transactionDAO = TransactionDAO.getInstance();
      const fixedExpenseDAO = FixedExpenseDAO.getInstance();
      const budgetDAO = BudgetDAO.getInstance();

      // Buscar dados em paralelo
      const [accounts, trends, fixedStats] = await Promise.all([
        accountDAO.findAll(),
        transactionDAO.getTrends("month", 1),
        fixedExpenseDAO.getPaymentStats(new Date().getFullYear(), new Date().getMonth() + 1),
      ]);

      // Separar contas por tipo ANTES de calcular receitas/despesas mensais
      const primaryAccounts = accounts.filter(
        (acc) => acc.type !== "investment" && !acc.is_archived
      );
      const investmentAccounts = accounts.filter(
        (acc) => acc.type === "investment" && !acc.is_archived
      );

      // Buscar receitas e despesas APENAS das contas principais (não investimento) do mês atual
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split("T")[0];
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        .toISOString()
        .split("T")[0];

      // IDs das contas principais
      const primaryAccountIds = primaryAccounts.map((acc) => acc.id);

      // Calcular receitas e despesas apenas das contas principais usando filtros
      let monthlyIncome = 0;
      let monthlyExpenses = 0;

      if (primaryAccountIds.length > 0) {
        // Buscar todas as transações do mês das contas principais
        const monthlyTransactions = await transactionDAO.findAll({
          account_ids: primaryAccountIds,
          date_from: startOfMonth,
          date_to: endOfMonth,
          is_pending: false,
        });

        // Calcular receitas e despesas
        monthlyTransactions.forEach((transaction: Transaction) => {
          if (transaction.type === "income") {
            monthlyIncome += transaction.amount;
          } else if (transaction.type === "expense") {
            monthlyExpenses += transaction.amount;
          }
          // Ignorar transferências (type === 'transfer') para não duplicar valores
        });
      }

      // Buscar gastos por categoria do mês atual (mantém lógica original)
      const categorySummary = await transactionDAO.getCategorySummary(
        startOfMonth,
        endOfMonth,
        "expense"
      );

      if (__DEV__) {
        console.log(`[Home] Receitas mensais (contas principais): ${monthlyIncome}`);
        console.log(`[Home] Despesas mensais (contas principais): ${monthlyExpenses}`);
        console.log(`[Home] Buscando categorias de ${startOfMonth} até ${endOfMonth}`);
        console.log(`[Home] Categorias encontradas: ${categorySummary.length}`);
        categorySummary.forEach((cat, index) => {
          console.log(
            `[Home] ${index + 1}. ${cat.category_name}: ${cat.amount} (${cat.transaction_count} transações)`
          );
        });
      }

      // Processar dados para o gráfico de pizza (top 5 categorias)
      const colors = ["#ef4444", "#3b82f6", "#ec4899", "#10b981", "#f59e0b", "#6b7280"];
      const totalExpenses = categorySummary.reduce((sum, cat) => sum + Math.abs(cat.amount), 0);

      let processedCategories = [];
      if (categorySummary.length > 0 && totalExpenses > 0) {
        processedCategories = categorySummary.slice(0, 5).map((cat, index) => ({
          name: cat.category_name,
          amount: Math.abs(cat.amount),
          color: colors[index] || "#6b7280",
          percentage: (Math.abs(cat.amount) / totalExpenses) * 100,
        }));
      } else {
        // Dados padrão quando não há transações
        processedCategories = [{ name: "Sem dados", amount: 0, color: "#e5e7eb", percentage: 100 }];
      }

      // Calcular saldos separados
      const primaryBalance = primaryAccounts.reduce(
        (sum: number, acc: Account) => sum + acc.current_balance,
        0
      );
      const investmentBalance = investmentAccounts.reduce(
        (sum: number, acc: Account) => sum + acc.current_balance,
        0
      );
      const totalBalance = primaryBalance + investmentBalance;

      // Verificar se precisa de sugestão de cobertura
      let coverageSuggestion = undefined;
      if (primaryBalance < 0 && investmentBalance > 0) {
        const needed = Math.abs(primaryBalance);
        const available = Math.min(needed, investmentBalance);
        coverageSuggestion = {
          needed,
          availableFromInvestments: investmentBalance,
          message:
            available >= needed
              ? `Transferir ${formatCurrency(needed)} dos investimentos para cobrir o déficit`
              : `Déficit de ${formatCurrency(needed)}. Disponível nos investimentos: ${formatCurrency(investmentBalance)}`,
        };
      }

      // Calcular saldo do mês e orçamento restante (baseado APENAS nas contas principais)
      const monthlyBalance = monthlyIncome - monthlyExpenses;
      const remainingBudget = monthlyIncome - monthlyExpenses - (fixedStats.pending || 0);

      // Buscar orçamentos do mês atual para o card rápido
      const budgets = await budgetDAO.getCurrentActiveBudgets();

      if (__DEV__) {
        console.log("[Home] Orçamentos encontrados:", budgets.length);
        budgets.forEach((budget, index) => {
          console.log(`[Home] Orçamento ${index + 1}:`, {
            category_name: (budget.budget as any)?.category_name,
            amount: budget.budget?.amount,
            spent: budget.spent,
            percentage: budget.percentage,
          });
        });
      }

      // Processar top 4 orçamentos para o card rápido
      const quickBudgets = budgets.slice(0, 4).map((budgetProgress: any) => {
        const budget = budgetProgress.budget;
        const spent = budgetProgress.spent || 0;
        const amount = budget?.amount || 0;
        const percentage = amount > 0 ? (spent / amount) * 100 : 0;

        let status: "ok" | "warning" | "exceeded" = "ok";

        if (percentage > 100) {
          status = "exceeded";
        } else if (percentage > 80) {
          status = "warning";
        }

        return {
          categoryName: (budget as any)?.category_name || budget?.name || "Categoria",
          budgetAmount: amount,
          spentAmount: spent,
          percentage: Math.min(percentage, 100),
          status,
        };
      }); // Gerar dados para gráficos (últimos 5 meses) - mantém lógica original para histórico
      const incomeChart = trends
        .slice(0, 5)
        .reverse()
        .map((t) => t?.income || 0);
      const expenseChart = trends
        .slice(0, 5)
        .reverse()
        .map((t) => t?.expenses || 0);

      setData({
        totalBalance,
        primaryBalance,
        investmentBalance,
        monthlyIncome,
        monthlyExpenses,
        monthlyBalance,
        remainingBudget,
        accounts,
        primaryAccounts,
        investmentAccounts,
        incomeChart,
        expenseChart,
        categoryExpenses: processedCategories,
        fixedExpensesStatus: {
          total: fixedStats.total,
          paid: fixedStats.paid,
          pending: fixedStats.pending,
        },
        quickBudgets,
        coverageSuggestion,
      });
    } catch (error) {
      if (__DEV__) {
        console.error("Erro ao carregar dados da home:", error);
      }
      // Em caso de erro, definir estado padrão para evitar crash
      setData({
        totalBalance: 0,
        primaryBalance: 0,
        investmentBalance: 0,
        monthlyIncome: 0,
        monthlyExpenses: 0,
        monthlyBalance: 0,
        remainingBudget: 0,
        accounts: [],
        primaryAccounts: [],
        investmentAccounts: [],
        incomeChart: [],
        expenseChart: [],
        categoryExpenses: [{ name: "Sem dados", amount: 0, color: "#e5e7eb", percentage: 100 }],
        fixedExpensesStatus: { total: 0, paid: 0, pending: 0 },
        quickBudgets: [],
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
      loadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Listener para recarregar dados quando transações mudarem
  useEffect(() => {
    const scheduleReload = (reason: string) => {
      if (__DEV__) {
        console.log(`${reason}, recarregando dados da home...`);
      }
      if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
      reloadTimerRef.current = setTimeout(() => {
        loadData();
      }, 120) as unknown as number;
    };

    const unsubscribeTransactions = Events.on("transactions:changed", () => {
      scheduleReload("Transação mudou");
    });

    const unsubscribeAccounts = Events.on("accounts:balancesChanged", () => {
      scheduleReload("Saldos das contas mudaram");
    });

    return () => {
      if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
      unsubscribeTransactions();
      unsubscribeAccounts();
    };
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      // Materializar recorrências quando a tela ganha foco (evita duplicações)
      materializeDueRecurrences()
        .then(() => {
          loadData();
        })
        .catch((err) => {
          console.warn("Erro ao materializar recorrências:", err);
          loadData(); // Carrega mesmo se materialização falhar
        });
    }, [loadData])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const navigateToFeature = (screen: string) => {
    // Rotas que estão dentro de (tabs)
    const tabRoutes = ["budgets", "reports", "fixed-expenses", "cashflow"];

    if (tabRoutes.includes(screen)) {
      router.push(`/(tabs)/${screen}` as any);
    } else {
      // Rotas que estão fora de (tabs)
      router.push(`/${screen}` as any);
    }
  };

  const quickActions = [
    {
      id: "add-expense",
      title: "Nova Despesa",
      icon: "remove-circle",
      color: "#ef4444",
      bgColor: "bg-red-500",
      onPress: () => router.push("/transactions/create?type=expense"),
    },
    {
      id: "add-income",
      title: "Adicionar Salário",
      icon: "work",
      color: "#059669",
      bgColor: "bg-emerald-600",
      onPress: () => router.push("/transactions/create?type=income&category=salary&note=Salário"),
    },
    {
      id: "add-other-income",
      title: "Outras Receitas",
      icon: "add-circle",
      color: "#10b981",
      bgColor: "bg-green-500",
      onPress: () => router.push("/transactions/create?type=income"),
    },
  ];

  const features = [
    {
      id: "cashflow",
      title: "Fluxo de Caixa",
      subtitle: "Controle mensal completo",
      icon: "trending-up",
      color: "#8b5cf6",
      badge: null,
    },
    {
      id: "recurrences",
      title: "Recorrências",
      subtitle: "Salários e gastos fixos automáticos",
      icon: "repeat",
      color: "#ec4899",
      badge: null,
    },
    {
      id: "fixed-expenses",
      title: "Gastos Fixos",
      subtitle: `R$ ${data?.fixedExpensesStatus?.pending?.toFixed(0) || 0} pendentes`,
      icon: "receipt",
      color: "#f59e0b",
      badge:
        data?.fixedExpensesStatus && data.fixedExpensesStatus.pending > 0
          ? Math.ceil(data.fixedExpensesStatus.pending / 100)
          : null,
    },
    {
      id: "budgets",
      title: "Orçamentos",
      subtitle: "Metas e controle de gastos",
      icon: "pie-chart",
      color: "#06b6d4",
      badge: null,
    },
    {
      id: "reports",
      title: "Relatórios",
      subtitle: "Análises e gráficos",
      icon: "bar-chart",
      color: "#84cc16",
      badge: null,
    },
  ];

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-gray-900">
        <MaterialIcons name="account-balance-wallet" size={48} color="#6366f1" />
        <Text className="mt-4 text-gray-600 dark:text-gray-400">Carregando...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900" style={{ paddingTop: insets.top }}>
      <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />

      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 54 + insets.bottom + 8 }}
      >
        {/* Header com saldos detalhados */}
        <View className="bg-white px-6 py-8 dark:bg-gray-800">
          {/* Saldo Principal */}
          <Text className="text-lg text-gray-600 dark:text-gray-400">Contas Principais</Text>
          <Text
            className={`mt-1 text-3xl font-bold ${
              (data?.primaryBalance || 0) >= 0
                ? "text-gray-900 dark:text-white"
                : "text-red-600 dark:text-red-400"
            }`}
          >
            {formatCurrency(data?.primaryBalance || 0)}
          </Text>

          {/* Linha com investimentos e total */}
          <View className="mt-4 flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-sm text-gray-500 dark:text-gray-400">Investimentos</Text>
              <Text className="text-base font-semibold text-green-600 dark:text-green-400">
                {formatCurrency(data?.investmentBalance || 0)}
              </Text>
            </View>

            <View className="ml-4 flex-1">
              <Text className="text-sm text-gray-500 dark:text-gray-400">Total Geral</Text>
              <Text className="text-base font-semibold text-gray-700 dark:text-gray-300">
                {formatCurrency(data?.totalBalance || 0)}
              </Text>
            </View>
          </View>

          {/* Sugestão de cobertura */}
          {data?.coverageSuggestion && (
            <View className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
              <View className="flex-row items-center">
                <MaterialIcons name="warning" size={20} color="#f59e0b" />
                <Text className="ml-2 font-semibold text-yellow-800 dark:text-yellow-300">
                  Sugestão de Cobertura
                </Text>
              </View>
              <Text className="mt-2 text-sm text-yellow-700 dark:text-yellow-400">
                {data.coverageSuggestion.message}
              </Text>
              {data.coverageSuggestion.availableFromInvestments >=
                data.coverageSuggestion.needed && (
                <TouchableOpacity className="mt-3 rounded-lg bg-yellow-500 px-4 py-2">
                  <Text className="text-center text-sm font-medium text-white">
                    Criar Transferência
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Cards Modernos de Receitas e Despesas */}
        <View className="mx-4 mt-8">
          {/* Card de Resumo Financeiro */}
          <View
            className="mb-6 rounded-3xl bg-white p-6 dark:bg-gray-800"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 12,
              elevation: 8,
            }}
          >
            <Text className="mb-4 text-lg font-bold text-gray-900 dark:text-white">
              Resumo do Mês
            </Text>

            <View className="flex-row justify-between">
              {/* Receitas */}
              <View className="flex-1 items-center">
                <View className="mb-2 h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                  <MaterialIcons name="arrow-upward" size={24} color="#10b981" />
                </View>
                <Text className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  Receitas
                </Text>
                <Text className="mt-1 text-lg font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(data?.monthlyIncome || 0)}
                </Text>
              </View>

              {/* Separador */}
              <View className="mx-4 w-px bg-gray-200 dark:bg-gray-600" />

              {/* Despesas */}
              <View className="flex-1 items-center">
                <View className="mb-2 h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                  <MaterialIcons name="arrow-downward" size={24} color="#ef4444" />
                </View>
                <Text className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  Despesas
                </Text>
                <Text className="mt-1 text-lg font-bold text-red-600 dark:text-red-400">
                  {formatCurrency(data?.monthlyExpenses || 0)}
                </Text>
              </View>

              {/* Separador */}
              <View className="mx-4 w-px bg-gray-200 dark:bg-gray-600" />

              {/* Saldo */}
              <View className="flex-1 items-center">
                <View
                  className={`mb-2 h-12 w-12 items-center justify-center rounded-full ${
                    (data?.monthlyIncome || 0) - (data?.monthlyExpenses || 0) >= 0
                      ? "bg-blue-100 dark:bg-blue-900/30"
                      : "bg-orange-100 dark:bg-orange-900/30"
                  }`}
                >
                  <MaterialIcons
                    name="account-balance-wallet"
                    size={24}
                    color={
                      (data?.monthlyIncome || 0) - (data?.monthlyExpenses || 0) >= 0
                        ? "#3b82f6"
                        : "#f97316"
                    }
                  />
                </View>
                <Text className="text-xs font-medium text-gray-500 dark:text-gray-400">Saldo</Text>
                <Text
                  className={`mt-1 text-lg font-bold ${
                    (data?.monthlyIncome || 0) - (data?.monthlyExpenses || 0) >= 0
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-orange-600 dark:text-orange-400"
                  }`}
                >
                  {formatCurrency((data?.monthlyIncome || 0) - (data?.monthlyExpenses || 0))}
                </Text>
              </View>
            </View>
          </View>

          {/* Card de Orçamento Mensal */}
          <View
            className="mb-6 rounded-3xl bg-white p-6 dark:bg-gray-800"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 12,
              elevation: 8,
            }}
          >
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-lg font-bold text-gray-900 dark:text-white">
                Orçamento do Mês
              </Text>
              <View
                className={`rounded-full px-3 py-1 ${
                  (data?.remainingBudget || 0) >= 0
                    ? "bg-green-100 dark:bg-green-900/30"
                    : "bg-red-100 dark:bg-red-900/30"
                }`}
              >
                <Text
                  className={`text-sm font-medium ${
                    (data?.remainingBudget || 0) >= 0
                      ? "text-green-700 dark:text-green-400"
                      : "text-red-700 dark:text-red-400"
                  }`}
                >
                  {(data?.remainingBudget || 0) >= 0 ? "No Meta" : "Acima"}
                </Text>
              </View>
            </View>

            <View className="space-y-3">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm text-gray-600 dark:text-gray-400">Receita Mensal</Text>
                <Text className="text-sm font-medium text-green-600 dark:text-green-400">
                  + {formatCurrency(data?.monthlyIncome || 0)}
                </Text>
              </View>

              <View className="flex-row items-center justify-between">
                <Text className="text-sm text-gray-600 dark:text-gray-400">Gastos do Mês</Text>
                <Text className="text-sm font-medium text-red-600 dark:text-red-400">
                  - {formatCurrency(data?.monthlyExpenses || 0)}
                </Text>
              </View>

              <View className="border-t border-gray-200 pt-3 dark:border-gray-600">
                <View className="mb-3 flex-row items-center justify-between">
                  <Text className="text-base font-semibold text-gray-900 dark:text-white">
                    Saldo Restante
                  </Text>
                  <Text
                    className={`text-xl font-bold ${
                      (data?.remainingBudget || 0) >= 0
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {(data?.remainingBudget || 0) >= 0 ? "+" : ""}
                    {formatCurrency(data?.remainingBudget || 0)}
                  </Text>
                </View>

                <View>
                  <View className="h-3 rounded-full bg-gray-200 dark:bg-gray-700">
                    <View
                      className={`h-3 rounded-full ${
                        (data?.remainingBudget || 0) >= 0
                          ? "bg-green-500 dark:bg-green-400"
                          : "bg-red-500 dark:bg-red-400"
                      }`}
                      style={{
                        width:
                          (data?.monthlyIncome || 0) > 0
                            ? `${Math.min(100, Math.max(0, (((data?.monthlyIncome || 0) - Math.abs(data?.remainingBudget || 0)) / (data?.monthlyIncome || 0)) * 100))}%`
                            : "0%",
                      }}
                    />
                  </View>
                  <Text className="mt-2 text-center text-xs text-gray-500 dark:text-gray-400">
                    {(data?.monthlyIncome || 0) > 0 && (data?.remainingBudget || 0) < 0
                      ? `${((Math.abs(data?.remainingBudget || 0) / (data?.monthlyIncome || 0)) * 100).toFixed(1)}% acima do orçamento`
                      : (data?.monthlyIncome || 0) > 0
                        ? `${((((data?.monthlyIncome || 0) - Math.abs(data?.remainingBudget || 0)) / (data?.monthlyIncome || 0)) * 100).toFixed(1)}% do orçamento usado`
                        : "Configure suas receitas para ver o progresso"}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Card de Orçamentos Rápidos */}
          {data?.quickBudgets && data.quickBudgets.length > 0 && (
            <View
              className="mb-6 rounded-3xl bg-white p-6 dark:bg-gray-800"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 12,
                elevation: 8,
              }}
            >
              <View className="mb-4 flex-row items-center justify-between">
                <Text className="text-lg font-bold text-gray-900 dark:text-white">
                  Orçamentos do Mês
                </Text>
                <TouchableOpacity
                  onPress={() => navigateToFeature("budgets")}
                  className="rounded-full bg-gray-100 px-3 py-1 dark:bg-gray-700"
                >
                  <Text className="text-xs font-medium text-gray-600 dark:text-gray-300">
                    Ver todos
                  </Text>
                </TouchableOpacity>
              </View>

              <View className="space-y-3">
                {data.quickBudgets.map((budget, index) => (
                  <View key={index} className="space-y-2">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-sm font-medium text-gray-900 dark:text-white">
                        {budget.categoryName}
                      </Text>
                      <View className="flex-row items-center space-x-2">
                        <Text className="text-xs text-gray-500 dark:text-gray-400">
                          {formatCurrency(budget.spentAmount)} /{" "}
                          {formatCurrency(budget.budgetAmount)}
                        </Text>
                        <View
                          className={`rounded-full px-2 py-1 ${
                            budget.status === "exceeded"
                              ? "bg-red-100 dark:bg-red-900/30"
                              : budget.status === "warning"
                                ? "bg-yellow-100 dark:bg-yellow-900/30"
                                : "bg-green-100 dark:bg-green-900/30"
                          }`}
                        >
                          <Text
                            className={`text-xs font-medium ${
                              budget.status === "exceeded"
                                ? "text-red-700 dark:text-red-400"
                                : budget.status === "warning"
                                  ? "text-yellow-700 dark:text-yellow-400"
                                  : "text-green-700 dark:text-green-400"
                            }`}
                          >
                            {budget.percentage.toFixed(0)}%
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View className="h-2 rounded-full bg-gray-200 dark:bg-gray-700">
                      <View
                        className={`h-2 rounded-full ${
                          budget.status === "exceeded"
                            ? "bg-red-500 dark:bg-red-400"
                            : budget.status === "warning"
                              ? "bg-yellow-500 dark:bg-yellow-400"
                              : "bg-green-500 dark:bg-green-400"
                        }`}
                        style={{ width: `${budget.percentage}%` }}
                      />
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Card de Gráfico de Categorias */}
          <View
            className="rounded-3xl bg-white p-6 dark:bg-gray-800"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 12,
              elevation: 8,
            }}
          >
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-lg font-bold text-gray-900 dark:text-white">
                Gastos por Categoria
              </Text>
              <TouchableOpacity
                onPress={() => router.push("/reports")}
                className="rounded-full bg-gray-100 px-3 py-1 dark:bg-gray-700"
              >
                <Text className="text-xs font-medium text-gray-600 dark:text-gray-300">
                  Ver mais
                </Text>
              </TouchableOpacity>
            </View>

            <View className="flex-row items-center">
              {/* Gráfico de Pizza */}
              <View className="mr-6">
                <PieChart data={data?.categoryExpenses || []} size={120} />
              </View>

              {/* Legenda */}
              <View className="flex-1">
                {data?.categoryExpenses?.slice(0, 4).map((category, index) => (
                  <View key={index} className="mb-3 flex-row items-center">
                    <View
                      className="mr-3 h-3 w-3 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <View className="flex-1">
                      <Text className="text-sm font-medium text-gray-900 dark:text-white">
                        {category.name}
                      </Text>
                      <Text className="text-xs text-gray-500 dark:text-gray-400">
                        {category.percentage.toFixed(1)}% • {formatCurrency(category.amount)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* Ações Rápidas */}
        <View className="mt-8 px-4">
          <Text className="mb-4 text-lg font-bold text-gray-900 dark:text-white">
            Ações Rápidas
          </Text>
          <View className="flex-row justify-between">
            {quickActions.map((action, index) => (
              <TouchableOpacity
                key={action.id}
                onPress={action.onPress}
                accessibilityRole="button"
                className={`items-center justify-center rounded-2xl p-5 ${action.bgColor}`}
                style={{
                  width: "30%",
                  marginHorizontal: index === 1 ? 8 : 0,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.12,
                  shadowRadius: 4,
                  elevation: 3,
                }}
              >
                <View className="h-10 w-10 items-center justify-center rounded-full bg-white/20">
                  <MaterialIcons name={action.icon as any} size={22} color="white" />
                </View>
                <Text className="mt-3 text-center text-sm font-semibold text-white">
                  {action.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Ações Recorrentes */}
        <View className="mt-6 px-4">
          <Text className="mb-3 text-base font-semibold text-gray-700 dark:text-gray-300">
            💫 Automatizar
          </Text>
          <View className="flex-row justify-between">
            <TouchableOpacity
              onPress={() => router.push("/recurrences/new?type=income")}
              className="rounded-xl bg-green-500 p-4"
              style={{ width: "48%" }}
            >
              <MaterialIcons name="repeat" size={24} color="white" />
              <Text className="mt-2 text-sm font-semibold text-white">Receita Fixa</Text>
              <Text className="text-xs text-green-100">Salário, freelance...</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/recurrences/new?type=expense")}
              className="rounded-xl bg-red-500 p-4"
              style={{ width: "48%" }}
            >
              <MaterialIcons name="schedule" size={24} color="white" />
              <Text className="mt-2 text-sm font-semibold text-white">Gasto Fixo</Text>
              <Text className="text-xs text-red-100">Aluguel, internet...</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Funcionalidades */}
        <View className="mt-8 px-4">
          <Text className="mb-5 text-lg font-bold text-gray-900 dark:text-white">
            Funcionalidades
          </Text>
          <View>
            {features.map((feature, index) => (
              <TouchableOpacity
                key={feature.id}
                onPress={() => navigateToFeature(feature.id)}
                className="mb-4 flex-row items-center rounded-xl bg-white p-5 dark:bg-gray-800"
                style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.1,
                  shadowRadius: 3,
                  elevation: 2,
                }}
              >
                <View
                  className="h-12 w-12 items-center justify-center rounded-full"
                  style={{ backgroundColor: `${feature.color}20` }}
                >
                  <MaterialIcons name={feature.icon as any} size={24} color={feature.color} />
                </View>
                <View className="ml-4 flex-1">
                  <Text className="font-semibold text-gray-900 dark:text-white">
                    {feature.title}
                  </Text>
                  <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {feature.subtitle}
                  </Text>
                </View>
                {feature.badge && (
                  <View
                    className="ml-3 h-6 min-w-[24px] items-center justify-center rounded-full px-2"
                    style={{ backgroundColor: feature.color }}
                  >
                    <Text className="text-xs font-bold text-white">
                      {feature.badge > 9 ? "9+" : feature.badge}
                    </Text>
                  </View>
                )}
                <MaterialIcons
                  name="chevron-right"
                  size={20}
                  color="#9ca3af"
                  style={{ marginLeft: 8 }}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Contas principais - resumo rápido */}
        {data && data.primaryAccounts && data.primaryAccounts.length > 0 && (
          <View className="mt-8 px-4">
            <Text className="mb-5 text-lg font-bold text-gray-900 dark:text-white">
              Contas Principais
            </Text>
            <View>
              {data.primaryAccounts.slice(0, 3).map((account, index) => (
                <TouchableOpacity
                  key={account.id}
                  onPress={() => router.push(`/accounts/${account.id}`)}
                  className="mb-4 flex-row items-center rounded-xl bg-white p-5 dark:bg-gray-800"
                  style={{
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.1,
                    shadowRadius: 3,
                    elevation: 2,
                  }}
                >
                  <View className="h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                    <MaterialIcons name="account-balance" size={24} color="#3b82f6" />
                  </View>
                  <View className="ml-4 flex-1">
                    <Text className="font-semibold text-gray-900 dark:text-white">
                      {account.name}
                    </Text>
                    <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {account.type === "checking" ? "Conta Corrente" : "Conta"}
                    </Text>
                  </View>
                  <Text
                    className={`text-lg font-bold ${
                      account.current_balance >= 0
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {formatCurrency(account.current_balance)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Investimentos */}
        {data && data.investmentAccounts && data.investmentAccounts.length > 0 && (
          <View className="mt-8 px-4">
            <Text className="mb-5 text-lg font-bold text-gray-900 dark:text-white">
              Investimentos
            </Text>
            <View>
              {data.investmentAccounts.slice(0, 2).map((account, index) => (
                <TouchableOpacity
                  key={account.id}
                  onPress={() => router.push(`/accounts/${account.id}`)}
                  className="mb-4 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 p-6 dark:from-green-900/20 dark:to-emerald-900/20"
                  style={{
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.1,
                    shadowRadius: 3,
                    elevation: 2,
                  }}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1 flex-row items-center">
                      <View className="h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                        <MaterialIcons name="trending-up" size={24} color="#10b981" />
                      </View>
                      <View className="ml-4 flex-1">
                        <Text className="font-semibold text-gray-900 dark:text-white">
                          {account.name}
                        </Text>
                        <Text className="mt-1 text-sm text-green-600 dark:text-green-400">
                          Protegido • Investimento
                        </Text>
                      </View>
                    </View>
                    <View className="items-end">
                      <Text className="text-lg font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(account.current_balance)}
                      </Text>
                      <View className="mt-1 flex-row items-center">
                        <MaterialIcons name="security" size={12} color="#10b981" />
                        <Text className="ml-1 text-xs text-green-600 dark:text-green-400">
                          Reservado
                        </Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Ver todas as contas */}
        {data && data.accounts && data.accounts.length > 5 && (
          <View className="mt-6 px-4">
            <TouchableOpacity
              onPress={() => router.push("/accounts")}
              className="rounded-lg bg-gray-100 p-3 dark:bg-gray-700"
            >
              <Text className="text-center text-gray-600 dark:text-gray-400">
                Ver todas as contas ({data.accounts.length})
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
