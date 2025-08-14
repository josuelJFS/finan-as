import React, { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { TransactionDAO, AccountDAO, CategoryDAO } from "../../lib/database";
import { formatCurrency } from "../../lib/utils";
import type { Transaction, Account, Category } from "../../types/entities";

interface TransactionWithDetails extends Transaction {
  account_name: string;
  category_name?: string;
  destination_account_name?: string;
}

export default function TransactionsListScreen() {
  const [transactions, setTransactions] = useState<TransactionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const router = useRouter();
  const transactionDAO = TransactionDAO.getInstance();
  const accountDAO = AccountDAO.getInstance();
  const categoryDAO = CategoryDAO.getInstance();

  // Recarregar quando a tela ganhar foco
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // Carregar dados base
      const [accountsData, categoriesData] = await Promise.all([
        accountDAO.findAll(),
        categoryDAO.findAll(),
      ]);

      setAccounts(accountsData);
      setCategories(categoriesData);

      // Carregar transações
      await loadTransactions(accountsData, categoriesData);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      Alert.alert("Erro", "Não foi possível carregar os dados");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTransactions = useCallback(
    async (accountsData?: Account[], categoriesData?: Category[]) => {
      try {
        const accountsList = accountsData || accounts;
        const categoriesList = categoriesData || categories;

        const transactionsData = await transactionDAO.findAll();

        // Enriquecer transações com nomes de conta e categoria
        const enrichedTransactions = transactionsData.map((transaction) => {
          const account = accountsList.find((acc) => acc.id === transaction.account_id);
          const category = categoriesList.find((cat) => cat.id === transaction.category_id);
          const destinationAccount = accountsList.find(
            (acc) => acc.id === transaction.destination_account_id
          );

          return {
            ...transaction,
            account_name: account?.name || "Conta não encontrada",
            category_name: category?.name,
            destination_account_name: destinationAccount?.name,
          };
        });

        // Ordenar por data (mais recente primeiro)
        enrichedTransactions.sort(
          (a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()
        );

        setTransactions(enrichedTransactions);
      } catch (error) {
        console.error("Erro ao carregar transações:", error);
        Alert.alert("Erro", "Não foi possível carregar as transações");
      }
    },
    [accounts, categories]
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const handleDeleteTransaction = async (transaction: TransactionWithDetails) => {
    Alert.alert(
      "Excluir Transação",
      `Tem certeza que deseja excluir esta transação?\n\nEsta ação não pode ser desfeita.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            try {
              await transactionDAO.delete(transaction.id);
              await loadTransactions();
            } catch (error) {
              console.error("Erro ao excluir transação:", error);
              Alert.alert("Erro", "Não foi possível excluir a transação");
            }
          },
        },
      ]
    );
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "income":
        return "arrow-down";
      case "expense":
        return "arrow-up";
      case "transfer":
        return "swap-horizontal";
      default:
        return "receipt";
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case "income":
        return "#10b981"; // green
      case "expense":
        return "#ef4444"; // red
      case "transfer":
        return "#3b82f6"; // blue
      default:
        return "#6b7280"; // gray
    }
  };

  const getTransactionTypeLabel = (type: string) => {
    switch (type) {
      case "income":
        return "Receita";
      case "expense":
        return "Despesa";
      case "transfer":
        return "Transferência";
      default:
        return "Transação";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900">
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-600 dark:text-gray-400">Carregando transações...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <View className="border-b border-gray-200 bg-white px-4 py-4 dark:border-gray-700 dark:bg-gray-800">
        <View className="flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-gray-900 dark:text-white">Transações</Text>
          <TouchableOpacity
            onPress={() => router.push("/transactions/create")}
            className="rounded-lg bg-blue-500 px-4 py-2"
          >
            <Text className="font-medium text-white">Nova</Text>
          </TouchableOpacity>
        </View>
      </View>

      {transactions.length === 0 ? (
        <View className="flex-1 items-center justify-center p-8">
          <Ionicons name="receipt" size={64} color="#9ca3af" />
          <Text className="mt-4 text-center text-xl font-semibold text-gray-900 dark:text-white">
            Nenhuma transação encontrada
          </Text>
          <Text className="mb-6 mt-2 text-center text-gray-500 dark:text-gray-400">
            Comece criando sua primeira receita ou despesa
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/transactions/create")}
            className="rounded-lg bg-blue-500 px-6 py-3"
          >
            <Text className="font-semibold text-white">Criar Transação</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <View className="space-y-3 p-4">
            {transactions.map((transaction) => (
              <TouchableOpacity
                key={transaction.id}
                onPress={() => router.push(`/transactions/${transaction.id}`)}
                className="rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800"
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 flex-row items-center">
                    <View
                      className="mr-4 h-12 w-12 items-center justify-center rounded-full"
                      style={{ backgroundColor: getTransactionColor(transaction.type) }}
                    >
                      <Ionicons
                        name={getTransactionIcon(transaction.type) as any}
                        size={20}
                        color="white"
                      />
                    </View>

                    <View className="flex-1">
                      <View className="flex-row items-center justify-between">
                        <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                          {transaction.description}
                        </Text>
                        <Text
                          className="text-lg font-bold"
                          style={{ color: getTransactionColor(transaction.type) }}
                        >
                          {transaction.type === "expense" ? "-" : ""}
                          {formatCurrency(transaction.amount)}
                        </Text>
                      </View>

                      <View className="mt-1 flex-row items-center">
                        <Text className="text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(transaction.occurred_at)} • {transaction.account_name}
                        </Text>
                        {transaction.category_name && (
                          <Text className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                            • {transaction.category_name}
                          </Text>
                        )}
                      </View>

                      {transaction.type === "transfer" && transaction.destination_account_name && (
                        <Text className="mt-1 text-sm text-blue-600 dark:text-blue-400">
                          Para: {transaction.destination_account_name}
                        </Text>
                      )}

                      {transaction.notes && (
                        <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          {transaction.notes}
                        </Text>
                      )}
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={() => handleDeleteTransaction(transaction)}
                    className="ml-3 p-2"
                  >
                    <Ionicons name="trash" size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

TransactionsListScreen.displayName = "TransactionsListScreen";
