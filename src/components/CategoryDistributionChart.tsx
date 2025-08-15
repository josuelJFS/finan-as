import React from "react";
import { View, Text } from "react-native";
import type { CategorySummary } from "../types/entities";

interface Props {
  data: CategorySummary[];
  maxItems?: number; // limitar número de categorias exibidas
  showOthers?: boolean; // agrega restantes em "Outras"
  title?: string;
}

// Gráfico de barras horizontais simples sem libs externas
export const CategoryDistributionChart: React.FC<Props> = ({
  data,
  maxItems = 6,
  showOthers = true,
  title = "Categorias (Despesas)",
}) => {
  if (!data || data.length === 0) {
    return (
      <View className="rounded-xl bg-white p-4 dark:bg-gray-800">
        <Text className="text-sm text-gray-600 dark:text-gray-400">Sem dados de categorias.</Text>
      </View>
    );
  }

  const sorted = [...data].sort((a, b) => b.amount - a.amount);
  const top = sorted.slice(0, maxItems);
  const others = sorted.slice(maxItems);
  const othersTotal = others.reduce((s, c) => s + c.amount, 0);
  const total = data.reduce((s, c) => s + c.amount, 0) || 1;

  const palette = ["#16a34a", "#22c55e", "#10b981", "#059669", "#047857", "#15803d"];

  const rows = top.map((c, idx) => ({
    ...c,
    pct: (c.amount / total) * 100,
    color: palette[idx % palette.length],
  }));
  if (showOthers && othersTotal > 0) {
    rows.push({
      category_id: "others",
      category_name: "Outras",
      amount: othersTotal,
      percentage: (othersTotal / total) * 100,
      transaction_count: others.reduce((s, c) => s + c.transaction_count, 0),
      pct: (othersTotal / total) * 100,
      color: "#4b5563", // neutro
    } as any);
  }

  const maxPct = Math.max(...rows.map((r) => r.pct), 1);

  return (
    <View className="overflow-hidden rounded-xl bg-white p-4 dark:bg-gray-800">
      <Text className="mb-3 text-base font-semibold text-gray-900 dark:text-white">{title}</Text>
      <View accessibilityLabel={`Distribuição por categoria. Total ${rows.length} linhas.`}>
        {rows.map((r) => (
          <View
            key={r.category_id}
            className="mb-2"
            accessibilityLabel={`${r.category_name} ${r.pct.toFixed(1)} por cento`}
          >
            <View className="mb-1 flex-row items-center justify-between">
              <Text
                className="flex-1 text-[11px] font-medium text-gray-700 dark:text-gray-300"
                numberOfLines={1}
              >
                {r.category_name}
              </Text>
              <Text className="ml-2 text-[10px] text-gray-500 dark:text-gray-400">
                {r.pct.toFixed(1)}%
              </Text>
            </View>
            <View className="h-3 w-full flex-row overflow-hidden rounded bg-gray-200 dark:bg-gray-700">
              <View
                style={{ width: `${(r.pct / maxPct) * 100}%`, backgroundColor: r.color }}
                className="h-full"
              />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};
