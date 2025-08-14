import { View, Text, ScrollView, TouchableOpacity, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useState, useEffect } from "react";
import { TransactionDAO } from "../../src/lib/database";
import { formatCurrency, formatDate } from "../../src/lib/utils";
import type { Transaction } from "../../src/types/entities";

export default function TransactionsScreen() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "income" | "expense" | "transfer">("all");

  const transactionDAO = TransactionDAO.getInstance();

  useEffect(() => {
    loadTransactions();
  }, [filter, searchQuery]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const filters: any = {};

      if (filter !== "all") {
        filters.transaction_types = [filter];
      }

      if (searchQuery) {
        filters.search = searchQuery;
      }

      const data = await transactionDAO.findAll(filters);
      setTransactions(data);
    } catch (error) {
      console.error("Erro ao carregar transações:", error);
    } finally {
      setLoading(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "income":
        return "add-circle";
      case "expense":
        return "remove-circle";
      case "transfer":
        return "swap-horizontal";
      default:
        return "list";
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case "income":
        return "text-green-600";
      case "expense":
        return "text-red-600";
      case "transfer":
        return "text-blue-600";
      default:
        return "text-gray-600";
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header com busca */}
      <View className="bg-white dark:bg-gray-800 px-4 py-4 border-b border-gray-200 dark:border-gray-700">
        <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Transações
        </Text>

        {/* Barra de busca */}
        <View className="flex-row items-center bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-2 mb-4">
          <Ionicons name="search" size={20} className="text-gray-500 mr-2" />
          <TextInput
            className="flex-1 text-gray-900 dark:text-white"
            placeholder="Buscar transações..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Filtros */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row space-x-2">
            {[
              { key: "all", label: "Todas" },
              { key: "income", label: "Receitas" },
              { key: "expense", label: "Despesas" },
              { key: "transfer", label: "Transferências" },
            ].map((item) => (
              <TouchableOpacity
                key={item.key}
                onPress={() => setFilter(item.key as any)}
                className={`px-4 py-2 rounded-full ${
                  filter === item.key ? "bg-blue-500" : "bg-gray-200 dark:bg-gray-600"
                }`}
              >
                <Text
                  className={`font-medium ${
                    filter === item.key
                      ? "text-white"
                      : "text-gray-700 dark:text-gray-300"
                  }`}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Lista de transações */}
      <ScrollView className="flex-1">
        {loading ? (
          <View className="flex-1 justify-center items-center p-8">
            <Text className="text-gray-600 dark:text-gray-400">Carregando...</Text>
          </View>
        ) : transactions.length > 0 ? (
          <View className="p-4 space-y-3">
            {transactions.map((transaction) => (
              <TouchableOpacity
                key={transaction.id}
                className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm"
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center flex-1">
                    <View className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-full items-center justify-center mr-3">
                      <Ionicons
                        name={getTransactionIcon(transaction.type) as any}
                        size={20}
                        className={getTransactionColor(transaction.type)}
                      />
                    </View>

                    <View className="flex-1">
                      <Text className="text-base font-medium text-gray-900 dark:text-white">
                        {transaction.description || "Transação"}
                      </Text>
                      <Text className="text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(transaction.occurred_at)}
                      </Text>
                      {transaction.notes && (
                        <Text className="text-xs text-gray-500 dark:text-gray-400">
                          {transaction.notes}
                        </Text>
                      )}
                    </View>
                  </View>

                  <View className="items-end">
                    <Text
                      className={`text-lg font-semibold ${getTransactionColor(
                        transaction.type
                      )}`}
                    >
                      {transaction.type === "expense" ? "-" : ""}
                      {formatCurrency(transaction.amount)}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View className="flex-1 justify-center items-center p-8">
            <Ionicons name="list-outline" size={64} className="text-gray-400 mb-4" />
            <Text className="text-lg font-medium text-gray-600 dark:text-gray-400 mb-2">
              Nenhuma transação encontrada
            </Text>
            <Text className="text-gray-500 dark:text-gray-400 text-center mb-6">
              {searchQuery
                ? "Tente ajustar sua busca ou filtros"
                : "Adicione sua primeira transação para começar"}
            </Text>
            <TouchableOpacity className="bg-blue-500 rounded-lg px-6 py-3">
              <Text className="text-white font-semibold">Nova Transação</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Botão flutuante para adicionar */}
      <TouchableOpacity className="absolute bottom-6 right-6 bg-blue-500 w-14 h-14 rounded-full items-center justify-center shadow-lg">
        <Ionicons name="add" size={24} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}
