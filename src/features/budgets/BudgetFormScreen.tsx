import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BudgetDAO, CategoryDAO } from "../../lib/database";
import { MoneyInput, DatePicker, CategorySelector } from "../../components";
import type { Budget, BudgetPeriodType, Category } from "../../types/entities";

interface BudgetFormData {
  name: string;
  category_id: string;
  amount: number;
  period_type: BudgetPeriodType;
  period_start: string;
  period_end: string;
  alert_percentage: number;
  is_active: boolean;
}

interface FormErrors {
  name?: string;
  amount?: string;
  period_start?: string;
  period_end?: string;
}

export default function BudgetFormScreen() {
  const params = useLocalSearchParams();
  const budgetId = params.id as string;
  const isEditing = !!budgetId;
  const insets = useSafeAreaInsets();

  const [formData, setFormData] = useState<BudgetFormData>({
    name: "",
    category_id: "",
    amount: 0,
    period_type: "monthly",
    period_start: new Date().toISOString().split("T")[0],
    period_end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
      .toISOString()
      .split("T")[0],
    alert_percentage: 80,
    is_active: true,
  });

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const budgetDAO = BudgetDAO.getInstance();
  const categoryDAO = CategoryDAO.getInstance();

  useEffect(() => {
    loadInitialData();
    if (isEditing) {
      loadBudget();
    }
  }, [budgetId]);

  const loadInitialData = async () => {
    try {
      const categoriesData = await categoryDAO.findAll();
      // Filtrar apenas categorias de despesa (raiz)
      const expenseCategories = categoriesData.filter(
        (cat) => cat.type === "expense" && !cat.parent_id
      );
      setCategories(expenseCategories);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      Alert.alert("Erro", "Não foi possível carregar os dados iniciais");
    }
  };

  const loadBudget = async () => {
    try {
      const budget = await budgetDAO.findById(budgetId);
      if (budget) {
        setFormData({
          name: budget.name,
          category_id: budget.category_id || "",
          amount: budget.amount,
          period_type: budget.period_type,
          period_start: budget.period_start.split("T")[0],
          period_end: budget.period_end.split("T")[0],
          alert_percentage: budget.alert_percentage,
          is_active: budget.is_active,
        });
      }
    } catch (error) {
      console.error("Erro ao carregar orçamento:", error);
      Alert.alert("Erro", "Não foi possível carregar o orçamento");
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Nome é obrigatório";
    }

    if (formData.amount <= 0) {
      newErrors.amount = "Valor deve ser maior que zero";
    }

    if (!formData.period_start) {
      newErrors.period_start = "Data de início é obrigatória";
    }

    if (!formData.period_end) {
      newErrors.period_end = "Data de fim é obrigatória";
    }

    if (formData.period_start && formData.period_end) {
      const start = new Date(formData.period_start);
      const end = new Date(formData.period_end);
      if (start >= end) {
        newErrors.period_end = "Data de fim deve ser posterior à data de início";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      const budgetData = {
        name: formData.name.trim(),
        category_id: formData.category_id || undefined,
        amount: formData.amount,
        period_type: formData.period_type,
        period_start: new Date(formData.period_start).toISOString(),
        period_end: new Date(formData.period_end + "T23:59:59").toISOString(),
        alert_percentage: formData.alert_percentage,
        is_active: formData.is_active,
      };

      if (isEditing) {
        await budgetDAO.update(budgetId, budgetData);
        Alert.alert("Sucesso", "Orçamento atualizado com sucesso!");
      } else {
        await budgetDAO.create(budgetData);
        Alert.alert("Sucesso", "Orçamento criado com sucesso!");
      }

      router.back();
    } catch (error) {
      console.error("Erro ao salvar orçamento:", error);
      Alert.alert("Erro", "Não foi possível salvar o orçamento");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  const handleDelete = () => {
    if (!isEditing) return;
    Alert.alert(
      "Excluir orçamento",
      "Tem certeza que deseja excluir este orçamento? Esta ação não pode ser desfeita.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              await budgetDAO.delete(budgetId);
              Alert.alert("Sucesso", "Orçamento excluído");
              router.back();
            } catch (error) {
              console.error("Erro ao excluir orçamento:", error);
              Alert.alert("Erro", "Não foi possível excluir o orçamento");
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const updateFormData = (field: keyof BudgetFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const bottomPadding = insets.bottom + 24;

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: bottomPadding }}
        keyboardShouldPersistTaps="handled"
      >
        <View>
          {/* Header */}
          <View className="mb-6">
            <Text className="text-2xl font-bold text-gray-900 dark:text-white">
              {isEditing ? "Editar Orçamento" : "Novo Orçamento"}
            </Text>
            <Text className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {isEditing
                ? "Atualize as informações do orçamento"
                : "Defina um limite de gastos para controlar suas finanças"}
            </Text>
          </View>

          {/* Nome */}
          <View className="mb-4">
            <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Nome do orçamento *
            </Text>
            <TextInput
              value={formData.name}
              onChangeText={(text) => updateFormData("name", text)}
              placeholder="Ex: Alimentação Mensal"
              className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              placeholderTextColor="#9CA3AF"
            />
            {errors.name && <Text className="mt-1 text-sm text-red-600">{errors.name}</Text>}
          </View>

          {/* Categoria */}
          <View className="mb-4">
            <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Categoria (opcional)
            </Text>
            <CategorySelector
              selectedCategoryId={formData.category_id}
              onCategorySelect={(category) => updateFormData("category_id", category.id)}
              transactionType="expense"
              placeholder="Todas as categorias"
            />
            <Text className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Deixe vazio para um orçamento geral
            </Text>
          </View>

          {/* Valor */}
          <View className="mb-4">
            <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Valor do orçamento *
            </Text>
            <MoneyInput
              value={formData.amount}
              onValueChange={(value) => updateFormData("amount", value)}
              placeholder="R$ 0,00"
            />
            {errors.amount && <Text className="mt-1 text-sm text-red-600">{errors.amount}</Text>}
          </View>

          {/* Tipo de período */}
          <View className="mb-4">
            <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Tipo de período
            </Text>
            <View className="flex-row space-x-2">
              {[
                { value: "monthly", label: "Mensal" },
                { value: "quarterly", label: "Trimestral" },
                { value: "yearly", label: "Anual" },
                { value: "custom", label: "Personalizado" },
              ].map((period) => (
                <TouchableOpacity
                  key={period.value}
                  onPress={() => updateFormData("period_type", period.value)}
                  className={`flex-1 rounded-lg border px-3 py-2 ${
                    formData.period_type === period.value
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                      : "border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800"
                  }`}
                >
                  <Text
                    className={`text-center text-sm ${
                      formData.period_type === period.value
                        ? "text-blue-700 dark:text-blue-300"
                        : "text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {period.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Período */}
          <View className="mb-4 flex-row space-x-4">
            <View className="flex-1">
              <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Data de início *
              </Text>
              <DatePicker
                value={new Date(formData.period_start)}
                onDateChange={(date) =>
                  updateFormData("period_start", date.toISOString().split("T")[0])
                }
              />
              {errors.period_start && (
                <Text className="mt-1 text-sm text-red-600">{errors.period_start}</Text>
              )}
            </View>

            <View className="flex-1">
              <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Data de fim *
              </Text>
              <DatePicker
                value={new Date(formData.period_end)}
                onDateChange={(date) =>
                  updateFormData("period_end", date.toISOString().split("T")[0])
                }
              />
              {errors.period_end && (
                <Text className="mt-1 text-sm text-red-600">{errors.period_end}</Text>
              )}
            </View>
          </View>

          {/* Alerta */}
          <View className="mb-4">
            <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Alerta quando atingir (%)
            </Text>
            <View className="flex-row space-x-2">
              {[70, 80, 90, 95].map((percentage) => (
                <TouchableOpacity
                  key={percentage}
                  onPress={() => updateFormData("alert_percentage", percentage)}
                  className={`flex-1 rounded-lg border px-3 py-2 ${
                    formData.alert_percentage === percentage
                      ? "border-orange-500 bg-orange-50 dark:bg-orange-900/20"
                      : "border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800"
                  }`}
                >
                  <Text
                    className={`text-center text-sm ${
                      formData.alert_percentage === percentage
                        ? "text-orange-700 dark:text-orange-300"
                        : "text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {percentage}%
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Status ativo */}
          <View className="mb-6">
            <TouchableOpacity
              onPress={() => updateFormData("is_active", !formData.is_active)}
              className="flex-row items-center"
            >
              <View
                className={`mr-3 h-6 w-6 items-center justify-center rounded ${
                  formData.is_active ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"
                }`}
              >
                {formData.is_active && <Ionicons name="checkmark" size={16} color="white" />}
              </View>
              <Text className="text-gray-700 dark:text-gray-300">Orçamento ativo</Text>
            </TouchableOpacity>
          </View>

          {/* Botões */}
          <View className="mt-2 flex-row gap-3 border-t border-gray-200 pt-3 dark:border-gray-700">
            {isEditing && (
              <TouchableOpacity
                onPress={handleDelete}
                disabled={loading}
                className={`rounded-md px-4 py-3 ${
                  loading ? "bg-red-300 dark:bg-red-700/50" : "bg-red-500"
                }`}
              >
                <Text className="font-semibold text-white">{loading ? "..." : "Excluir"}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={handleCancel}
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
