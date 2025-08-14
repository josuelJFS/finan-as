import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import type { TransactionFilters, Transaction } from "../types/entities";

export interface FilterChipsProps {
  rangeKey: string;
  setRangeKey: (k: string) => void;
  applyRange: (k: string) => void;
  filters: TransactionFilters;
  toggleType: (type: Transaction["type"]) => void;
  openAccounts: () => void;
  openAdvanced: () => void;
  clearFilters: () => void;
  activeFiltersCount: number;
}

export const FilterChips: React.FC<FilterChipsProps> = ({
  rangeKey,
  setRangeKey,
  applyRange,
  filters,
  toggleType,
  openAccounts,
  openAdvanced,
  clearFilters,
  activeFiltersCount,
}) => {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-4">
      <View className="flex-row items-center">
        {[
          { key: "month", label: "Mês" },
          { key: "lastMonth", label: "Mês Anterior" },
          { key: "7d", label: "7d" },
          { key: "30d", label: "30d" },
        ].map((r) => (
          <TouchableOpacity
            key={r.key}
            onPress={() => applyRange(r.key)}
            className={`mr-2 rounded-full border px-4 py-2 ${
              rangeKey === r.key
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30"
                : "border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-700"
            }`}
          >
            <Text
              className={`text-xs font-medium ${
                rangeKey === r.key
                  ? "text-blue-700 dark:text-blue-300"
                  : "text-gray-700 dark:text-gray-300"
              }`}
            >
              {r.label}
            </Text>
          </TouchableOpacity>
        ))}

        {[
          { key: "income", label: "+" },
          { key: "expense", label: "-" },
          { key: "transfer", label: "⇄" },
        ].map((t) => (
          <TouchableOpacity
            key={t.key}
            onPress={() => toggleType(t.key as any)}
            className={`mr-2 rounded-full border px-3 py-2 ${
              filters.transaction_types?.includes(t.key as any)
                ? "border-purple-500 bg-purple-50 dark:bg-purple-900/30"
                : "border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-700"
            }`}
          >
            <Text
              className={`text-xs font-semibold ${
                filters.transaction_types?.includes(t.key as any)
                  ? "text-purple-700 dark:text-purple-300"
                  : "text-gray-700 dark:text-gray-300"
              }`}
            >
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          onPress={openAccounts}
          className={`mr-2 flex-row items-center rounded-full border px-4 py-2 ${
            filters.account_ids?.length
              ? "border-green-500 bg-green-50 dark:bg-green-900/30"
              : "border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-700"
          }`}
        >
          <Text
            className={`text-xs font-medium ${
              filters.account_ids?.length
                ? "text-green-700 dark:text-green-300"
                : "text-gray-700 dark:text-gray-300"
            }`}
          >
            Contas{filters.account_ids?.length ? ` (${filters.account_ids.length})` : ""}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={openAdvanced}
          className={`mr-2 rounded-full border px-4 py-2 ${
            filters.search_text ||
            filters.amount_min !== undefined ||
            filters.amount_max !== undefined ||
            filters.tags?.length ||
            filters.category_ids?.length ||
            filters.is_pending !== undefined
              ? "border-purple-500 bg-purple-50 dark:bg-purple-900/30"
              : "border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-700"
          }`}
        >
          <Text
            className={`text-xs font-medium ${
              filters.search_text ||
              filters.amount_min !== undefined ||
              filters.amount_max !== undefined ||
              filters.tags?.length ||
              filters.category_ids?.length ||
              filters.is_pending !== undefined
                ? "text-purple-700 dark:text-purple-300"
                : "text-gray-700 dark:text-gray-300"
            }`}
          >
            Avançado
          </Text>
        </TouchableOpacity>

        {activeFiltersCount > 0 && (
          <TouchableOpacity
            onPress={clearFilters}
            className="mr-2 rounded-full border border-red-400 bg-red-50 px-4 py-2 dark:border-red-600 dark:bg-red-900/30"
          >
            <Text className="text-xs font-medium text-red-600 dark:text-red-300">Limpar</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
};
