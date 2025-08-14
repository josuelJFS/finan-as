import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { TransactionDAO, AccountDAO, CategoryDAO } from "../../lib/database";
import { MoneyInput, DatePicker, AccountSelector, CategorySelector } from "../../components";
import type { Transaction, TransactionType, Account, Category } from "../../types/entities";

interface TransactionFormData {
  type: TransactionType;
  account_id: string;
  destination_account_id: string;
  category_id: string;
  amount: number;
  description: string;
  notes: string;
  occurred_at: string;
}

interface FormErrors {
  account_id?: string;
  category_id?: string;
  amount?: string;
  description?: string;
  destination_account_id?: string;
}

export default function TransactionFormScreen() {
  const params = useLocalSearchParams();
  const transactionId = params.id as string;
  const isEditing = !!transactionId;
  const insets = useSafeAreaInsets();

  const [formData, setFormData] = useState<TransactionFormData>({
    type: "expense",
    account_id: "",
    destination_account_id: "",
    category_id: "",
    amount: 0,
    description: "",
    notes: "",
    occurred_at: new Date().toISOString(),
  });

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const transactionDAO = TransactionDAO.getInstance();
  const accountDAO = AccountDAO.getInstance();
  const categoryDAO = CategoryDAO.getInstance();

  useEffect(() => {
    loadInitialData();
    if (isEditing) {
      loadTransaction();
    }
  }, [transactionId]);

  const loadInitialData = async () => {
    try {
      const [accountsData, categoriesData] = await Promise.all([
        accountDAO.findAll(),
        categoryDAO.findAll(),
      ]);
      setAccounts(accountsData);
      setCategories(categoriesData);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      Alert.alert("Erro", "Não foi possível carregar os dados iniciais");
    }
  };

  const loadTransaction = async () => {
    try {
      const transaction = await transactionDAO.findById(transactionId);
      if (transaction) {
        setFormData({
          type: transaction.type,
          account_id: transaction.account_id,
          destination_account_id: transaction.destination_account_id || "",
          category_id: transaction.category_id || "",
          amount: transaction.amount,
          description: transaction.description,
          notes: transaction.notes || "",
          occurred_at: transaction.occurred_at,
        });
      }
    } catch (error) {
      console.error("Erro ao carregar transação:", error);
      Alert.alert("Erro", "Não foi possível carregar a transação");
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.account_id) {
      newErrors.account_id = "Conta é obrigatória";
    }

    if (formData.type === "transfer" && !formData.destination_account_id) {
      newErrors.destination_account_id = "Conta de destino é obrigatória para transferências";
    }

    if (formData.type === "transfer" && formData.account_id === formData.destination_account_id) {
      newErrors.destination_account_id = "Conta de destino deve ser diferente da conta de origem";
    }

    if (formData.type !== "transfer" && !formData.category_id) {
      newErrors.category_id = "Categoria é obrigatória";
    }

    if (formData.amount <= 0) {
      newErrors.amount = "Valor deve ser maior que zero";
    }

    if (!formData.description.trim()) {
      newErrors.description = "Descrição é obrigatória";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const transactionData = {
        type: formData.type,
        account_id: formData.account_id,
        destination_account_id:
          formData.type === "transfer" ? formData.destination_account_id : undefined,
        category_id: formData.type !== "transfer" ? formData.category_id : undefined,
        amount: formData.amount,
        description: formData.description.trim(),
        notes: formData.notes.trim() || undefined,
        occurred_at: formData.occurred_at,
        tags: undefined,
        attachment_path: undefined,
        recurrence_id: undefined,
        is_pending: false,
      };

      if (isEditing) {
        await transactionDAO.update(transactionId, transactionData);
      } else {
        await transactionDAO.create(transactionData);
      }

      router.back();
    } catch (error) {
      console.error("Erro ao salvar transação:", error);
      Alert.alert("Erro", "Não foi possível salvar a transação");
    } finally {
      setLoading(false);
    }
  };

  const bottomPadding = insets.bottom + 24; // espaço para botões dentro do scroll

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: bottomPadding }}
        keyboardShouldPersistTaps="handled"
      >
        <View>
          {/* Tipo de Transação */}
          <View className="mb-4">
            <Text className="mb-2 text-base font-medium text-gray-900 dark:text-white">
              Tipo de Transação
            </Text>
            <View className="flex-row overflow-hidden rounded-lg">
              <TouchableOpacity
                onPress={() =>
                  setFormData((prev) => ({
                    ...prev,
                    type: "expense",
                    category_id: "",
                    destination_account_id: "",
                  }))
                }
                className={`flex-1 p-3 ${
                  formData.type === "expense"
                    ? "bg-red-500"
                    : "border border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800"
                }`}
              >
                <Text
                  className={`text-center font-medium ${
                    formData.type === "expense" ? "text-white" : "text-gray-900 dark:text-white"
                  }`}
                >
                  Despesa
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() =>
                  setFormData((prev) => ({
                    ...prev,
                    type: "income",
                    category_id: "",
                    destination_account_id: "",
                  }))
                }
                className={`flex-1 p-3 ${
                  formData.type === "income"
                    ? "bg-green-500"
                    : "border border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800"
                }`}
              >
                <Text
                  className={`text-center font-medium ${
                    formData.type === "income" ? "text-white" : "text-gray-900 dark:text-white"
                  }`}
                >
                  Receita
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() =>
                  setFormData((prev) => ({ ...prev, type: "transfer", category_id: "" }))
                }
                className={`flex-1 p-3 ${
                  formData.type === "transfer"
                    ? "bg-blue-500"
                    : "border border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800"
                }`}
              >
                <Text
                  className={`text-center font-medium ${
                    formData.type === "transfer" ? "text-white" : "text-gray-900 dark:text-white"
                  }`}
                >
                  Transferência
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Conta */}
          <View className="mb-4">
            <Text className="mb-2 text-base font-medium text-gray-900 dark:text-white">
              {formData.type === "transfer" ? "Conta de Origem" : "Conta"}
            </Text>
            <AccountSelector
              selectedAccountId={formData.account_id}
              onAccountSelect={(account) =>
                setFormData((prev) => ({ ...prev, account_id: account.id }))
              }
              placeholder="Selecione uma conta"
            />
            {errors.account_id && (
              <Text className="mt-1 text-sm text-red-500">{errors.account_id}</Text>
            )}
          </View>

          {/* Conta de Destino (apenas para transferências) */}
          {formData.type === "transfer" && (
            <View className="mb-4">
              <Text className="mb-2 text-base font-medium text-gray-900 dark:text-white">
                Conta de Destino
              </Text>
              <AccountSelector
                selectedAccountId={formData.destination_account_id}
                onAccountSelect={(account) =>
                  setFormData((prev) => ({ ...prev, destination_account_id: account.id }))
                }
                placeholder="Selecione a conta de destino"
                excludeAccountId={formData.account_id}
              />
              {errors.destination_account_id && (
                <Text className="mt-1 text-sm text-red-500">{errors.destination_account_id}</Text>
              )}
            </View>
          )}

          {/* Categoria (não para transferências) */}
          {formData.type !== "transfer" && (
            <View className="mb-4">
              <Text className="mb-2 text-base font-medium text-gray-900 dark:text-white">
                Categoria
              </Text>
              <CategorySelector
                selectedCategoryId={formData.category_id}
                onCategorySelect={(category) =>
                  setFormData((prev) => ({ ...prev, category_id: category.id }))
                }
                transactionType={formData.type as "income" | "expense"}
                placeholder="Selecione uma categoria"
              />
              {errors.category_id && (
                <Text className="mt-1 text-sm text-red-500">{errors.category_id}</Text>
              )}
            </View>
          )}

          {/* Valor */}
          <View className="mb-4">
            <Text className="mb-2 text-base font-medium text-gray-900 dark:text-white">Valor</Text>
            <MoneyInput
              value={formData.amount}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, amount: value }))}
              placeholder="0,00"
            />
            {errors.amount && <Text className="mt-1 text-sm text-red-500">{errors.amount}</Text>}
          </View>

          {/* Descrição */}
          <View className="mb-4">
            <Text className="mb-2 text-base font-medium text-gray-900 dark:text-white">
              Descrição
            </Text>
            <TextInput
              value={formData.description}
              onChangeText={(text) => setFormData((prev) => ({ ...prev, description: text }))}
              placeholder="Descrição da transação"
              placeholderTextColor="#9ca3af"
              className={`rounded-lg border bg-white px-4 py-3 text-gray-900 dark:bg-gray-800 dark:text-white ${
                errors.description ? "border-red-500" : "border-gray-300 dark:border-gray-600"
              }`}
            />
            {errors.description && (
              <Text className="mt-1 text-sm text-red-500">{errors.description}</Text>
            )}
          </View>

          {/* Data */}
          <View className="mb-4">
            <Text className="mb-2 text-base font-medium text-gray-900 dark:text-white">Data</Text>
            <DatePicker
              value={new Date(formData.occurred_at)}
              onDateChange={(date) =>
                setFormData((prev) => ({ ...prev, occurred_at: date.toISOString() }))
              }
            />
          </View>

          {/* Observações */}
          <View className="mb-6">
            <Text className="mb-2 text-base font-medium text-gray-900 dark:text-white">
              Observações (Opcional)
            </Text>
            <TextInput
              value={formData.notes}
              onChangeText={(text) => setFormData((prev) => ({ ...prev, notes: text }))}
              placeholder="Observações adicionais..."
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={3}
              className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              style={{ textAlignVertical: "top" }}
            />
          </View>

          {/* Botões dentro do scroll */}
          <View className="mt-2 flex-row gap-3 border-t border-gray-200 pt-3 dark:border-gray-700">
            <TouchableOpacity
              onPress={() => router.back()}
              className="flex-1 rounded-md bg-gray-200 py-3 dark:bg-gray-700"
            >
              <Text className="text-center font-semibold text-gray-900 dark:text-white">
                Cancelar
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSave}
              disabled={loading}
              className={`flex-1 rounded-md py-3 ${
                loading ? "bg-gray-300 dark:bg-gray-600" : "bg-blue-500"
              }`}
            >
              <Text className="text-center font-semibold text-white">
                {loading ? "Salvando..." : isEditing ? "Atualizar" : "Criar"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

TransactionFormScreen.displayName = "TransactionFormScreen";
