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
  excludeAccountId?: string;
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
    const timer = setTimeout(() => {
      loadAccounts();
    }, 100);

    return () => clearTimeout(timer);
  }, [excludeAccountId]);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      console.log("AccountSelector: Iniciando carregamento de contas...");

      const allAccounts = await accountDAO.findAll();
      console.log("AccountSelector: contas carregadas:", allAccounts.length);

      const filteredAccounts = excludeAccountId
        ? allAccounts.filter((account) => account.id !== excludeAccountId)
        : allAccounts;

      console.log("AccountSelector: contas filtradas:", filteredAccounts.length);
      setAccounts(filteredAccounts);
    } catch (error) {
      console.error("AccountSelector: Erro ao carregar contas:", error);
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
        onPress={() => {
          console.log("AccountSelector: Abrindo modal");
          setShowModal(true);
        }}
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

        <Ionicons name="chevron-down" size={20} style={{ color: "#6B7280" }} />
      </TouchableOpacity>

      {error && <Text className="mt-1 text-sm text-red-500">{error}</Text>}

      <Modal visible={showModal} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/50">
          {/* Container do bottom-sheet: usar estilo inline para evitar problemas de cálculo de altura */}
          <View
            className="rounded-t-xl bg-white dark:bg-gray-800"
            style={{ maxHeight: 480, width: "100%", alignSelf: "stretch" }}
          >
            <View className="flex-row items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
              <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                Selecionar Conta
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} style={{ color: "#6B7280" }} />
              </TouchableOpacity>
            </View>
            {/* ScrollView: remover flex-1 (pode colapsar) e controlar altura via maxHeight */}
            <ScrollView
              style={{ maxHeight: 420 }}
              contentContainerStyle={{ paddingBottom: 24 }}
              onLayout={(e) =>
                console.log(
                  "AccountSelector: ScrollView layout height=",
                  e.nativeEvent.layout.height,
                  "accounts=",
                  accounts.length
                )
              }
            >
              {loading ? (
                <View className="items-center p-8">
                  <Text className="text-gray-600 dark:text-gray-400">Carregando contas...</Text>
                </View>
              ) : accounts.length > 0 ? (
                <View className="p-4">
                  <Text className="mb-2 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    {accounts.length} conta(s)
                  </Text>
                  {accounts.map((account) => (
                    <TouchableOpacity
                      key={account.id}
                      onPress={() => {
                        console.log("AccountSelector: Conta selecionada:", account.name);
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
                        <Ionicons name="checkmark" size={20} style={{ color: "#3B82F6" }} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <View className="items-center p-8">
                  <Ionicons name="wallet-outline" size={48} style={{ color: "#9CA3AF" }} />
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

AccountSelector.displayName = "AccountSelector";
