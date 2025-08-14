import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { RecurrenceDAO } from "../../lib/database";
import type { Recurrence } from "../../types/entities";

export default function RecurrencesListScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [recurrences, setRecurrences] = useState<Recurrence[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const dao = RecurrenceDAO.getInstance();
      const rows = await dao.listAll();
      setRecurrences(rows);
    } catch (e: any) {
      setError(e.message || "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-gray-900">
        <ActivityIndicator />
        <Text className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          Carregando recorrências...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 p-4 dark:bg-gray-900">
        <Text className="mb-4 text-center text-sm text-red-600 dark:text-red-400">{error}</Text>
        <TouchableOpacity onPress={load} className="rounded-md bg-blue-500 px-4 py-2">
          <Text className="font-semibold text-white">Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (recurrences.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 p-6 dark:bg-gray-900">
        <Text className="mb-4 text-center text-gray-600 dark:text-gray-300">
          Nenhuma recorrência criada ainda.
        </Text>
        <TouchableOpacity
          className="rounded-md bg-blue-500 px-4 py-2"
          onPress={() => router.push("/recurrences/new")}
        >
          <Text className="font-semibold text-white">Criar recorrência</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <FlatList
        data={recurrences}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        renderItem={({ item }) => {
          return (
            <View className="mb-3 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <View className="mb-1 flex-row items-center justify-between">
                <Text className="text-base font-semibold text-gray-900 dark:text-white">
                  {item.name}
                </Text>
                {item.is_active ? (
                  <Text className="text-xs font-semibold text-green-600 dark:text-green-400">
                    ATIVA
                  </Text>
                ) : (
                  <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                    INATIVA
                  </Text>
                )}
              </View>
              <Text className="text-xs text-gray-500 dark:text-gray-400">
                Próxima: {item.next_occurrence}
              </Text>
              <Text className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                {item.description}
              </Text>
            </View>
          );
        }}
      />
      <TouchableOpacity
        className="absolute bottom-6 right-6 rounded-full bg-blue-600 px-5 py-4 shadow-lg dark:bg-blue-500"
        onPress={() => router.push("/recurrences/new")}
      >
        <Text className="font-bold text-white">+</Text>
      </TouchableOpacity>
    </View>
  );
}
