import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AccountDAO } from "../../lib/database";
import { MoneyInput } from "../../components";
import type { Account, CreateAccountData, UpdateAccountData } from "../../types/entities";

const ACCOUNT_TYPES = [
  { value: "checking", label: "Conta Corrente", icon: "card" },
  { value: "savings", label: "Poupança", icon: "archive" },
  { value: "investment", label: "Investimento", icon: "trending-up" },
  { value: "credit_card", label: "Cartão de Crédito", icon: "card-outline" },
  { value: "cash", label: "Dinheiro", icon: "cash" },
] as const;

const ACCOUNT_COLORS = [
  "#3b82f6",
  "#ef4444",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
  "#f97316",
  "#6366f1",
  "#14b8a6",
  "#eab308",
];

export default function AccountFormScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [account, setAccount] = useState<Account | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [type, setType] = useState<string>("checking");
  const [initialBalance, setInitialBalance] = useState(0);
  const [color, setColor] = useState(ACCOUNT_COLORS[0]);
  const [isArchived, setIsArchived] = useState(false);

  // Validation
  const [errors, setErrors] = useState<Record<string, string>>({});

  const accountDAO = AccountDAO.getInstance();

  useEffect(() => {
    if (isEdit && id) {
      loadAccount(id as string);
    }
  }, [id, isEdit]);

  const loadAccount = async (accountId: string) => {
    try {
      setLoading(true);
      const accountData = await accountDAO.findById(accountId);
      if (accountData) {
        setAccount(accountData);
        setName(accountData.name);
        setType(accountData.type);
        setInitialBalance(accountData.initial_balance);
        setColor(accountData.color);
        setIsArchived(accountData.is_archived);
      }
    } catch (error) {
      console.error("Erro ao carregar conta:", error);
      Alert.alert("Erro", "Não foi possível carregar os dados da conta");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = "Nome é obrigatório";
    }

    if (!type) {
      newErrors.type = "Tipo é obrigatório";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      console.log("Salvando conta:", { isEdit, accountId: id });

      if (isEdit && account) {
        // Atualizar conta existente
        const selectedAccountType = ACCOUNT_TYPES.find((t) => t.value === type);
        const updateData: UpdateAccountData = {
          name: name.trim(),
          type: type as any,
          color,
          icon: selectedAccountType?.icon || "wallet",
          is_archived: isArchived,
        };

        console.log("Dados para atualização:", updateData);
        await accountDAO.update(account.id, updateData);
        Alert.alert("Sucesso", "Conta atualizada com sucesso");
      } else {
        // Criar nova conta
        const selectedAccountType = ACCOUNT_TYPES.find((t) => t.value === type);
        const accountData = {
          name: name.trim(),
          type: type as any,
          initial_balance: initialBalance,
          color,
          icon: selectedAccountType?.icon || "wallet",
          is_archived: false,
          description: undefined,
        };

        console.log("Dados para criação:", accountData);
        await accountDAO.create(accountData);
        Alert.alert("Sucesso", "Conta criada com sucesso");
      }

      router.back();
    } catch (error) {
      console.error("Erro ao salvar conta:", error);
      Alert.alert("Erro", "Não foi possível salvar a conta");
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEdit) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900">
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-600 dark:text-gray-400">Carregando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <View className="border-b border-gray-200 bg-white px-4 py-4 dark:border-gray-700 dark:bg-gray-800">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => router.back()} className="mr-4">
              <Ionicons name="arrow-back" size={24} className="text-gray-700 dark:text-gray-300" />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-gray-900 dark:text-white">
              {isEdit ? "Editar Conta" : "Nova Conta"}
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleSave}
            disabled={loading}
            className={`rounded-lg px-4 py-2 ${loading ? "bg-gray-400" : "bg-blue-500"}`}
          >
            <Text className="font-medium text-white">{loading ? "Salvando..." : "Salvar"}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1">
        <View className="space-y-6 p-4">
          {/* Nome */}
          <View>
            <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Nome da Conta *
            </Text>
            <TextInput
              className={`rounded-lg border bg-gray-100 px-3 py-3 text-base text-gray-900 dark:bg-gray-700 dark:text-white ${
                errors.name ? "border-red-500" : "border-gray-300 dark:border-gray-600"
              }`}
              value={name}
              onChangeText={setName}
              placeholder="Ex: Conta Corrente Principal"
              placeholderTextColor="#9ca3af"
            />
            {errors.name && <Text className="mt-1 text-sm text-red-500">{errors.name}</Text>}
          </View>

          {/* Tipo */}
          <View>
            <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Tipo de Conta *
            </Text>
            <View className="space-y-2">
              {ACCOUNT_TYPES.map((accountType) => (
                <TouchableOpacity
                  key={accountType.value}
                  onPress={() => setType(accountType.value)}
                  className={`flex-row items-center rounded-lg border p-3 ${
                    type === accountType.value
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30"
                      : "border-gray-300 bg-gray-100 dark:border-gray-600 dark:bg-gray-700"
                  }`}
                >
                  <Ionicons
                    name={accountType.icon as any}
                    size={20}
                    className={type === accountType.value ? "text-blue-500" : "text-gray-500"}
                  />
                  <Text
                    className={`ml-3 text-base ${
                      type === accountType.value
                        ? "font-medium text-blue-700 dark:text-blue-300"
                        : "text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {accountType.label}
                  </Text>
                  {type === accountType.value && (
                    <Ionicons name="checkmark" size={20} className="ml-auto text-blue-500" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Saldo Inicial (apenas para nova conta) */}
          {!isEdit && (
            <View>
              <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Saldo Inicial
              </Text>
              <MoneyInput
                value={initialBalance}
                onValueChange={setInitialBalance}
                placeholder="0,00"
              />
              <Text className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Digite o saldo atual desta conta
              </Text>
            </View>
          )}

          {/* Cor */}
          <View>
            <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Cor da Conta
            </Text>
            <View className="flex-row flex-wrap gap-3">
              {ACCOUNT_COLORS.map((accountColor) => (
                <TouchableOpacity
                  key={accountColor}
                  onPress={() => setColor(accountColor)}
                  className={`h-12 w-12 items-center justify-center rounded-full border-2 ${
                    color === accountColor
                      ? "border-gray-400 dark:border-gray-500"
                      : "border-transparent"
                  }`}
                  style={{ backgroundColor: accountColor }}
                >
                  {color === accountColor && <Ionicons name="checkmark" size={20} color="white" />}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Arquivar (apenas para edição) */}
          {isEdit && (
            <View>
              <TouchableOpacity
                onPress={() => setIsArchived(!isArchived)}
                className="flex-row items-center rounded-lg bg-gray-100 p-3 dark:bg-gray-700"
              >
                <Ionicons
                  name={isArchived ? "checkbox" : "square-outline"}
                  size={20}
                  className="mr-3 text-blue-500"
                />
                <View className="flex-1">
                  <Text className="text-base font-medium text-gray-900 dark:text-white">
                    Arquivar conta
                  </Text>
                  <Text className="text-sm text-gray-600 dark:text-gray-400">
                    Contas arquivadas não aparecem na lista principal
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
