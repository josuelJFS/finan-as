import React from "react";
import { View, Text, TouchableOpacity, Modal, ScrollView, TextInput } from "react-native";
import type { TransactionFilters, Category } from "../types/entities";

export interface AdvancedFilterModalProps {
  visible: boolean;
  onClose: () => void;
  categories: Category[];
  tempSearch: string;
  setTempSearch: (v: string) => void;
  tempAmountMin: string;
  setTempAmountMin: (v: string) => void;
  tempAmountMax: string;
  setTempAmountMax: (v: string) => void;
  tempTags: string;
  setTempTags: (v: string) => void;
  tempPendingOnly: boolean;
  setTempPendingOnly: (b: boolean | ((p: boolean) => boolean)) => void;
  selectedCategoryIds: string[];
  setSelectedCategoryIds: (fn: (prev: string[]) => string[]) => void;
  onApply: () => void;
  onClear: () => void;
  tagsMode: "ANY" | "ALL";
  setTagsMode: (m: "ANY" | "ALL") => void;
  includeTransfers: boolean;
  setIncludeTransfers: (b: boolean) => void;
}

export const AdvancedFilterModal: React.FC<AdvancedFilterModalProps> = ({
  visible,
  onClose,
  categories,
  tempSearch,
  setTempSearch,
  tempAmountMin,
  setTempAmountMin,
  tempAmountMax,
  setTempAmountMax,
  tempTags,
  setTempTags,
  tempPendingOnly,
  setTempPendingOnly,
  selectedCategoryIds,
  setSelectedCategoryIds,
  onApply,
  onClear,
  tagsMode,
  setTagsMode,
  includeTransfers,
  setIncludeTransfers,
}) => {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View className="flex-1 justify-end bg-black/50">
        <View className="max-h-[85%] rounded-t-2xl bg-white p-4 dark:bg-gray-800">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-lg font-semibold text-gray-900 dark:text-white">
              Filtros Avançados
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Text className="text-sm text-blue-500">Fechar</Text>
            </TouchableOpacity>
          </View>
          <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
            <View className="mb-4">
              <Text className="mb-1 text-xs font-semibold text-gray-600 dark:text-gray-300">
                Texto (descrição/notas)
              </Text>
              <TextInput
                value={tempSearch}
                onChangeText={setTempSearch}
                placeholder="Buscar..."
                className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                placeholderTextColor="#9ca3af"
              />
            </View>
            <View className="mb-4 flex-row gap-3">
              <View className="flex-1">
                <Text className="mb-1 text-xs font-semibold text-gray-600 dark:text-gray-300">
                  Valor mín
                </Text>
                <TextInput
                  value={tempAmountMin}
                  onChangeText={setTempAmountMin}
                  keyboardType="numeric"
                  placeholder="0"
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                  placeholderTextColor="#9ca3af"
                />
              </View>
              <View className="flex-1">
                <Text className="mb-1 text-xs font-semibold text-gray-600 dark:text-gray-300">
                  Valor máx
                </Text>
                <TextInput
                  value={tempAmountMax}
                  onChangeText={setTempAmountMax}
                  keyboardType="numeric"
                  placeholder="0"
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                  placeholderTextColor="#9ca3af"
                />
              </View>
            </View>
            <View className="mb-4">
              <Text className="mb-1 text-xs font-semibold text-gray-600 dark:text-gray-300">
                Tags (separar por vírgula)
              </Text>
              <TextInput
                value={tempTags}
                onChangeText={setTempTags}
                placeholder="ex: viagem,imposto"
                className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                placeholderTextColor="#9ca3af"
              />
              {tempTags.trim().length > 0 && (
                <View className="mt-2 flex-row rounded-md bg-gray-100 p-1 dark:bg-gray-700">
                  {[
                    { v: "ANY", l: "Qualquer" },
                    { v: "ALL", l: "Todas" },
                  ].map((opt) => (
                    <TouchableOpacity
                      key={opt.v}
                      onPress={() => setTagsMode(opt.v as any)}
                      className={`flex-1 rounded-md py-1 ${
                        tagsMode === opt.v ? "bg-blue-500" : ""
                      }`}
                    >
                      <Text
                        className={`text-center text-[11px] font-medium ${
                          tagsMode === opt.v ? "text-white" : "text-gray-600 dark:text-gray-300"
                        }`}
                      >
                        {opt.l}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
            <View className="mb-4 flex-row items-center">
              <TouchableOpacity
                onPress={() => setTempPendingOnly((p: boolean) => !p)}
                className={`mr-3 h-6 w-6 items-center justify-center rounded border ${
                  tempPendingOnly
                    ? "border-yellow-500 bg-yellow-100 dark:border-yellow-400 dark:bg-yellow-600/30"
                    : "border-gray-400 bg-white dark:border-gray-600 dark:bg-gray-700"
                }`}
              >
                {tempPendingOnly && (
                  <Text className="text-xs font-bold text-yellow-700 dark:text-yellow-300">✓</Text>
                )}
              </TouchableOpacity>
              <Text className="text-sm text-gray-700 dark:text-gray-300">Somente pendentes</Text>
            </View>
            <View className="mb-4 flex-row items-center">
              <TouchableOpacity
                onPress={() => setIncludeTransfers(!includeTransfers)}
                className={`mr-3 h-6 w-6 items-center justify-center rounded border ${
                  includeTransfers
                    ? "border-green-500 bg-green-100 dark:border-green-400 dark:bg-green-600/30"
                    : "border-gray-400 bg-white dark:border-gray-600 dark:bg-gray-700"
                }`}
              >
                {includeTransfers && (
                  <Text className="text-xs font-bold text-green-700 dark:text-green-300">✓</Text>
                )}
              </TouchableOpacity>
              <Text className="text-sm text-gray-700 dark:text-gray-300">
                Incluir transferências
              </Text>
            </View>
            <View className="mb-4">
              <Text className="mb-2 text-xs font-semibold text-gray-600 dark:text-gray-300">
                Categorias
              </Text>
              {categories.map((cat) => {
                const active = selectedCategoryIds.includes(cat.id);
                return (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => {
                      setSelectedCategoryIds((prev) =>
                        prev.includes(cat.id) ? prev.filter((c) => c !== cat.id) : [...prev, cat.id]
                      );
                    }}
                    className={`mb-2 flex-row items-center rounded-lg border px-3 py-2 ${
                      active
                        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30"
                        : "border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-700"
                    }`}
                  >
                    <Text className="flex-1 text-sm font-medium text-gray-800 dark:text-gray-100">
                      {cat.name}
                    </Text>
                    {active && (
                      <Text className="text-xs font-semibold text-indigo-600 dark:text-indigo-300">
                        ✓
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
          <View className="mt-2 flex-row flex-wrap gap-3 pt-2">
            <TouchableOpacity
              onPress={onClear}
              className="flex-1 rounded-md bg-gray-200 py-3 dark:bg-gray-700"
            >
              <Text className="text-center font-semibold text-gray-900 dark:text-white">
                Limpar
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                // Reset rápido (fecha e limpa tudo)
                onClear();
                onClose();
              }}
              className="flex-1 rounded-md bg-gray-300 py-3 dark:bg-gray-600"
            >
              <Text className="text-center font-semibold text-gray-800 dark:text-gray-200">
                Reset Rápido
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onApply} className="flex-1 rounded-md bg-blue-500 py-3">
              <Text className="text-center font-semibold text-white">Aplicar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
