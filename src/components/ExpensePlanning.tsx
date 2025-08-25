import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { formatCurrency, parseAmount } from "../lib/utils";
import { PlannedExpenseDAO } from "../lib/database/PlannedExpenseDAO";
import { CategoryDAO } from "../lib/database/CategoryDAO";
import { TransactionDAO } from "../lib/database/TransactionDAO";
import { AccountDAO } from "../lib/database/AccountDAO";
import { Events } from "../lib/events";
import { useAppStore } from "../lib/store";
import type {
  MonthlyProjection,
  CreatePlannedExpenseData,
  PlannedExpense,
  ExpenseProjection,
  Category,
  Account,
  Transaction,
} from "../types/entities";

interface PlanningScreenProps {
  // Props opcionais para casos específicos
}

const ExpensePlanningComponent: React.FC<PlanningScreenProps> = () => {
  // Estado global
  const { estimatedMonthlyIncome, setEstimatedMonthlyIncome } = useAppStore();

  const [loading, setLoading] = useState(true);
  const [monthlyProjections, setMonthlyProjections] = useState<MonthlyProjection[]>([]);
  const [plannedExpenses, setPlannedExpenses] = useState<PlannedExpense[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSimulationModal, setShowSimulationModal] = useState(false);
  const [showIncomeSourceModal, setShowIncomeSourceModal] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedIncomeAccounts, setSelectedIncomeAccounts] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [monthDetails, setMonthDetails] = useState<ExpenseProjection[]>([]);
  const [simulatedProjections, setSimulatedProjections] = useState<MonthlyProjection[]>([]);
  const [incomeCalculating, setIncomeCalculating] = useState(false);
  const [calculatedIncome, setCalculatedIncome] = useState<number>(0); // Dados do formulário
  const [formData, setFormData] = useState<CreatePlannedExpenseData>({
    name: "",
    amount: 0,
    category_id: "",
    start_month: "",
    installments: 1,
    notes: "",
  });

  // Dados do simulador
  const [simulationData, setSimulationData] = useState<CreatePlannedExpenseData>({
    name: "",
    amount: 0,
    category_id: "",
    start_month: "",
    installments: 1,
    notes: "",
  });

  const [income, setIncome] = useState(estimatedMonthlyIncome);

  // Função para calcular renda baseada no histórico
  const calculateIncomeFromHistory = useCallback(async () => {
    try {
      setIncomeCalculating(true);
      const transactionDAO = TransactionDAO.getInstance();

      // Buscar receitas dos últimos 3 meses para fazer uma média
      const trends = await transactionDAO.getTrends("month", 3);

      if (trends.length > 0) {
        const averageIncome = trends.reduce((sum, trend) => sum + trend.income, 0) / trends.length;

        // Se há receitas no histórico e é significativa, sugerir usar
        if (averageIncome > 0 && Math.abs(averageIncome - estimatedMonthlyIncome) > 500) {
          Alert.alert(
            "💡 Renda Detectada",
            `Detectamos uma renda média de ${formatCurrency(averageIncome)} baseada nos últimos ${trends.length} meses.\n\nDeseja usar este valor?`,
            [
              { text: "Manter Atual", style: "cancel" },
              {
                text: "Usar Detectada",
                onPress: () => {
                  setIncome(averageIncome);
                  setEstimatedMonthlyIncome(averageIncome);
                },
              },
            ]
          );
        }
      }
    } catch (error) {
      console.warn("Erro ao calcular renda do histórico:", error);
    } finally {
      setIncomeCalculating(false);
    }
  }, [estimatedMonthlyIncome, setEstimatedMonthlyIncome]);

  // Função para calcular renda baseada nas contas selecionadas
  const calculateIncomeFromAccounts = useCallback(async (accountIds: string[] = []) => {
    try {
      setIncomeCalculating(true);
      const transactionDAO = TransactionDAO.getInstance();

      // Buscar receitas dos últimos 3 meses nas contas especificadas
      const currentDate = new Date();
      let totalIncome = 0;
      let monthsWithIncome = 0;

      // Se temos contas específicas, filtrar as transações
      if (accountIds.length > 0) {
        for (let i = 0; i < 3; i++) {
          const monthDate = new Date(currentDate);
          monthDate.setMonth(monthDate.getMonth() - i);
          const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
            .toISOString()
            .split("T")[0];
          const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0)
            .toISOString()
            .split("T")[0];

          const monthTransactions = await transactionDAO.findAll({
            account_ids: accountIds,
            transaction_types: ["income"],
            date_from: monthStart,
            date_to: monthEnd,
          });

          const monthIncome = monthTransactions.reduce(
            (sum: number, t: Transaction) => sum + t.amount,
            0
          );
          if (monthIncome > 0) {
            totalIncome += monthIncome;
            monthsWithIncome++;
          }
        }
      } else {
        // Usar método existente para todas as contas
        const trends = await transactionDAO.getTrends("month", 3);
        if (trends.length > 0) {
          totalIncome = trends.reduce((sum, trend) => sum + trend.income, 0);
          monthsWithIncome = trends.length;
        }
      }

      const averageIncome = monthsWithIncome > 0 ? totalIncome / monthsWithIncome : 0;
      setCalculatedIncome(averageIncome);

      return averageIncome;
    } catch (error) {
      console.warn("Erro ao calcular renda das contas:", error);
      return 0;
    } finally {
      setIncomeCalculating(false);
    }
  }, []);

  const handleSelectIncomeSource = () => {
    setShowIncomeSourceModal(true);
  };

  const confirmIncomeFromAccounts = async () => {
    const newIncome = await calculateIncomeFromAccounts(selectedIncomeAccounts);
    if (newIncome > 0) {
      setIncome(newIncome);
      setEstimatedMonthlyIncome(newIncome);
      setShowIncomeSourceModal(false);
    } else {
      Alert.alert(
        "📊 Sem Receitas Detectadas",
        "Não encontramos receitas nas contas selecionadas nos últimos 3 meses. Verifique se há transações de receita cadastradas.",
        [{ text: "OK" }]
      );
    }
  };

  const handleIncomeChange = (newIncome: number) => {
    setIncome(newIncome);
    setEstimatedMonthlyIncome(newIncome);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const plannedExpenseDAO = PlannedExpenseDAO.getInstance();
      const categoryDAO = CategoryDAO.getInstance();
      const accountDAO = AccountDAO.getInstance();

      // Carregar despesas planejadas
      const expenses = await plannedExpenseDAO.findAll();
      setPlannedExpenses(expenses);

      // Carregar categorias
      const allCategories = await categoryDAO.findAll();
      setCategories(allCategories.filter((c) => c.type === "expense"));

      // Carregar contas
      const allAccounts = await accountDAO.findAll();
      setAccounts(allAccounts.filter((a) => !a.is_archived));

      // Calcular projeções para próximos 12 meses
      const currentDate = new Date();
      const startMonth = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, "0")}`;
      const endDate = new Date(currentDate);
      endDate.setMonth(endDate.getMonth() + 12);
      const endMonth = `${endDate.getFullYear()}-${(endDate.getMonth() + 1).toString().padStart(2, "0")}`;

      const projections = await plannedExpenseDAO.getMonthlyProjections(
        startMonth,
        endMonth,
        income
      );
      setMonthlyProjections(projections);
    } catch (error) {
      console.error("Erro ao carregar planejamento:", error);
      Alert.alert("Erro", "Falha ao carregar dados do planejamento");
    } finally {
      setLoading(false);
    }
  }, [income]);

  const handleMonthPress = async (month: string) => {
    try {
      const plannedExpenseDAO = PlannedExpenseDAO.getInstance();
      const details = await plannedExpenseDAO.getProjectionsForPeriod(month, month);
      setMonthDetails(details);
      setSelectedMonth(month);
    } catch (error) {
      console.error("Erro ao carregar detalhes do mês:", error);
    }
  };

  const handleAddExpense = async () => {
    if (!formData.name.trim() || formData.amount <= 0 || !formData.start_month) {
      Alert.alert("Erro", "Preencha todos os campos obrigatórios");
      return;
    }

    try {
      const plannedExpenseDAO = PlannedExpenseDAO.getInstance();
      await plannedExpenseDAO.create(formData);

      setShowAddModal(false);
      setFormData({
        name: "",
        amount: 0,
        category_id: "",
        start_month: "",
        installments: 1,
        notes: "",
      });

      await loadData();
    } catch (error) {
      console.error("Erro ao criar despesa planejada:", error);
      Alert.alert("Erro", "Falha ao criar despesa planejada");
    }
  };

  const handleSimulation = async () => {
    if (!simulationData.name.trim() || simulationData.amount <= 0 || !simulationData.start_month) {
      Alert.alert("Erro", "Preencha todos os campos da simulação");
      return;
    }

    try {
      const plannedExpenseDAO = PlannedExpenseDAO.getInstance();
      const simulated = await plannedExpenseDAO.simulateNewExpense(
        simulationData,
        monthlyProjections
      );
      setSimulatedProjections(simulated);
    } catch (error) {
      console.error("Erro na simulação:", error);
      Alert.alert("Erro", "Falha ao simular despesa");
    }
  };

  const clearSimulation = () => {
    setSimulatedProjections([]);
    setSimulationData({
      name: "",
      amount: 0,
      category_id: "",
      start_month: "",
      installments: 1,
      notes: "",
    });
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const unsubscribe = Events.on("plannedExpenses:created", loadData);
    return unsubscribe;
  }, [loadData]);

  // Verificar se deve sugerir cálculo automático na primeira vez
  useEffect(() => {
    // Se a renda ainda é o padrão (3500) e não há projeções, sugerir calcular
    if (estimatedMonthlyIncome === 3500 && monthlyProjections.length === 0 && !loading) {
      setTimeout(() => {
        calculateIncomeFromHistory();
      }, 1000); // Aguardar um pouco para não parecer intrusivo
    }
  }, [estimatedMonthlyIncome, monthlyProjections.length, loading, calculateIncomeFromHistory]);

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "positive":
        return "text-green-600 dark:text-green-400";
      case "warning":
        return "text-yellow-600 dark:text-yellow-400";
      case "negative":
        return "text-red-600 dark:text-red-400";
      default:
        return "text-gray-600 dark:text-gray-400";
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case "positive":
        return "bg-green-100 dark:bg-green-900";
      case "warning":
        return "bg-yellow-100 dark:bg-yellow-900";
      case "negative":
        return "bg-red-100 dark:bg-red-900";
      default:
        return "bg-gray-100 dark:bg-gray-800";
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50 dark:bg-gray-900">
        {/* Header skeleton */}
        <View className="border-b border-gray-200 bg-white px-4 py-6 dark:border-gray-700 dark:bg-gray-800">
          <View className="mb-4 h-8 w-3/4 rounded-lg bg-gray-200 dark:bg-gray-700" />
          <View className="rounded-lg bg-gray-50 p-4 dark:bg-gray-700">
            <View className="mb-2 h-4 w-1/2 rounded bg-gray-200 dark:bg-gray-600" />
            <View className="h-8 w-1/3 rounded bg-gray-200 dark:bg-gray-600" />
          </View>
        </View>

        {/* Content skeleton */}
        <View className="flex-1 p-4">
          {[1, 2, 3].map((index) => (
            <View
              key={index}
              className="mb-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
            >
              <View className="mb-3 flex-row items-center justify-between">
                <View className="h-6 w-1/3 rounded bg-gray-200 dark:bg-gray-700" />
                <View className="h-6 w-1/4 rounded bg-gray-200 dark:bg-gray-700" />
              </View>
              <View className="space-y-2">
                {[1, 2, 3, 4].map((lineIndex) => (
                  <View key={lineIndex} className="flex-row justify-between">
                    <View className="h-4 w-1/3 rounded bg-gray-200 dark:bg-gray-700" />
                    <View className="h-4 w-1/4 rounded bg-gray-200 dark:bg-gray-700" />
                  </View>
                ))}
              </View>
              <View className="mt-4 h-2 rounded-full bg-gray-200 dark:bg-gray-700" />
            </View>
          ))}
        </View>

        {/* Loading indicator */}
        <View className="absolute inset-0 items-center justify-center">
          <View className="items-center rounded-2xl bg-white p-6 shadow-lg dark:bg-gray-800">
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text className="mt-3 font-medium text-gray-600 dark:text-gray-400">
              Calculando projeções...
            </Text>
          </View>
        </View>
      </View>
    );
  }

  const projectionsToShow =
    simulatedProjections.length > 0 ? simulatedProjections : monthlyProjections;

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header com controle de renda */}
      <View className="border-b border-gray-200 bg-white px-4 py-6 dark:border-gray-700 dark:bg-gray-800">
        <Text className="mb-4 text-xl font-bold text-gray-900 dark:text-white">
          💰 Planejamento de Despesas
        </Text>

        <View className="rounded-lg bg-gray-50 p-4 dark:bg-gray-700">
          <View className="mb-2 flex-row items-center justify-between">
            <Text className="text-sm font-medium text-gray-600 dark:text-gray-300">
              Renda mensal estimada
            </Text>
            <TouchableOpacity
              onPress={handleSelectIncomeSource}
              disabled={incomeCalculating}
              className="flex-row items-center rounded-lg bg-blue-100 px-3 py-1 dark:bg-blue-900"
              activeOpacity={0.7}
            >
              {incomeCalculating ? (
                <ActivityIndicator size="small" color="#3B82F6" />
              ) : (
                <MaterialIcons name="account-balance-wallet" size={16} color="#3B82F6" />
              )}
              <Text className="ml-1 text-xs font-medium text-blue-600 dark:text-blue-400">
                Das Contas
              </Text>
            </TouchableOpacity>
          </View>
          <TextInput
            className="border-0 bg-transparent p-0 text-2xl font-bold text-blue-600 dark:text-blue-400"
            value={formatCurrency(income)}
            onChangeText={(text) => {
              const amount = parseAmount(text);
              handleIncomeChange(amount);
            }}
            keyboardType="numeric"
            style={{ fontSize: 24, fontWeight: "bold" }}
          />
          <Text className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Toque em "Das Contas" para calcular baseado nas receitas das contas selecionadas
          </Text>
        </View>

        {simulatedProjections.length > 0 && (
          <View className="mt-4 flex-row items-center justify-between rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/30">
            <View className="flex-row items-center">
              <MaterialIcons name="visibility" size={20} color="#3B82F6" />
              <Text className="ml-2 font-semibold text-blue-700 dark:text-blue-300">
                Simulação: {simulationData.name}
              </Text>
            </View>
            <TouchableOpacity
              onPress={clearSimulation}
              className="rounded-full bg-blue-100 p-1 dark:bg-blue-800"
            >
              <MaterialIcons name="close" size={18} color="#3B82F6" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Lista de projeções mensais */}
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
      >
        {projectionsToShow.length === 0 ? (
          <View className="flex-1 items-center justify-center py-12">
            <MaterialIcons name="event-note" size={64} color="#9CA3AF" />
            <Text className="mt-4 text-xl font-bold text-gray-700 dark:text-gray-300">
              Sem projeções ainda
            </Text>
            <Text className="mt-2 px-8 text-center text-gray-500 dark:text-gray-400">
              Configure sua renda mensal e adicione algumas despesas planejadas para começar
            </Text>
            <TouchableOpacity
              className="mt-6 rounded-xl bg-blue-600 px-6 py-3"
              onPress={() => setShowAddModal(true)}
              activeOpacity={0.8}
            >
              <Text className="font-bold text-white">Adicionar Primeira Despesa</Text>
            </TouchableOpacity>
          </View>
        ) : (
          projectionsToShow.map((projection, index) => (
            <TouchableOpacity
              key={projection.month}
              className={`mb-4 rounded-xl border-2 p-4 ${getStatusBgColor(projection.status)} ${
                projection.status === "positive"
                  ? "border-green-200 dark:border-green-800"
                  : projection.status === "warning"
                    ? "border-yellow-200 dark:border-yellow-800"
                    : "border-red-200 dark:border-red-800"
              }`}
              onPress={() => handleMonthPress(projection.month)}
              activeOpacity={0.7}
            >
              <View className="mb-3 flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <MaterialIcons
                    name="calendar-today"
                    size={20}
                    color={
                      projection.status === "positive"
                        ? "#059669"
                        : projection.status === "warning"
                          ? "#D97706"
                          : "#DC2626"
                    }
                  />
                  <Text className="ml-2 text-lg font-bold text-gray-900 dark:text-white">
                    {formatMonth(projection.month)}
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <Text className={`text-xl font-bold ${getStatusColor(projection.status)}`}>
                    {formatCurrency(projection.remaining_budget)}
                  </Text>
                  <MaterialIcons name="chevron-right" size={20} color="#9CA3AF" className="ml-1" />
                </View>
              </View>

              <View className="space-y-3">
                <View className="flex-row items-center justify-between py-2">
                  <View className="flex-row items-center">
                    <MaterialIcons name="trending-up" size={16} color="#10B981" />
                    <Text className="ml-2 text-gray-600 dark:text-gray-400">Renda</Text>
                  </View>
                  <Text className="font-semibold text-green-600 dark:text-green-400">
                    {formatCurrency(projection.total_income)}
                  </Text>
                </View>

                <View className="flex-row items-center justify-between py-2">
                  <View className="flex-row items-center">
                    <MaterialIcons name="home" size={16} color="#EF4444" />
                    <Text className="ml-2 text-gray-600 dark:text-gray-400">Despesas fixas</Text>
                  </View>
                  <Text className="font-semibold text-red-600 dark:text-red-400">
                    -{formatCurrency(projection.fixed_expenses)}
                  </Text>
                </View>

                <View className="flex-row items-center justify-between py-2">
                  <View className="flex-row items-center">
                    <MaterialIcons name="schedule" size={16} color="#F59E0B" />
                    <Text className="ml-2 text-gray-600 dark:text-gray-400">
                      Despesas planejadas
                    </Text>
                  </View>
                  <Text className="font-semibold text-orange-600 dark:text-orange-400">
                    -{formatCurrency(projection.planned_expenses)}
                  </Text>
                </View>

                <View className="flex-row items-center justify-between py-2">
                  <View className="flex-row items-center">
                    <MaterialIcons name="more-horiz" size={16} color="#8B5CF6" />
                    <Text className="ml-2 text-gray-600 dark:text-gray-400">
                      Despesas variáveis
                    </Text>
                  </View>
                  <Text className="font-semibold text-purple-600 dark:text-purple-400">
                    -{formatCurrency(projection.variable_expenses)}
                  </Text>
                </View>
              </View>

              {/* Barra de progresso visual */}
              <View className="mt-4 h-2 rounded-full bg-gray-200 dark:bg-gray-700">
                <View
                  className={`h-2 rounded-full ${
                    projection.status === "positive"
                      ? "bg-green-500"
                      : projection.status === "warning"
                        ? "bg-yellow-500"
                        : "bg-red-500"
                  }`}
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(
                        0,
                        ((projection.total_income - Math.abs(projection.remaining_budget)) /
                          projection.total_income) *
                          100
                      )
                    )}%`,
                  }}
                />
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Botões de ação flutuantes */}
      <View className="absolute bottom-0 left-0 right-0 border-t border-gray-200 bg-white px-4 py-4 pb-6 dark:border-gray-700 dark:bg-gray-800">
        <View className="flex-row space-x-3">
          <TouchableOpacity
            className="flex-1 flex-row items-center justify-center rounded-xl bg-blue-600 px-6 py-4 shadow-lg"
            onPress={() => setShowAddModal(true)}
            activeOpacity={0.8}
          >
            <MaterialIcons name="add-circle" size={20} color="white" />
            <Text className="ml-2 text-base font-bold text-white">Adicionar Despesa</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-1 flex-row items-center justify-center rounded-xl bg-green-600 px-6 py-4 shadow-lg"
            onPress={() => setShowSimulationModal(true)}
            activeOpacity={0.8}
          >
            <MaterialIcons name="visibility" size={20} color="white" />
            <Text className="ml-2 text-base font-bold text-white">Simular</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Modal de detalhes do mês */}
      <Modal visible={!!selectedMonth} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/50">
          <View className="max-h-96 rounded-t-3xl bg-white shadow-2xl dark:bg-gray-800">
            {/* Header do modal */}
            <View className="flex-row items-center justify-between border-b border-gray-200 p-6 dark:border-gray-700">
              <View className="flex-row items-center">
                <MaterialIcons name="calendar-today" size={24} color="#6366F1" />
                <Text className="ml-3 text-xl font-bold text-gray-900 dark:text-white">
                  {selectedMonth && formatMonth(selectedMonth)}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedMonth("")}
                className="rounded-full bg-gray-100 p-2 dark:bg-gray-700"
              >
                <MaterialIcons name="close" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Conteúdo do modal */}
            <View className="p-6">
              <FlatList
                data={monthDetails}
                keyExtractor={(item, index) => `${item.planned_expense_id}-${index}`}
                renderItem={({ item }) => (
                  <View className="flex-row items-center justify-between border-b border-gray-100 py-4 dark:border-gray-700">
                    <View className="flex-1">
                      <Text className="text-base font-medium text-gray-900 dark:text-white">
                        {item.description}
                      </Text>
                    </View>
                    <View className="rounded-lg bg-red-50 px-3 py-1 dark:bg-red-900/30">
                      <Text className="font-bold text-red-600 dark:text-red-400">
                        {formatCurrency(item.amount)}
                      </Text>
                    </View>
                  </View>
                )}
                ListEmptyComponent={
                  <View className="items-center py-8">
                    <MaterialIcons name="event-available" size={48} color="#9CA3AF" />
                    <Text className="mt-2 text-center text-gray-500 dark:text-gray-400">
                      Nenhuma despesa planejada{"\n"}para este mês
                    </Text>
                  </View>
                }
                showsVerticalScrollIndicator={false}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de adicionar despesa */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View className="flex-1 justify-center bg-black/50 p-4">
          <View className="mx-auto w-full max-w-sm rounded-2xl bg-white shadow-2xl dark:bg-gray-800">
            {/* Header do modal */}
            <View className="border-b border-gray-200 p-6 dark:border-gray-700">
              <View className="flex-row items-center">
                <MaterialIcons name="add-circle" size={24} color="#3B82F6" />
                <Text className="ml-3 text-xl font-bold text-gray-900 dark:text-white">
                  Nova Despesa Planejada
                </Text>
              </View>
            </View>

            {/* Formulário */}
            <View className="space-y-4 p-6">
              <View>
                <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Nome da despesa
                </Text>
                <TextInput
                  className="rounded-xl border border-gray-300 bg-gray-50 p-4 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder="Ex: Notebook Dell, Curso de inglês..."
                  placeholderTextColor="#9CA3AF"
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                />
              </View>

              <View>
                <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Valor por parcela
                </Text>
                <TextInput
                  className="rounded-xl border border-gray-300 bg-gray-50 p-4 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder="R$ 0,00"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                  value={formData.amount > 0 ? formatCurrency(formData.amount) : ""}
                  onChangeText={(text) => setFormData({ ...formData, amount: parseAmount(text) })}
                />
              </View>

              <View className="flex-row space-x-3">
                <View className="flex-1">
                  <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Início
                  </Text>
                  <TextInput
                    className="rounded-xl border border-gray-300 bg-gray-50 p-4 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    placeholder="2025-01"
                    placeholderTextColor="#9CA3AF"
                    value={formData.start_month}
                    onChangeText={(text) => setFormData({ ...formData, start_month: text })}
                  />
                </View>

                <View className="flex-1">
                  <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Parcelas
                  </Text>
                  <TextInput
                    className="rounded-xl border border-gray-300 bg-gray-50 p-4 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    placeholder="12"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                    value={formData.installments.toString()}
                    onChangeText={(text) =>
                      setFormData({ ...formData, installments: parseInt(text) || 1 })
                    }
                  />
                </View>
              </View>

              <View>
                <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Observações (opcional)
                </Text>
                <TextInput
                  className="rounded-xl border border-gray-300 bg-gray-50 p-4 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder="Detalhes adicionais..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  value={formData.notes}
                  onChangeText={(text) => setFormData({ ...formData, notes: text })}
                />
              </View>
            </View>

            {/* Botões do modal */}
            <View className="flex-row space-x-3 p-6 pt-0">
              <TouchableOpacity
                className="flex-1 rounded-xl bg-gray-200 py-4 dark:bg-gray-700"
                onPress={() => setShowAddModal(false)}
                activeOpacity={0.8}
              >
                <Text className="text-center font-bold text-gray-700 dark:text-gray-300">
                  Cancelar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-1 rounded-xl bg-blue-600 py-4"
                onPress={handleAddExpense}
                activeOpacity={0.8}
              >
                <Text className="text-center font-bold text-white">Adicionar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de simulação */}
      <Modal visible={showSimulationModal} transparent animationType="slide">
        <View className="flex-1 justify-center bg-black/50 p-4">
          <View className="mx-auto w-full max-w-sm rounded-2xl bg-white shadow-2xl dark:bg-gray-800">
            {/* Header do modal */}
            <View className="border-b border-gray-200 p-6 dark:border-gray-700">
              <View className="flex-row items-center">
                <MaterialIcons name="visibility" size={24} color="#10B981" />
                <Text className="ml-3 text-xl font-bold text-gray-900 dark:text-white">
                  Simular Nova Compra
                </Text>
              </View>
              <Text className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Veja o impacto antes de decidir
              </Text>
            </View>

            {/* Formulário */}
            <View className="space-y-4 p-6">
              <View>
                <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Nome da compra
                </Text>
                <TextInput
                  className="rounded-xl border border-gray-300 bg-gray-50 p-4 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder="Ex: iPhone 15, Sofá novo..."
                  placeholderTextColor="#9CA3AF"
                  value={simulationData.name}
                  onChangeText={(text) => setSimulationData({ ...simulationData, name: text })}
                />
              </View>

              <View>
                <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Valor por parcela
                </Text>
                <TextInput
                  className="rounded-xl border border-gray-300 bg-gray-50 p-4 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder="R$ 0,00"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                  value={simulationData.amount > 0 ? formatCurrency(simulationData.amount) : ""}
                  onChangeText={(text) =>
                    setSimulationData({ ...simulationData, amount: parseAmount(text) })
                  }
                />
              </View>

              <View className="flex-row space-x-3">
                <View className="flex-1">
                  <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Início
                  </Text>
                  <TextInput
                    className="rounded-xl border border-gray-300 bg-gray-50 p-4 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    placeholder="2025-01"
                    placeholderTextColor="#9CA3AF"
                    value={simulationData.start_month}
                    onChangeText={(text) =>
                      setSimulationData({ ...simulationData, start_month: text })
                    }
                  />
                </View>

                <View className="flex-1">
                  <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Parcelas
                  </Text>
                  <TextInput
                    className="rounded-xl border border-gray-300 bg-gray-50 p-4 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    placeholder="12"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                    value={simulationData.installments.toString()}
                    onChangeText={(text) =>
                      setSimulationData({ ...simulationData, installments: parseInt(text) || 1 })
                    }
                  />
                </View>
              </View>
            </View>

            {/* Botões do modal */}
            <View className="flex-row space-x-3 p-6 pt-0">
              <TouchableOpacity
                className="flex-1 rounded-xl bg-gray-200 py-4 dark:bg-gray-700"
                onPress={() => setShowSimulationModal(false)}
                activeOpacity={0.8}
              >
                <Text className="text-center font-bold text-gray-700 dark:text-gray-300">
                  Cancelar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-1 rounded-xl bg-green-600 py-4"
                onPress={() => {
                  handleSimulation();
                  setShowSimulationModal(false);
                }}
                activeOpacity={0.8}
              >
                <Text className="text-center font-bold text-white">Simular</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de seleção de contas para renda */}
      <Modal visible={showIncomeSourceModal} transparent animationType="slide">
        <View className="flex-1 justify-center bg-black/50 p-4">
          <View className="mx-auto w-full max-w-md rounded-2xl bg-white shadow-2xl dark:bg-gray-800">
            {/* Header do modal */}
            <View className="border-b border-gray-200 p-6 dark:border-gray-700">
              <View className="flex-row items-center">
                <MaterialIcons name="account-balance-wallet" size={24} color="#3B82F6" />
                <Text className="ml-3 text-xl font-bold text-gray-900 dark:text-white">
                  Contas para Cálculo de Renda
                </Text>
              </View>
              <Text className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Selecione as contas que recebem suas receitas para calcular automaticamente a renda
                mensal
              </Text>
            </View>

            {/* Lista de contas */}
            <View className="max-h-96 p-6">
              <FlatList
                data={accounts}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    className={`mb-3 flex-row items-center rounded-lg border p-4 ${
                      selectedIncomeAccounts.includes(item.id)
                        ? "border-blue-300 bg-blue-50 dark:border-blue-600 dark:bg-blue-900/30"
                        : "border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-700"
                    }`}
                    onPress={() => {
                      if (selectedIncomeAccounts.includes(item.id)) {
                        setSelectedIncomeAccounts(
                          selectedIncomeAccounts.filter((id) => id !== item.id)
                        );
                      } else {
                        setSelectedIncomeAccounts([...selectedIncomeAccounts, item.id]);
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons
                      name={
                        selectedIncomeAccounts.includes(item.id)
                          ? "check-box"
                          : "check-box-outline-blank"
                      }
                      size={24}
                      color={selectedIncomeAccounts.includes(item.id) ? "#3B82F6" : "#9CA3AF"}
                    />
                    <View className="ml-3 flex-1">
                      <Text className="font-medium text-gray-900 dark:text-white">{item.name}</Text>
                      <Text className="text-sm text-gray-500 dark:text-gray-400">
                        {item.type === "checking" && "Conta Corrente"}
                        {item.type === "savings" && "Poupança"}
                        {item.type === "cash" && "Dinheiro"}
                        {item.type === "credit_card" && "Cartão de Crédito"}
                        {item.type === "investment" && "Investimento"}
                        {item.type === "other" && "Outras"}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
                showsVerticalScrollIndicator={false}
              />
            </View>

            {/* Informação sobre o cálculo */}
            <View className="border-t border-gray-200 p-4 dark:border-gray-700">
              <View className="mb-4 rounded-lg bg-blue-50 p-3 dark:bg-blue-900/30">
                <Text className="text-xs text-blue-800 dark:text-blue-200">
                  💡 Calcularemos a média das receitas dos últimos 3 meses nas contas selecionadas
                </Text>
              </View>

              {selectedIncomeAccounts.length > 0 && calculatedIncome > 0 && (
                <View className="mb-4 rounded-lg bg-green-50 p-3 dark:bg-green-900/30">
                  <Text className="text-sm font-medium text-green-800 dark:text-green-200">
                    Renda calculada: {formatCurrency(calculatedIncome)}
                  </Text>
                </View>
              )}
            </View>

            {/* Botões */}
            <View className="flex-row space-x-3 p-6">
              <TouchableOpacity
                className="flex-1 rounded-xl border border-gray-300 bg-gray-100 p-4 dark:border-gray-600 dark:bg-gray-700"
                onPress={() => setShowIncomeSourceModal(false)}
                activeOpacity={0.8}
              >
                <Text className="text-center font-medium text-gray-700 dark:text-gray-300">
                  Cancelar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className={`flex-1 rounded-xl p-4 ${
                  selectedIncomeAccounts.length === 0
                    ? "bg-gray-300 dark:bg-gray-600"
                    : "bg-blue-600 dark:bg-blue-700"
                }`}
                onPress={confirmIncomeFromAccounts}
                disabled={selectedIncomeAccounts.length === 0 || incomeCalculating}
                activeOpacity={0.8}
              >
                {incomeCalculating ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text className="text-center font-bold text-white">
                    {selectedIncomeAccounts.length === 0
                      ? "Selecione Contas"
                      : `Calcular (${selectedIncomeAccounts.length})`}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default ExpensePlanningComponent;
