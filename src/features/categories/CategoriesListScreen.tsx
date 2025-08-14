import React, { useState, useEffect, useCallback } from "react";
import { View, Text, TouchableOpacity, FlatList, Alert, RefreshControl } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Category } from "../../types/entities";
import { CategoryDAO } from "../../lib/database/CategoryDAO";

interface CategoryItem extends Category {
  children?: Category[];
}

export default function CategoriesListScreen() {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Recarregar quando a tela ganhar foco
  useFocusEffect(
    useCallback(() => {
      loadCategories();
    }, [])
  );

  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      const categoryDAO = CategoryDAO.getInstance();
      const allCategories = await categoryDAO.findAll();

      // Organizar em hierarquia
      const parentCategories = allCategories.filter((cat: Category) => !cat.parent_id);
      const categoriesWithChildren = parentCategories.map((parent: Category) => ({
        ...parent,
        children: allCategories.filter((cat: Category) => cat.parent_id === parent.id),
      }));

      setCategories(categoriesWithChildren);
    } catch (error) {
      console.error("Erro ao carregar categorias:", error);
      Alert.alert("Erro", "Não foi possível carregar as categorias");
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadCategories();
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadCategories();
  }, []);

  const handleDeleteCategory = (categoryId: string) => {
    Alert.alert(
      "Confirmar Exclusão",
      "Tem certeza que deseja excluir esta categoria? Esta ação não pode ser desfeita.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            try {
              const categoryDAO = CategoryDAO.getInstance();
              await categoryDAO.delete(categoryId);
              await loadCategories();
            } catch (error) {
              console.error("Erro ao excluir categoria:", error);
              Alert.alert("Erro", "Não foi possível excluir a categoria");
            }
          },
        },
      ]
    );
  };

  const renderCategory = ({ item }: { item: CategoryItem }) => (
    <View className="mb-4">
      {/* Categoria Pai */}
      <View className="mb-2 rounded-lg bg-white p-4 shadow-sm dark:bg-gray-800">
        <View className="flex-row items-center justify-between">
          <View className="flex-1 flex-row items-center">
            <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
              <Ionicons
                name={item.type === "expense" ? "remove" : "add"}
                size={20}
                color={item.type === "expense" ? "#ef4444" : "#10b981"}
              />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                {item.name}
              </Text>
              <Text className="text-sm capitalize text-gray-500 dark:text-gray-400">
                {item.type === "expense" ? "Despesa" : "Receita"}
              </Text>
            </View>
          </View>
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={() => router.push(`/categories/${item.id}`)}
              className="mr-2 p-2"
            >
              <Ionicons name="pencil" size={16} color="#6b7280" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDeleteCategory(item.id)} className="p-2">
              <Ionicons name="trash" size={16} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Subcategorias */}
      {item.children && item.children.length > 0 && (
        <View className="ml-4">
          {item.children.map((child) => (
            <View key={child.id} className="mb-2 rounded-lg bg-gray-50 p-3 dark:bg-gray-700">
              <View className="flex-row items-center justify-between">
                <View className="flex-1 flex-row items-center">
                  <View className="mr-3 h-6 w-6 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-600">
                    <View className="h-2 w-2 rounded-full bg-gray-400" />
                  </View>
                  <Text className="flex-1 text-base text-gray-800 dark:text-gray-200">
                    {child.name}
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <TouchableOpacity
                    onPress={() => router.push(`/categories/${child.id}`)}
                    className="mr-2 p-1"
                  >
                    <Ionicons name="pencil" size={14} color="#6b7280" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteCategory(child.id)} className="p-1">
                    <Ionicons name="trash" size={14} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Text className="text-gray-500 dark:text-gray-400">Carregando categorias...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <View className="flex-row items-center justify-between border-b border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <Text className="text-xl font-bold text-gray-900 dark:text-white">Categorias</Text>
        <TouchableOpacity
          onPress={() => router.push("/categories/create")}
          className="rounded-lg bg-blue-500 px-4 py-2"
        >
          <Text className="font-medium text-white">Adicionar</Text>
        </TouchableOpacity>
      </View>

      {categories.length === 0 ? (
        <View className="flex-1 items-center justify-center p-8">
          <Ionicons name="grid" size={64} color="#9ca3af" />
          <Text className="mt-4 text-center text-xl font-semibold text-gray-900 dark:text-white">
            Nenhuma categoria encontrada
          </Text>
          <Text className="mb-6 mt-2 text-center text-gray-500 dark:text-gray-400">
            Crie sua primeira categoria para organizar suas transações
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/categories/create")}
            className="rounded-lg bg-blue-500 px-6 py-3"
          >
            <Text className="font-semibold text-white">Criar Categoria</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={categories}
          renderItem={renderCategory}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </View>
  );
}
