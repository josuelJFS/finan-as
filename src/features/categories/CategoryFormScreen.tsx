import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Category, TransactionType } from "../../types/entities";
import { CategoryDAO } from "../../lib/database/CategoryDAO";

interface CategoryFormData {
  name: string;
  type: TransactionType;
  parent_id: string | null;
  color: string;
  icon: string;
  description: string;
}

interface FormErrors {
  name?: string;
  type?: string;
}

const CATEGORY_COLORS = [
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#eab308",
  "#84cc16",
  "#22c55e",
  "#10b981",
  "#14b8a6",
  "#06b6d4",
  "#0ea5e9",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#d946ef",
  "#ec4899",
  "#f43f5e",
  "#64748b",
  "#6b7280",
  "#374151",
];

const CATEGORY_ICONS = [
  "restaurant",
  "car",
  "home",
  "medical",
  "school",
  "game-controller",
  "shirt",
  "gift",
  "airplane",
  "fitness",
  "card",
  "wallet",
  "briefcase",
  "trending-up",
  "library",
  "musical-notes",
  "basket",
  "bus",
  "call",
  "coffee",
];

export default function CategoryFormScreen() {
  const params = useLocalSearchParams();
  const categoryId = params.id as string;
  const isEditing = !!categoryId;

  const [formData, setFormData] = useState<CategoryFormData>({
    name: "",
    type: "expense",
    parent_id: null,
    color: CATEGORY_COLORS[0],
    icon: CATEGORY_ICONS[0],
    description: "",
  });

  const [parentCategories, setParentCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    loadParentCategories();
    if (isEditing) {
      loadCategory();
    }
  }, [categoryId]);

  const loadParentCategories = async () => {
    try {
      const categoryDAO = CategoryDAO.getInstance();
      const categories = await categoryDAO.findParentCategories();
      setParentCategories(categories);
    } catch (error) {
      console.error("Erro ao carregar categorias pai:", error);
    }
  };

  const loadCategory = async () => {
    try {
      const categoryDAO = CategoryDAO.getInstance();
      const category = await categoryDAO.findById(categoryId);
      if (category) {
        setFormData({
          name: category.name,
          type: category.type,
          parent_id: category.parent_id || null,
          color: category.color,
          icon: category.icon,
          description: category.description || "",
        });
      }
    } catch (error) {
      console.error("Erro ao carregar categoria:", error);
      Alert.alert("Erro", "Não foi possível carregar a categoria");
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Nome é obrigatório";
    }

    if (!formData.type) {
      newErrors.type = "Tipo é obrigatório";
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
      const categoryDAO = CategoryDAO.getInstance();

      if (isEditing) {
        await categoryDAO.update(categoryId, {
          name: formData.name.trim(),
          type: formData.type,
          parent_id: formData.parent_id || undefined,
          color: formData.color,
          icon: formData.icon,
          description: formData.description.trim() || undefined,
        });
      } else {
        await categoryDAO.create({
          name: formData.name.trim(),
          type: formData.type,
          parent_id: formData.parent_id || undefined,
          color: formData.color,
          icon: formData.icon,
          is_system: false,
          description: formData.description.trim() || undefined,
        });
      }

      router.back();
    } catch (error) {
      console.error("Erro ao salvar categoria:", error);
      Alert.alert("Erro", "Não foi possível salvar a categoria");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-gray-50 dark:bg-gray-900">
      <View className="p-4">
        {/* Nome */}
        <View className="mb-4">
          <Text className="mb-2 text-base font-medium text-gray-900 dark:text-white">
            Nome da Categoria
          </Text>
          <TextInput
            value={formData.name}
            onChangeText={(text) => setFormData((prev) => ({ ...prev, name: text }))}
            placeholder="Ex: Alimentação, Transporte..."
            placeholderTextColor="#9ca3af"
            className={`rounded-lg border bg-white px-4 py-3 text-gray-900 dark:bg-gray-800 dark:text-white ${
              errors.name ? "border-red-500" : "border-gray-300 dark:border-gray-600"
            }`}
          />
          {errors.name && <Text className="mt-1 text-sm text-red-500">{errors.name}</Text>}
        </View>

        {/* Tipo */}
        <View className="mb-4">
          <Text className="mb-2 text-base font-medium text-gray-900 dark:text-white">Tipo</Text>
          <View className="flex-row">
            <TouchableOpacity
              onPress={() => setFormData((prev) => ({ ...prev, type: "expense" }))}
              className={`flex-1 rounded-l-lg border-b border-l border-t p-3 ${
                formData.type === "expense"
                  ? "border-red-500 bg-red-500"
                  : "border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800"
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
              onPress={() => setFormData((prev) => ({ ...prev, type: "income" }))}
              className={`flex-1 rounded-r-lg border-b border-r border-t p-3 ${
                formData.type === "income"
                  ? "border-green-500 bg-green-500"
                  : "border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800"
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
          </View>
        </View>

        {/* Categoria Pai */}
        <View className="mb-4">
          <Text className="mb-2 text-base font-medium text-gray-900 dark:text-white">
            Categoria Pai (Opcional)
          </Text>
          <View className="rounded-lg border border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800">
            <TouchableOpacity
              onPress={() => setFormData((prev) => ({ ...prev, parent_id: null }))}
              className={`border-b border-gray-200 p-3 dark:border-gray-700 ${
                !formData.parent_id ? "bg-blue-50 dark:bg-blue-900/20" : ""
              }`}
            >
              <Text
                className={`${
                  !formData.parent_id
                    ? "font-medium text-blue-600 dark:text-blue-400"
                    : "text-gray-900 dark:text-white"
                }`}
              >
                Nenhuma (Categoria principal)
              </Text>
            </TouchableOpacity>
            {parentCategories
              .filter((cat) => cat.type === formData.type && cat.id !== categoryId)
              .map((category) => (
                <TouchableOpacity
                  key={category.id}
                  onPress={() => setFormData((prev) => ({ ...prev, parent_id: category.id }))}
                  className={`border-b border-gray-200 p-3 last:border-b-0 dark:border-gray-700 ${
                    formData.parent_id === category.id ? "bg-blue-50 dark:bg-blue-900/20" : ""
                  }`}
                >
                  <View className="flex-row items-center">
                    <View
                      className="mr-3 h-4 w-4 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <Text
                      className={`${
                        formData.parent_id === category.id
                          ? "font-medium text-blue-600 dark:text-blue-400"
                          : "text-gray-900 dark:text-white"
                      }`}
                    >
                      {category.name}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
          </View>
        </View>

        {/* Cor */}
        <View className="mb-4">
          <Text className="mb-2 text-base font-medium text-gray-900 dark:text-white">Cor</Text>
          <View className="flex-row flex-wrap gap-2">
            {CATEGORY_COLORS.map((color) => (
              <TouchableOpacity
                key={color}
                onPress={() => setFormData((prev) => ({ ...prev, color }))}
                className={`h-10 w-10 rounded-full border-2 ${
                  formData.color === color
                    ? "border-gray-900 dark:border-white"
                    : "border-transparent"
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </View>
        </View>

        {/* Ícone */}
        <View className="mb-4">
          <Text className="mb-2 text-base font-medium text-gray-900 dark:text-white">Ícone</Text>
          <View className="flex-row flex-wrap gap-2">
            {CATEGORY_ICONS.map((icon) => (
              <TouchableOpacity
                key={icon}
                onPress={() => setFormData((prev) => ({ ...prev, icon }))}
                className={`h-12 w-12 items-center justify-center rounded-lg border-2 ${
                  formData.icon === icon
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                    : "border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800"
                }`}
              >
                <Ionicons
                  name={icon as any}
                  size={20}
                  color={formData.icon === icon ? "#3b82f6" : "#6b7280"}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Descrição */}
        <View className="mb-6">
          <Text className="mb-2 text-base font-medium text-gray-900 dark:text-white">
            Descrição (Opcional)
          </Text>
          <TextInput
            value={formData.description}
            onChangeText={(text) => setFormData((prev) => ({ ...prev, description: text }))}
            placeholder="Descrição da categoria..."
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={3}
            className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            style={{ textAlignVertical: "top" }}
          />
        </View>

        {/* Botões */}
        <View className="flex-row gap-3">
          <TouchableOpacity
            onPress={() => router.back()}
            className="flex-1 rounded-lg bg-gray-200 py-3 dark:bg-gray-700"
          >
            <Text className="text-center font-semibold text-gray-900 dark:text-white">
              Cancelar
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSave}
            disabled={loading}
            className={`flex-1 rounded-lg py-3 ${
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
  );
}
