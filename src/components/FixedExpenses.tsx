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
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { formatCurrency, parseAmount } from "../lib/utils";
import { TransactionDAO } from "../lib/database/TransactionDAO";
import { FixedExpenseDAO, type FixedExpenseWithPayment } from "../lib/database/FixedExpenseDAO";
import { Events } from "../lib/events";

interface FixedExpense {
  id: string;
  name: string;
  amount: number;
  category: string;
  isPaid: boolean;
  dueDay: number; // Dia do vencimento (1-31)
  isActive: boolean;
}

interface MonthlyBudget {
  totalIncome: number;
  fixedExpenses: number;
  variableExpenses: number;
  remaining: number;
  status: "positive" | "negative" | "warning";
}

const FixedExpensesComponent: React.FC = () => {
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpenseWithPayment[]>([]);
  const [monthlyBudget, setMonthlyBudget] = useState<MonthlyBudget | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [currentYear] = useState(new Date().getFullYear());
  const [currentMonth] = useState(new Date().getMonth() + 1);

  // Formulário para nova despesa fixa
  const [formData, setFormData] = useState({
    name: "",
    amount: "",
    category: "",
    dueDay: "1",
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const fixedExpenseDAO = FixedExpenseDAO.getInstance();
      const transactionDAO = TransactionDAO.getInstance();

      // Buscar despesas fixas com status de pagamento
      const expenses = await fixedExpenseDAO.findWithPaymentStatus(currentYear, currentMonth);
      setFixedExpenses(expenses);

      // Buscar receitas do mês atual
      const trends = await transactionDAO.getTrends("month", 1);
      const currentMonthData = trends.find((t) =>
        t.period.includes(`${currentYear}-${currentMonth.toString().padStart(2, "0")}`)
      );
      // Usar receita real do mês ou permitir que usuário configure valor padrão
      const monthlyIncome = currentMonthData?.income || 0; // Sem valor padrão fixo

      // Calcular estatísticas de despesas fixas
      const stats = await fixedExpenseDAO.getPaymentStats(currentYear, currentMonth);

      const variableSpent = currentMonthData?.expenses || 0;
      const remaining = monthlyIncome - stats.total - variableSpent;

      let status: "positive" | "negative" | "warning" = "positive";
      if (remaining < 0) status = "negative";
      else if (remaining < 500) status = "warning";

      setMonthlyBudget({
        totalIncome: monthlyIncome,
        fixedExpenses: stats.total,
        variableExpenses: variableSpent,
        remaining,
        status,
      });
    } catch (error) {
      console.error("Erro ao carregar despesas fixas:", error);
    } finally {
      setLoading(false);
    }
  }, [currentYear, currentMonth]);

  useEffect(() => {
    loadData();

    // Escutar eventos de alteração
    const unsubscribe = Events.on("fixedExpenses:paymentToggled", loadData);
    return unsubscribe;
  }, [loadData]);

  const toggleExpensePaid = async (id: string) => {
    try {
      const fixedExpenseDAO = FixedExpenseDAO.getInstance();
      await fixedExpenseDAO.togglePayment(id, currentYear, currentMonth);
      // loadData será chamado automaticamente pelo evento
    } catch (error) {
      console.error("Erro ao alterar status de pagamento:", error);
      Alert.alert("Erro", "Não foi possível alterar o status de pagamento");
    }
  };

  const addExpense = async () => {
    if (!formData.name || !formData.amount) {
      Alert.alert("Erro", "Preencha nome e valor da despesa");
      return;
    }

    try {
      const fixedExpenseDAO = FixedExpenseDAO.getInstance();
      await fixedExpenseDAO.create({
        name: formData.name,
        amount: parseAmount(formData.amount),
        category: formData.category || "Outras",
        due_day: parseInt(formData.dueDay),
        is_active: true,
      });

      setFormData({ name: "", amount: "", category: "", dueDay: "1" });
      setShowAddModal(false);
      loadData();
    } catch (error) {
      console.error("Erro ao adicionar despesa fixa:", error);
      Alert.alert("Erro", "Não foi possível adicionar a despesa fixa");
    }
  };

  const removeExpense = (id: string) => {
    Alert.alert("Remover Despesa", "Tem certeza que deseja remover esta despesa fixa?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Remover",
        style: "destructive",
        onPress: async () => {
          try {
            const fixedExpenseDAO = FixedExpenseDAO.getInstance();
            await fixedExpenseDAO.delete(id);
            loadData();
          } catch (error) {
            console.error("Erro ao remover despesa fixa:", error);
            Alert.alert("Erro", "Não foi possível remover a despesa fixa");
          }
        },
      },
    ]);
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "positive":
        return "trending-up";
      case "warning":
        return "warning";
      case "negative":
        return "trending-down";
      default:
        return "help";
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center p-6">
        <ActivityIndicator size="large" color="#6366f1" />
        <Text className="mt-4 text-gray-600 dark:text-gray-400">Carregando despesas fixas...</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Resumo do Orçamento - Estilo Excel */}
      {monthlyBudget && (
        <View className="m-4 rounded-xl bg-white p-4 dark:bg-gray-800">
          <Text className="mb-4 text-lg font-bold text-gray-900 dark:text-white">
            📊 Resumo do Mês (Estilo Excel)
          </Text>

          <View className="space-y-3">
            <View className="flex-row justify-between border-b border-gray-200 pb-2 dark:border-gray-700">
              <Text className="font-medium text-gray-700 dark:text-gray-300">
                Salário Total Mês:
              </Text>
              <Text className="font-bold text-green-600 dark:text-green-400">
                {formatCurrency(monthlyBudget.totalIncome)}
              </Text>
            </View>

            <View className="flex-row justify-between border-b border-gray-200 pb-2 dark:border-gray-700">
              <Text className="font-medium text-gray-700 dark:text-gray-300">
                Total Despesas Fixas:
              </Text>
              <Text className="font-bold text-red-600 dark:text-red-400">
                {formatCurrency(monthlyBudget.fixedExpenses)}
              </Text>
            </View>

            <View className="flex-row justify-between border-b border-gray-200 pb-2 dark:border-gray-700">
              <Text className="font-medium text-gray-700 dark:text-gray-300">
                Gastos Variáveis:
              </Text>
              <Text className="font-medium text-orange-600 dark:text-orange-400">
                {formatCurrency(monthlyBudget.variableExpenses)}
              </Text>
            </View>

            <View
              className={`flex-row justify-between rounded-lg p-3 ${
                monthlyBudget.status === "positive"
                  ? "bg-green-50 dark:bg-green-900/20"
                  : monthlyBudget.status === "warning"
                    ? "bg-yellow-50 dark:bg-yellow-900/20"
                    : "bg-red-50 dark:bg-red-900/20"
              }`}
            >
              <View className="flex-row items-center">
                <MaterialIcons
                  name={getStatusIcon(monthlyBudget.status)}
                  size={20}
                  color={
                    monthlyBudget.status === "positive"
                      ? "#059669"
                      : monthlyBudget.status === "warning"
                        ? "#d97706"
                        : "#dc2626"
                  }
                />
                <Text className="ml-2 font-bold text-gray-900 dark:text-white">
                  {monthlyBudget.remaining >= 0 ? "SOBRA/DEVE:" : "DÉFICIT:"}
                </Text>
              </View>
              <Text className={`text-lg font-bold ${getStatusColor(monthlyBudget.status)}`}>
                {formatCurrency(Math.abs(monthlyBudget.remaining))}
              </Text>
            </View>

            <View
              className={`rounded-lg p-3 ${
                monthlyBudget.status === "positive"
                  ? "bg-blue-50 dark:bg-blue-900/20"
                  : monthlyBudget.status === "warning"
                    ? "bg-yellow-50 dark:bg-yellow-900/20"
                    : "bg-red-50 dark:bg-red-900/20"
              }`}
            >
              <Text className={`text-center font-bold ${getStatusColor(monthlyBudget.status)}`}>
                STATUS:{" "}
                {monthlyBudget.remaining >= 0
                  ? monthlyBudget.remaining > 500
                    ? "TRANQUILO"
                    : "ATENÇÃO"
                  : "DEVENDO"}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Lista de Despesas Fixas */}
      <View className="m-4 rounded-xl bg-white p-4 dark:bg-gray-800">
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-lg font-bold text-gray-900 dark:text-white">💳 Despesas Fixas</Text>
          <TouchableOpacity
            onPress={() => setShowAddModal(true)}
            className="rounded-lg bg-blue-500 px-3 py-2"
          >
            <MaterialIcons name="add" size={16} color="white" />
          </TouchableOpacity>
        </View>

        {fixedExpenses.map((expense) => (
          <View
            key={expense.id}
            className={`mb-3 rounded-lg p-3 ${
              expense.isPaid ? "bg-green-50 dark:bg-green-900/20" : "bg-gray-50 dark:bg-gray-700"
            }`}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text
                  className={`font-medium ${
                    expense.isPaid
                      ? "text-green-800 line-through dark:text-green-300"
                      : "text-gray-900 dark:text-white"
                  }`}
                >
                  {expense.name}
                </Text>
                <Text className="text-xs text-gray-500 dark:text-gray-400">
                  {expense.category} • Vence dia {expense.due_day}
                </Text>
              </View>

              <View className="items-end">
                <Text
                  className={`font-bold ${
                    expense.isPaid
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {formatCurrency(expense.amount)}
                </Text>

                <View className="flex-row items-center space-x-2">
                  <TouchableOpacity
                    onPress={() => toggleExpensePaid(expense.id)}
                    className={`rounded px-2 py-1 ${
                      expense.isPaid
                        ? "bg-green-100 dark:bg-green-800"
                        : "bg-gray-100 dark:bg-gray-600"
                    }`}
                  >
                    <Text
                      className={`text-xs ${
                        expense.isPaid
                          ? "text-green-800 dark:text-green-300"
                          : "text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {expense.isPaid ? "Pago" : "Pendente"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => removeExpense(expense.id)}
                    className="rounded bg-red-100 p-1 dark:bg-red-900/30"
                  >
                    <MaterialIcons name="delete" size={14} color="#dc2626" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* Modal para Adicionar Despesa */}
      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet">
        <View className="flex-1 bg-white p-6 dark:bg-gray-900">
          <View className="mb-6 flex-row items-center justify-between">
            <Text className="text-xl font-bold text-gray-900 dark:text-white">
              Nova Despesa Fixa
            </Text>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <MaterialIcons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <View className="space-y-4">
            <View>
              <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Nome da Despesa
              </Text>
              <TextInput
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="Ex: Internet, Cartão..."
                className="rounded-lg border border-gray-300 bg-white p-3 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View>
              <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Valor
              </Text>
              <TextInput
                value={formData.amount}
                onChangeText={(text) => setFormData({ ...formData, amount: text })}
                placeholder="0,00"
                keyboardType="numeric"
                className="rounded-lg border border-gray-300 bg-white p-3 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View>
              <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Categoria
              </Text>
              <TextInput
                value={formData.category}
                onChangeText={(text) => setFormData({ ...formData, category: text })}
                placeholder="Ex: Moradia, Financiamento..."
                className="rounded-lg border border-gray-300 bg-white p-3 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View>
              <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Dia do Vencimento
              </Text>
              <TextInput
                value={formData.dueDay}
                onChangeText={(text) => setFormData({ ...formData, dueDay: text })}
                placeholder="1-31"
                keyboardType="numeric"
                className="rounded-lg border border-gray-300 bg-white p-3 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                placeholderTextColor="#9ca3af"
              />
            </View>
          </View>

          <TouchableOpacity onPress={addExpense} className="mt-6 rounded-lg bg-blue-500 p-4">
            <Text className="text-center font-semibold text-white">Adicionar Despesa Fixa</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </ScrollView>
  );
};

export default FixedExpensesComponent;
