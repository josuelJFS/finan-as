import React from "react";
import { Modal, View, Text, TouchableOpacity, ScrollView } from "react-native";
import type { TransactionFilters } from "../types/entities";

interface PresetsModalProps {
  visible: boolean;
  onClose: () => void;
  rangeKey: string;
  applyRange: (k: string) => void;
  filters: TransactionFilters;
  applyTypes: (types: TransactionFilters["transaction_types"]) => void;
  clearTypes: () => void;
}

export const PresetsModal: React.FC<PresetsModalProps> = ({
  visible,
  onClose,
  rangeKey,
  applyRange,
  filters,
  applyTypes,
  clearTypes,
}) => {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View className="flex-1 justify-end bg-black/50">
        <View className="max-h-[65%] rounded-t-2xl bg-white p-4 dark:bg-gray-800">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-lg font-semibold text-gray-900 dark:text-white">Presets</Text>
            <TouchableOpacity onPress={onClose} accessibilityLabel="Fechar modal de presets">
              <Text className="text-sm text-blue-500">Fechar</Text>
            </TouchableOpacity>
          </View>
          <ScrollView>
            <Text className="mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
              Intervalos Rápidos
            </Text>
            {[
              { k: "today", l: "Hoje" },
              { k: "week", l: "Semana" },
              { k: "month", l: "Mês Atual" },
              { k: "lastMonth", l: "Mês Anterior" },
              { k: "7d", l: "Últimos 7 dias" },
              { k: "30d", l: "Últimos 30 dias" },
            ].map((r) => (
              <TouchableOpacity
                key={r.k}
                onPress={() => {
                  applyRange(r.k);
                  onClose();
                }}
                className={`mb-2 rounded-md border px-3 py-2 ${
                  rangeKey === r.k
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30"
                    : "border-gray-300 dark:border-gray-600"
                }`}
                accessibilityLabel={`Aplicar intervalo ${r.l}`}
              >
                <Text
                  className={`text-sm ${
                    rangeKey === r.k
                      ? "text-blue-700 dark:text-blue-300"
                      : "text-gray-700 dark:text-gray-300"
                  }`}
                >
                  {r.l}
                </Text>
              </TouchableOpacity>
            ))}
            <Text className="mb-2 mt-4 text-xs font-semibold text-gray-500 dark:text-gray-400">
              Tipos Rápidos
            </Text>
            {[
              { t: ["income"] as const, l: "Somente Receitas" },
              { t: ["expense"] as const, l: "Somente Despesas" },
              { t: ["transfer"] as const, l: "Somente Transferências" },
              { t: ["income", "expense"] as const, l: "+ e - (sem transfer)" },
            ].map((p) => (
              <TouchableOpacity
                key={p.l}
                onPress={() => {
                  applyTypes(p.t as any);
                  onClose();
                }}
                className="mb-2 rounded-md border border-purple-300 px-3 py-2 dark:border-purple-600"
                accessibilityLabel={`Aplicar preset de tipos: ${p.l}`}
              >
                <Text className="text-sm text-purple-700 dark:text-purple-300">{p.l}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              onPress={() => {
                clearTypes();
                onClose();
              }}
              className="mt-2 rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600"
              accessibilityLabel="Limpar tipos"
            >
              <Text className="text-sm text-gray-700 dark:text-gray-300">Limpar tipos</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

PresetsModal.displayName = "PresetsModal";
