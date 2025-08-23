import React, { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AccountDAO } from "../../lib/database";
import { formatCurrency } from "../../lib/utils";
import type { Account } from "../../types/entities";

export default function AccountsScreen() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalBalance, setTotalBalance] = useState(0);

  const router = useRouter();
  const accountDAO = AccountDAO.getInstance();

  // Recarregar quando a tela ganhar foco
  useFocusEffect(
    useCallback(() => {
      loadAccounts();
    }, [])
  );

  const loadAccounts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await accountDAO.findAll();
      setAccounts(data);

      // Calcular saldo total
      const total = data.reduce((sum, account) => sum + account.current_balance, 0);
      setTotalBalance(total);
    } catch (error) {
      console.error("Erro ao carregar contas:", error);
      Alert.alert("Erro", "Não foi possível carregar as contas");
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAccounts();
    setRefreshing(false);
  }, []);

  const archiveAccount = async (account: Account) => {
    try {
      await accountDAO.update(account.id, { is_archived: true });
      loadAccounts();
      Alert.alert(
        "Conta Arquivada",
        `A conta "${account.name}" foi arquivada com sucesso.\n\nEla não aparecerá mais na lista principal, mas os dados serão mantidos.`
      );
    } catch (error) {
      console.error("Erro ao arquivar conta:", error);
      Alert.alert("Erro", "Não foi possível arquivar a conta. Tente novamente.");
    }
  };

  const handleDeleteAccount = async (account: Account) => {
    Alert.alert(
      "Excluir Conta",
      `Tem certeza que deseja EXCLUIR permanentemente a conta "${account.name}"?\n\n⚠️ Esta ação é irreversível e só é possível se a conta não possuir transações.\n\n💡 Dica: Use "Arquivar" para ocultar a conta sem perder os dados.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Arquivar",
          style: "default",
          onPress: () => archiveAccount(account),
        },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            try {
              await accountDAO.delete(account.id);
              loadAccounts();
              Alert.alert("Sucesso", "Conta excluída com sucesso");
            } catch (error) {
              console.error("Erro ao excluir conta:", error);

              // Verificar se é erro de transações associadas
              const errorMessage = String(error);
              if (errorMessage.includes("transações associadas")) {
                Alert.alert(
                  "Não é possível excluir",
                  `A conta "${account.name}" possui transações associadas e não pode ser excluída.\n\nPara excluir esta conta, primeiro exclua todas as transações relacionadas a ela ou use a opção "Arquivar" para ocultá-la da lista principal.`,
                  [
                    { text: "Entendi", style: "default" },
                    {
                      text: "Arquivar Conta",
                      style: "default",
                      onPress: () => archiveAccount(account),
                    },
                  ]
                );
              } else {
                Alert.alert("Erro", "Não foi possível excluir a conta. Tente novamente.");
              }
            }
          },
        },
      ]
    );
  };

  const getAccountIcon = (type: string) => {
    switch (type) {
      case "checking":
        return "card";
      case "savings":
        return "archive";
      case "investment":
        return "trending-up";
      case "credit_card":
        return "card-outline";
      case "cash":
        return "cash";
      default:
        return "wallet";
    }
  };

  const getAccountTypeLabel = (type: string) => {
    switch (type) {
      case "checking":
        return "Conta Corrente";
      case "savings":
        return "Poupança";
      case "investment":
        return "Investimento";
      case "credit_card":
        return "Cartão de Crédito";
      case "cash":
        return "Dinheiro";
      default:
        return "Conta";
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900">
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-600 dark:text-gray-400">Carregando contas...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <View className="border-b border-gray-200 bg-white px-4 py-4 dark:border-gray-700 dark:bg-gray-800">
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-gray-900 dark:text-white">Minhas Contas</Text>
          <TouchableOpacity
            onPress={() => router.push("/accounts/create")}
            className="rounded-lg bg-blue-500 px-4 py-2"
          >
            <Text className="font-medium text-white">Nova</Text>
          </TouchableOpacity>
        </View>

        {/* Saldo Total */}
        <View className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/30">
          <Text className="mb-1 text-sm text-blue-600 dark:text-blue-400">Saldo Total</Text>
          <Text className="text-2xl font-bold text-blue-700 dark:text-blue-300">
            {formatCurrency(totalBalance)}
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {accounts.length > 0 ? (
          <View className="space-y-3 p-4">
            {accounts.map((account) => (
              <View key={account.id} className="rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800">
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 flex-row items-center">
                    <View
                      className="mr-4 h-12 w-12 items-center justify-center rounded-full"
                      style={{ backgroundColor: account.color }}
                    >
                      <Ionicons
                        name={getAccountIcon(account.type) as any}
                        size={24}
                        color="white"
                      />
                    </View>

                    <View className="flex-1">
                      <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                        {account.name}
                      </Text>
                      <Text className="text-sm text-gray-600 dark:text-gray-400">
                        {getAccountTypeLabel(account.type)}
                      </Text>
                      {account.is_archived && (
                        <Text className="mt-1 text-xs text-orange-600 dark:text-orange-400">
                          Arquivada
                        </Text>
                      )}
                    </View>
                  </View>

                  <View className="items-end">
                    <Text className="text-xl font-bold text-gray-900 dark:text-white">
                      {formatCurrency(account.current_balance)}
                    </Text>
                    <Text className="text-sm text-gray-600 dark:text-gray-400">
                      Inicial: {formatCurrency(account.initial_balance)}
                    </Text>
                  </View>
                </View>

                {/* Ações */}
                <View className="mt-4 flex-row justify-end space-x-2">
                  <TouchableOpacity
                    onPress={() => router.push(`/accounts/${account.id}`)}
                    className="rounded-lg bg-gray-100 px-4 py-2 dark:bg-gray-700"
                  >
                    <Text className="font-medium text-gray-700 dark:text-gray-300">Editar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleDeleteAccount(account)}
                    className="rounded-lg bg-red-100 px-4 py-2 dark:bg-red-900/30"
                  >
                    <Text className="font-medium text-red-600 dark:text-red-400">Excluir</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View className="flex-1 items-center justify-center p-8">
            <Ionicons name="wallet-outline" size={64} className="mb-4 text-gray-400" />
            <Text className="mb-2 text-lg font-medium text-gray-600 dark:text-gray-400">
              Nenhuma conta criada
            </Text>
            <Text className="mb-6 text-center text-gray-500 dark:text-gray-400">
              Crie sua primeira conta para começar a gerenciar suas finanças
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/accounts/create")}
              className="rounded-lg bg-blue-500 px-6 py-3"
            >
              <Text className="font-semibold text-white">Criar Primeira Conta</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
