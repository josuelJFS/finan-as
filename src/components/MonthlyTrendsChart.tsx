import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { MonthlyTrend } from "../lib/database/TransactionDAO";

interface Props {
  data: MonthlyTrend[];
  months?: number; // quantos últimos meses exibir
}

// Gráfico simples de barras duplas (income vs expenses) sem libs externas (layout flex)
export const MonthlyTrendsChart: React.FC<Props> = ({ data, months = 6 }) => {
  if (!data || data.length === 0) {
    return (
      <View className="rounded-lg bg-white p-4 dark:bg-gray-800">
        <Text className="text-sm text-gray-600 dark:text-gray-400">Sem dados suficientes.</Text>
      </View>
    );
  }

  const recent = data.slice(-months);
  const current = recent[recent.length - 1];
  const previous = recent.length > 1 ? recent[recent.length - 2] : undefined;

  function pctDelta(curr: number, prev?: number) {
    if (!prev || prev === 0) return null;
    return ((curr - prev) / prev) * 100;
  }

  const incomeDelta = pctDelta(current?.income || 0, previous?.income);
  const expenseDelta = pctDelta(current?.expenses || 0, previous?.expenses);
  const balanceDelta = pctDelta(current?.balance || 0, previous?.balance);
  const maxValue = Math.max(1, ...recent.map((d) => d.income), ...recent.map((d) => d.expenses));

  return (
    <View className="rounded-xl bg-white p-5 shadow-sm dark:bg-gray-800">
      <Text className="mb-1 text-base font-semibold text-gray-900 dark:text-white">
        Entradas vs Saídas
      </Text>
      {current && (
        <View className="mb-3">
          <Text className="text-xs text-gray-600 dark:text-gray-400">
            Mês atual ({current.period}): Receitas {current.income.toFixed(2)} | Despesas{" "}
            {current.expenses.toFixed(2)} | Saldo {current.balance.toFixed(2)}
          </Text>
          <View className="mt-1 flex-row flex-wrap gap-x-3">
            <Delta label="Receitas" delta={incomeDelta} />
            <Delta label="Despesas" delta={expenseDelta} invert />
            <Delta label="Saldo" delta={balanceDelta} />
          </View>
        </View>
      )}
      <View className="flex-row items-end justify-between">
        {recent.map((d) => {
          const incomeHeight = Math.max(4, Math.round((d.income / maxValue) * 80));
          const expenseHeight = Math.max(4, Math.round((d.expenses / maxValue) * 80));
          const [year, month] = d.period.split("-");
          const monthLabel = new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleDateString(
            "pt-BR",
            { month: "short" }
          );
          return (
            <View key={d.period} className="mx-[2px] flex-1 items-center">
              <View className="flex-row items-end">
                <View
                  style={{ height: incomeHeight }}
                  className="w-3 rounded-sm bg-green-500 dark:bg-green-400"
                  accessibilityLabel={`Receitas ${monthLabel}: ${d.income}`}
                />
                <View className="w-1" />
                <View
                  style={{ height: expenseHeight }}
                  className="w-3 rounded-sm bg-red-500 dark:bg-red-400"
                  accessibilityLabel={`Despesas ${monthLabel}: ${d.expenses}`}
                />
              </View>
              <Text className="mt-1 text-[10px] text-gray-600 dark:text-gray-400" numberOfLines={1}>
                {monthLabel}
              </Text>
            </View>
          );
        })}
      </View>
      <View className="mt-4 flex-row justify-center gap-4">
        <View className="flex-row items-center">
          <View className="mr-1 h-2 w-2 rounded-sm bg-green-500 dark:bg-green-400" />
          <Text className="text-xs text-gray-600 dark:text-gray-400">Entradas</Text>
        </View>
        <View className="flex-row items-center">
          <View className="mr-1 h-2 w-2 rounded-sm bg-red-500 dark:bg-red-400" />
          <Text className="text-xs text-gray-600 dark:text-gray-400">Saídas</Text>
        </View>
      </View>
    </View>
  );
};

interface DeltaProps {
  label: string;
  delta: number | null;
  invert?: boolean; // quando true, queda é positiva (ex: despesas)
}

const Delta: React.FC<DeltaProps> = ({ label, delta, invert }) => {
  if (delta === null) {
    return (
      <View className="flex-row items-center">
        <Text className="text-[10px] text-gray-500 dark:text-gray-500">{label}: -</Text>
      </View>
    );
  }
  const isUp = delta >= 0;
  const positive = invert ? !isUp : isUp; // se invert, queda vira positiva
  const color = positive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400";
  const icon = isUp ? "arrow-up" : "arrow-down";
  return (
    <View className="flex-row items-center">
      <Ionicons
        name={icon as any}
        size={10}
        style={{ marginRight: 2 }}
        color={positive ? "#16a34a" : "#dc2626"}
        accessibilityLabel={`${label} ${isUp ? "subiu" : "caiu"}`}
      />
      <Text className={`text-[10px] font-medium ${color}`}>
        {label}: {Math.abs(delta).toFixed(1)}%
      </Text>
    </View>
  );
};
