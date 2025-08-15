import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Alert,
  RefreshControl,
  TextInput,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Category } from "../../types/entities";
import { CategoryDAO } from "../../lib/database/CategoryDAO";

interface CategoryItem extends Category {
  children?: Category[];
}

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function CategoriesListScreen() {
  const insets = useSafeAreaInsets();
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "expense" | "income">("all");

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
      // Expandir por padrão as primeiras 2 para percepção inicial
      setExpanded((prev) => {
        const next = { ...prev };
        categoriesWithChildren.slice(0, 2).forEach((c) => {
          if (next[c.id] === undefined) next[c.id] = true;
        });
        return next;
      });
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

  const toggleExpand = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredCategories = useMemo(() => {
    let data = categories;
    if (typeFilter !== "all") data = data.filter((c) => c.type === typeFilter);
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      data = data
        .map((c) => ({
          ...c,
          children: c.children?.filter((ch) => ch.name.toLowerCase().includes(s)) || [],
        }))
        .filter((c) => c.name.toLowerCase().includes(s) || (c.children && c.children.length > 0));
    }
    return data;
  }, [categories, search, typeFilter]);

  const renderCategory = ({ item }: { item: CategoryItem }) => {
    const isExpanded = expanded[item.id];
    const childCount = item.children?.length || 0;
    return (
      <View className="mb-3 rounded-xl bg-white shadow-sm dark:bg-gray-800">
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`Categoria ${item.name}, ${item.type === "expense" ? "Despesa" : "Receita"}$${childCount ? ` com ${childCount} subcategorias` : ""}`}
          onPress={() => toggleExpand(item.id)}
          className="flex-row items-center px-4 py-3"
        >
          <View
            className="mr-3 h-11 w-11 items-center justify-center rounded-full"
            style={{ backgroundColor: item.color }}
          >
            {(() => {
              const iconId = item.icon;
              const hasPrefix = iconId?.includes(":");
              const [lib, name] = hasPrefix ? iconId.split(":") : ["ion", iconId];
              if (lib === "mci") {
                return <MaterialCommunityIcons name={name as any} size={24} color="#ffffff" />;
              }
              return <Ionicons name={name as any} size={24} color="#ffffff" />;
            })()}
          </View>
          <View className="flex-1">
            <Text className="text-base font-semibold text-gray-900 dark:text-white">
              {item.name}
            </Text>
            <View className="flex-row items-center">
              <Text
                className={`mr-2 text-xs font-medium ${
                  item.type === "expense" ? "text-red-500" : "text-green-500"
                }`}
              >
                {item.type === "expense" ? "Despesa" : "Receita"}
              </Text>
              {!!childCount && (
                <Text className="text-xs text-gray-500 dark:text-gray-400">
                  {childCount} sub{childCount > 1 ? "categorias" : "categoria"}
                </Text>
              )}
            </View>
          </View>
          <Ionicons
            name={isExpanded ? "chevron-up" : "chevron-down"}
            size={18}
            color="#6b7280"
            style={{ marginRight: 4 }}
          />
        </TouchableOpacity>
        {/* Ações rápidas */}
        <View className="flex-row border-t border-gray-100 px-3 py-2 dark:border-gray-700">
          <TouchableOpacity
            onPress={() => router.push(`/categories/${item.id}`)}
            className="mr-2 flex-row items-center rounded-md px-2 py-1"
          >
            <Ionicons name="pencil" size={14} color="#6b7280" />
            <Text className="ml-1 text-xs text-gray-600 dark:text-gray-400">Editar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push(`/categories/create?parent=${item.id}`)}
            className="mr-2 flex-row items-center rounded-md px-2 py-1"
          >
            <Ionicons name="add-circle" size={14} color="#2563eb" />
            <Text className="ml-1 text-xs text-blue-600 dark:text-blue-400">Subcategoria</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleDeleteCategory(item.id)}
            className="ml-auto flex-row items-center rounded-md px-2 py-1"
          >
            <Ionicons name="trash" size={14} color="#ef4444" />
            <Text className="ml-1 text-xs text-red-500">Excluir</Text>
          </TouchableOpacity>
        </View>
        {isExpanded && childCount > 0 && (
          <View className="border-t border-gray-100 px-4 py-3 dark:border-gray-700">
            {item.children?.map((child, idx) => (
              <View
                key={child.id}
                className={`flex-row items-center rounded-lg px-2 py-2 ${
                  idx !== childCount - 1 ? "mb-1" : ""
                } bg-gray-50 dark:bg-gray-700`}
              >
                <View
                  className="mr-3 h-7 w-7 items-center justify-center rounded-full"
                  style={{ backgroundColor: child.color }}
                >
                  {(() => {
                    const iconId = child.icon;
                    const hasPrefix = iconId?.includes(":");
                    const [lib, name] = hasPrefix ? iconId.split(":") : ["ion", iconId];
                    if (lib === "mci") {
                      return (
                        <MaterialCommunityIcons name={name as any} size={18} color="#ffffff" />
                      );
                    }
                    return <Ionicons name={name as any} size={18} color="#ffffff" />;
                  })()}
                </View>
                <Text className="flex-1 text-sm text-gray-800 dark:text-gray-100">
                  {child.name}
                </Text>
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
            ))}
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Text className="text-gray-500 dark:text-gray-400">Carregando categorias...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <View
        className="border-b border-gray-200 bg-white px-4 pb-3 dark:border-gray-700 dark:bg-gray-800"
        style={{ paddingTop: Math.max(insets.top, 12) }}
      >
        <View className="mb-3 flex-row items-center justify-between">
          <Text className="text-xl font-bold text-gray-900 dark:text-white">Categorias</Text>
          <TouchableOpacity
            onPress={() => router.push("/categories/create")}
            className="rounded-lg bg-blue-500 px-4 py-2"
          >
            <Text className="font-medium text-white">Adicionar</Text>
          </TouchableOpacity>
        </View>
        {/* Busca */}
        <View className="mb-2 flex-row items-center rounded-lg bg-gray-100 px-3 dark:bg-gray-700">
          <Ionicons name="search" size={16} color="#6b7280" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar..."
            placeholderTextColor="#9ca3af"
            className="ml-2 flex-1 py-2 text-sm text-gray-900 dark:text-white"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={16} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
        {/* Filtros tipo */}
        <View className="flex-row rounded-md bg-gray-100 p-1 dark:bg-gray-700">
          {(["all", "expense", "income"] as const).map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => setTypeFilter(t)}
              className={`flex-1 rounded-md py-1.5 ${
                typeFilter === t
                  ? t === "expense"
                    ? "bg-red-500"
                    : t === "income"
                      ? "bg-green-500"
                      : "bg-blue-500"
                  : ""
              }`}
            >
              <Text
                className={`text-center text-xs font-medium ${
                  typeFilter === t ? "text-white" : "text-gray-600 dark:text-gray-300"
                }`}
              >
                {t === "all" ? "Todas" : t === "expense" ? "Despesas" : "Receitas"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {filteredCategories.length === 0 ? (
        <View className="flex-1 items-center justify-center p-8">
          <Ionicons name="grid" size={56} color="#9ca3af" />
          <Text className="mt-4 text-center text-lg font-semibold text-gray-900 dark:text-white">
            {search || typeFilter !== "all" ? "Nenhum resultado" : "Nenhuma categoria"}
          </Text>
          <Text className="mb-5 mt-2 text-center text-gray-500 dark:text-gray-400">
            {search || typeFilter !== "all"
              ? "Ajuste filtros ou termo de busca"
              : "Crie sua primeira categoria para organizar suas transações"}
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
          data={filteredCategories}
          renderItem={renderCategory}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}
    </View>
  );
}
