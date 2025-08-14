import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, Modal, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AccountDAO } from "../lib/database";
import type { Account } from "../types/entities";

interface AccountSelectorProps {
  selectedAccountId?: string;
  onAccountSelect: (account: Account) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  error?: string;
  excludeAccountId?: string; // Para transferências, excluir conta de origem
}

export function AccountSelector({
  selectedAccountId,
  onAccountSelect,
  label,
  placeholder = "Selecione uma conta",
  className = "",
  error,
  excludeAccountId,
}: AccountSelectorProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const accountDAO = AccountDAO.getInstance();

  useEffect(() => {
    loadAccounts();
  }, [excludeAccountId]);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const allAccounts = await accountDAO.findAll();

      // Filtrar conta excluída se especificada
      const filteredAccounts = excludeAccountId
        ? allAccounts.filter((account) => account.id !== excludeAccountId)
        : allAccounts;

      setAccounts(filteredAccounts);
    } catch (error) {
      console.error("Erro ao carregar contas:", error);
    } finally {
      setLoading(false);
    }
  };

  const selectedAccount = accounts.find((account) => account.id === selectedAccountId);

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

  return (
    <View className={className}>
      {label && (
        <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">{label}</Text>
      )}

      <TouchableOpacity
        onPress={() => setShowModal(true)}
        className={`flex-row items-center justify-between rounded-lg border bg-gray-100 px-3 py-3 dark:bg-gray-700 ${
          error ? "border-red-500" : "border-gray-300 dark:border-gray-600"
        }`}
      >
        {selectedAccount ? (
          <View className="flex-1 flex-row items-center">
            <View
              className="mr-3 h-8 w-8 items-center justify-center rounded-full"
              style={{ backgroundColor: selectedAccount.color }}
            >
              <Ionicons
                name={getAccountIcon(selectedAccount.type) as any}
                size={16}
                color="white"
              />
            </View>
            <View className="flex-1">
              <Text className="text-base font-medium text-gray-900 dark:text-white">
                {selectedAccount.name}
              </Text>
              <Text className="text-sm text-gray-600 dark:text-gray-400">
                {getAccountTypeLabel(selectedAccount.type)}
              </Text>
            </View>
          </View>
        ) : (
          <Text className="text-base text-gray-500 dark:text-gray-400">{placeholder}</Text>
        )}

        <Ionicons name="chevron-down" size={20} className="text-gray-500" />
      </TouchableOpacity>

      {error && <Text className="mt-1 text-sm text-red-500">{error}</Text>}

      {/* Modal de seleção */}
      <Modal visible={showModal} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/50">
          <View className="max-h-96 rounded-t-xl bg-white dark:bg-gray-800">
            {/* Header */}
            <View className="flex-row items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
              <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                Selecionar Conta
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} className="text-gray-500" />
              </TouchableOpacity>
            </View>

            {/* Lista de contas */}
            <ScrollView className="flex-1">
              {loading ? (
                <View className="items-center p-8">
                  <Text className="text-gray-600 dark:text-gray-400">Carregando contas...</Text>
                </View>
              ) : accounts.length > 0 ? (
                <View className="p-4">
                  {accounts.map((account) => (
                    <TouchableOpacity
                      key={account.id}
                      onPress={() => {
                        onAccountSelect(account);
                        setShowModal(false);
                      }}
                      className="flex-row items-center rounded-lg px-2 py-3 active:bg-gray-100 dark:active:bg-gray-700"
                    >
                      <View
                        className="mr-3 h-10 w-10 items-center justify-center rounded-full"
                        style={{ backgroundColor: account.color }}
                      >
                        <Ionicons
                          name={getAccountIcon(account.type) as any}
                          size={20}
                          color="white"
                        />
                      </View>

                      <View className="flex-1">
                        <Text className="text-base font-medium text-gray-900 dark:text-white">
                          {account.name}
                        </Text>
                        <Text className="text-sm text-gray-600 dark:text-gray-400">
                          {getAccountTypeLabel(account.type)}
                        </Text>
                      </View>

                      <View className="items-end">
                        <Text className="text-base font-semibold text-gray-900 dark:text-white">
                          R${" "}
                          {account.current_balance.toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </Text>
                      </View>

                      {selectedAccountId === account.id && (
                        <Ionicons name="checkmark" size={20} className="ml-2 text-blue-500" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <View className="items-center p-8">
                  <Ionicons name="wallet-outline" size={48} className="mb-4 text-gray-400" />
                  <Text className="text-center text-gray-600 dark:text-gray-400">
                    Nenhuma conta encontrada.{"\n"}
                    Crie uma conta primeiro.
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
