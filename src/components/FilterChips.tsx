import React, { useMemo } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import type { TransactionFilters, Transaction } from "../types/entities";
import {
  countActiveFilters,
  buildFiltersAccessibilityLabel,
} from "../features/transactions/filtersUtil";

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
  includeTransfers: boolean;
  toggleIncludeTransfers: () => void;
  openPresets: () => void;
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
  includeTransfers,
  toggleIncludeTransfers,
  openPresets,
}) => {
  const computedActive = useMemo(() => countActiveFilters(filters), [filters]);
  const accessibilitySummary = useMemo(() => buildFiltersAccessibilityLabel(filters), [filters]);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-4">
      <View className="flex-row items-center">
        <TouchableOpacity
          onPress={openPresets}
          className="mr-2 rounded-full border border-primary-400 bg-primary-50 px-4 py-2 dark:border-primary-600 dark:bg-primary-900/30"
          accessibilityLabel={`Selecionar presets de período e tipos. ${accessibilitySummary}`}
        >
          <Text className="text-xs font-medium text-primary-700 dark:text-primary-300">
            {(() => {
              const labels: Record<string, string> = {
                today: "Hoje",
                week: "Semana",
                month: "Mês",
                lastMonth: "Mês Ant.",
                "7d": "7d",
                "30d": "30d",
              };
              return labels[rangeKey] || "Presets";
            })()}
          </Text>
        </TouchableOpacity>

        {/* Chip resumo compacto dos filtros avançados */}
        {(filters.search_text ||
          filters.amount_min !== undefined ||
          filters.amount_max !== undefined ||
          filters.tags?.length ||
          filters.category_ids?.length ||
          filters.is_pending !== undefined ||
          filters.include_transfers === false) &&
          (() => {
            const parts: string[] = [];
            if (filters.category_ids?.length) parts.push(`cat${filters.category_ids.length}`);
            if (filters.tags?.length)
              parts.push(`tags${filters.tags.length}${filters.tags_mode === "ALL" ? "*" : ""}`);
            if (filters.amount_min !== undefined || filters.amount_max !== undefined) {
              if (filters.amount_min !== undefined && filters.amount_max !== undefined) {
                parts.push(`${filters.amount_min}-${filters.amount_max}`);
              } else if (filters.amount_min !== undefined) {
                parts.push(`≥${filters.amount_min}`);
              } else if (filters.amount_max !== undefined) {
                parts.push(`≤${filters.amount_max}`);
              }
            }
            if (filters.search_text) parts.push("txt");
            if (filters.is_pending !== undefined) parts.push("pend");
            if (filters.include_transfers === false) parts.push("-transf");
            let label = parts.slice(0, 4).join(" · ");
            if (parts.length > 4) label += " +" + (parts.length - 4);
            if (label.length > 24) {
              label = label.substring(0, 23) + "…";
            }
            return (
              <View
                className="mr-2 rounded-full border border-primary-300 bg-primary-50 px-3 py-2 dark:border-primary-600 dark:bg-primary-900/30"
                accessibilityLabel={`Resumo filtros avançados: ${accessibilitySummary}`}
              >
                <Text className="text-[10px] font-medium text-primary-700 dark:text-primary-300">
                  {label}
                </Text>
              </View>
            );
          })()}

        {/* Chip de tipos selecionados (se houver) */}
        {filters.transaction_types && filters.transaction_types.length > 0 && (
          <View className="mr-2 rounded-full border border-primary-400 bg-primary-50 px-3 py-2 dark:border-primary-600 dark:bg-primary-900/30">
            <Text className="text-[10px] font-medium text-primary-700 dark:text-primary-300">
              {filters.transaction_types
                .map((t) => (t === "income" ? "+" : t === "expense" ? "-" : "⇄"))
                .join("")}
            </Text>
          </View>
        )}

        <TouchableOpacity
          onPress={openAccounts}
          className={`mr-2 flex-row items-center rounded-full border px-4 py-2 ${
            filters.account_ids?.length
              ? "border-primary-500 bg-primary-50 dark:bg-primary-900/30"
              : "border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-700"
          }`}
          accessibilityLabel={
            filters.account_ids?.length
              ? `Filtrar contas: ${filters.account_ids.length} selecionadas`
              : "Filtrar por contas"
          }
        >
          <Text
            className={`text-xs font-medium ${
              filters.account_ids?.length
                ? "text-primary-700 dark:text-primary-300"
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
            filters.is_pending !== undefined ||
            filters.include_transfers === false ||
            (filters.tags?.length && filters.tags_mode === "ALL")
              ? "border-primary-500 bg-primary-50 dark:bg-primary-900/30"
              : "border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-700"
          }`}
          accessibilityLabel={`Abrir filtros avançados. ${accessibilitySummary}`}
        >
          <Text
            className={`text-xs font-medium ${
              filters.search_text ||
              filters.amount_min !== undefined ||
              filters.amount_max !== undefined ||
              filters.tags?.length ||
              filters.category_ids?.length ||
              filters.is_pending !== undefined ||
              filters.include_transfers === false ||
              (filters.tags?.length && filters.tags_mode === "ALL")
                ? "text-primary-700 dark:text-primary-300"
                : "text-gray-700 dark:text-gray-300"
            }`}
          >
            Avançado{computedActive ? ` (${computedActive})` : ""}
          </Text>
        </TouchableOpacity>

        {filters.tags?.length && filters.tags_mode === "ALL" && (
          <View className="mr-2 rounded-full border border-primary-400 bg-primary-50 px-3 py-2 dark:border-primary-600 dark:bg-primary-900/30">
            <Text className="text-[10px] font-medium text-primary-700 dark:text-primary-300">
              Tags ALL
            </Text>
          </View>
        )}
        {filters.include_transfers === false && (
          <View className="mr-2 rounded-full border border-red-400 bg-red-50 px-3 py-2 dark:border-red-600 dark:bg-red-900/30">
            <Text className="text-[10px] font-medium text-red-600 dark:text-red-300">-Transf</Text>
          </View>
        )}

        <TouchableOpacity
          onPress={toggleIncludeTransfers}
          className={`mr-2 rounded-full border px-3 py-2 ${
            includeTransfers
              ? "border-primary-400 bg-primary-50 dark:border-primary-600 dark:bg-primary-900/30"
              : "border-red-400 bg-red-50 dark:border-red-600 dark:bg-red-900/30"
          }`}
        >
          <Text
            className={`text-[10px] font-medium ${
              includeTransfers
                ? "text-primary-700 dark:text-primary-300"
                : "text-red-600 dark:text-red-300"
            }`}
          >
            {includeTransfers ? "Com Transf." : "Sem Transf."}
          </Text>
        </TouchableOpacity>

        {(activeFiltersCount > 0 || computedActive > 0) && (
          <TouchableOpacity
            onPress={clearFilters}
            className="mr-2 rounded-full border border-red-400 bg-red-50 px-4 py-2 dark:border-red-600 dark:bg-red-900/30"
            accessibilityLabel="Limpar todos os filtros ativos"
          >
            <Text className="text-xs font-medium text-red-600 dark:text-red-300">Limpar</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
};
