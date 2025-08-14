import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, Modal, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CategoryDAO } from "../lib/database";
import type { Category } from "../types/entities";

interface CategorySelectorProps {
  selectedCategoryId?: string;
  onCategorySelect: (category: Category) => void;
  transactionType?: "income" | "expense";
  label?: string;
  placeholder?: string;
  className?: string;
  error?: string;
}

export function CategorySelector({
  selectedCategoryId,
  onCategorySelect,
  transactionType,
  label,
  placeholder = "Selecione uma categoria",
  className = "",
  error,
}: CategorySelectorProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const categoryDAO = CategoryDAO.getInstance();

  useEffect(() => {
    let isMounted = true;

    const attemptLoad = async (attempt = 1) => {
      if (!isMounted) return;
      try {
        await loadCategories();
      } catch (err) {
        // Se for erro de prepareAsync / NPE, tentar novamente algumas vezes
        const message = String(err);
        const transient = /prepareAsync|NullPointerException/i.test(message);
        if (transient && attempt < 5) {
          const delay = 100 * attempt; // backoff linear simples
          console.warn(
            `CategorySelector: tentativa ${attempt} falhou (transient). Retentando em ${delay}ms...`
          );
          setTimeout(() => attemptLoad(attempt + 1), delay);
        } else if (transient) {
          console.error(
            "CategorySelector: falha após múltiplas tentativas ao carregar categorias",
            err
          );
        }
      }
    };

    attemptLoad();
    return () => {
      isMounted = false;
    };
  }, [transactionType]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      if (__DEV__) console.log("[CategorySelector] carregando categorias");

      const allCategories = await categoryDAO.findAll();
      if (__DEV__) console.log("[CategorySelector] categorias carregadas", allCategories.length);
      if (__DEV__) console.log("[CategorySelector] lista", allCategories);

      // Filtrar por tipo de transação se especificado
      const filteredCategories = transactionType
        ? allCategories.filter((category) => category.type === transactionType)
        : allCategories;

      if (__DEV__)
        console.log(
          "[CategorySelector] filtradas",
          filteredCategories.length,
          "tipo",
          transactionType
        );
      if (__DEV__) console.log("[CategorySelector] categorias filtradas lista", filteredCategories);
      setCategories(filteredCategories);
    } catch (error) {
      console.error("CategorySelector: Erro ao carregar categorias:", error);
      throw error; // propaga para mecanismo de retry
    } finally {
      setLoading(false);
    }
  };

  const selectedCategory = categories.find((category) => category.id === selectedCategoryId);

  const getCategoryIcon = (name: string) => {
    const iconMap: { [key: string]: string } = {
      Alimentação: "restaurant",
      Transporte: "car",
      Saúde: "medical",
      Educação: "school",
      Entretenimento: "game-controller",
      Casa: "home",
      Roupas: "shirt",
      Salário: "card",
      Freelance: "laptop",
      Investimentos: "trending-up",
      Presente: "gift",
      Outros: "ellipsis-horizontal",
    };

    return iconMap[name] || "pricetag";
  };

  const getCategoryColor = (type: string) => {
    return type === "income" ? "#10b981" : "#ef4444";
  };

  const getTypeLabel = (type: string) => {
    return type === "income" ? "Receita" : "Despesa";
  };

  // Agrupar categorias por tipo
  const groupedCategories = categories.reduce(
    (groups, category) => {
      const type = category.type;
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(category);
      return groups;
    },
    {} as Record<string, Category[]>
  );

  return (
    <View className={className}>
      {label && (
        <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">{label}</Text>
      )}

      <TouchableOpacity
        onPress={() => {
          if (__DEV__) console.log("[CategorySelector] abrir modal");
          setShowModal(true);
        }}
        className={`flex-row items-center justify-between rounded-lg border bg-gray-100 px-3 py-3 dark:bg-gray-700 ${
          error ? "border-red-500" : "border-gray-300 dark:border-gray-600"
        }`}
      >
        {selectedCategory ? (
          <View className="flex-1 flex-row items-center">
            <View
              className="mr-3 h-8 w-8 items-center justify-center rounded-full"
              style={{ backgroundColor: getCategoryColor(selectedCategory.type) }}
            >
              <Ionicons
                name={getCategoryIcon(selectedCategory.name) as any}
                size={16}
                color="white"
              />
            </View>
            <View className="flex-1">
              <Text className="text-base font-medium text-gray-900 dark:text-white">
                {selectedCategory.name}
              </Text>
              <Text className="text-sm text-gray-600 dark:text-gray-400">
                {getTypeLabel(selectedCategory.type)}
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
          <View
            className="rounded-t-xl bg-white dark:bg-gray-800"
            style={{ maxHeight: 520, width: "100%", alignSelf: "stretch" }}
          >
            {/* Header */}
            <View className="flex-row items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
              <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                Selecionar Categoria
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} className="text-gray-500" />
              </TouchableOpacity>
            </View>
            {/* Lista de categorias */}
            <ScrollView
              style={{ maxHeight: 470 }}
              contentContainerStyle={{ paddingBottom: 24 }}
              onLayout={(e) => {
                if (__DEV__)
                  console.log(
                    "[CategorySelector] layout height=",
                    e.nativeEvent.layout.height,
                    "categories=",
                    categories.length
                  );
              }}
            >
              {loading ? (
                <View className="items-center p-8">
                  <Text className="text-gray-600 dark:text-gray-400">Carregando categorias...</Text>
                </View>
              ) : Object.keys(groupedCategories).length > 0 ? (
                <View className="p-4">
                  <Text className="mb-2 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    {categories.length} categoria(s)
                  </Text>
                  {Object.entries(groupedCategories).map(([type, typeCategories]) => (
                    <View key={type} className="mb-6">
                      <Text className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
                        {getTypeLabel(type)}
                      </Text>

                      {typeCategories.map((category) => (
                        <TouchableOpacity
                          key={category.id}
                          onPress={() => {
                            onCategorySelect(category);
                            setShowModal(false);
                          }}
                          className="flex-row items-center rounded-lg px-2 py-3 active:bg-gray-100 dark:active:bg-gray-700"
                        >
                          <View
                            className="mr-3 h-10 w-10 items-center justify-center rounded-full"
                            style={{ backgroundColor: getCategoryColor(category.type) }}
                          >
                            <Ionicons
                              name={getCategoryIcon(category.name) as any}
                              size={20}
                              color="white"
                            />
                          </View>

                          <View className="flex-1">
                            <Text className="text-base font-medium text-gray-900 dark:text-white">
                              {category.name}
                            </Text>
                          </View>

                          {selectedCategoryId === category.id && (
                            <Ionicons name="checkmark" size={20} className="ml-2 text-blue-500" />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  ))}
                </View>
              ) : (
                <View className="items-center p-8">
                  <Ionicons name="pricetag-outline" size={48} className="mb-4 text-gray-400" />
                  <Text className="text-center text-gray-600 dark:text-gray-400">
                    Nenhuma categoria encontrada.{"\n"}
                    {transactionType
                      ? `Crie uma categoria de ${getTypeLabel(transactionType).toLowerCase()} primeiro.`
                      : "Crie uma categoria primeiro."}
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
