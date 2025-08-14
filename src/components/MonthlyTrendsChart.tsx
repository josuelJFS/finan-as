import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { MonthlyTrend } from "../lib/database/TransactionDAO";

interface Props {
  data: MonthlyTrend[];
  months?: number; // quantos últimos meses exibir
  showTrendLine?: boolean;
}

// Gráfico simples de barras duplas (income vs expenses) sem libs externas (layout flex)
export const MonthlyTrendsChart: React.FC<Props> = ({
  data,
  months = 6,
  showTrendLine = false,
}) => {
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

  // Regressão linear sobre saldo (income - expenses) para linha de tendência
  let trendPoints: { x: number; y: number }[] = [];
  if (showTrendLine && recent.length >= 2) {
    const pts = recent.map((d, i) => ({ x: i, y: d.balance }));
    const n = pts.length;
    const sumX = pts.reduce((s, p) => s + p.x, 0);
    const sumY = pts.reduce((s, p) => s + p.y, 0);
    const sumXY = pts.reduce((s, p) => s + p.x * p.y, 0);
    const sumX2 = pts.reduce((s, p) => s + p.x * p.x, 0);
    const denom = n * sumX2 - sumX * sumX;
    if (denom !== 0) {
      const a = (n * sumXY - sumX * sumY) / denom; // slope
      const b = (sumY - a * sumX) / n; // intercept
      trendPoints = pts.map((p) => ({ x: p.x, y: a * p.x + b }));
      // Normalizar y se extrapolar muito acima (ajustar max para incluir linha se necessário)
      const maxTrendY = Math.max(...trendPoints.map((p) => p.y));
      if (maxTrendY > maxValue) {
        // (não alteramos maxValue para não distorcer barras; linha poderá tocar topo)
      }
    }
  }

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
      <View className="relative">
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
                <Text
                  className="mt-1 text-[10px] text-gray-600 dark:text-gray-400"
                  numberOfLines={1}
                >
                  {monthLabel}
                </Text>
              </View>
            );
          })}
        </View>
        {showTrendLine && trendPoints.length === recent.length && (
          <View className="pointer-events-none absolute left-0 right-0 top-0 h-[96px]">
            {trendPoints.map((p, i) => {
              if (i === 0) return null;
              const prev = trendPoints[i - 1];
              const containerWidth = 100; // será ajustado via flex (usamos porcentagens)
              // posição horizontal proporcional
              const x1 = (prev.x / (trendPoints.length - 1)) * 100;
              const x2 = (p.x / (trendPoints.length - 1)) * 100;
              const y1 = 80 - (prev.y / maxValue) * 80;
              const y2 = 80 - (p.y / maxValue) * 80;
              const dx = x2 - x1;
              const dy = y2 - y1;
              const length = Math.sqrt(dx * dx + dy * dy);
              const angle = Math.atan2(dy, dx) * (180 / Math.PI);
              return (
                <View
                  key={i}
                  style={{
                    position: "absolute",
                    left: `${x1}%`,
                    top: y1,
                    width: `${length}%`,
                    transform: [{ rotate: `${angle}deg` }],
                  }}
                  className="h-[2px] bg-blue-500/70 dark:bg-blue-300"
                />
              );
            })}
          </View>
        )}
      </View>
      <View className="mt-4 flex-row flex-wrap justify-center gap-4">
        <View className="flex-row items-center">
          <View className="mr-1 h-2 w-2 rounded-sm bg-green-500 dark:bg-green-400" />
          <Text className="text-xs text-gray-600 dark:text-gray-400">Entradas</Text>
        </View>
        <View className="flex-row items-center">
          <View className="mr-1 h-2 w-2 rounded-sm bg-red-500 dark:bg-red-400" />
          <Text className="text-xs text-gray-600 dark:text-gray-400">Saídas</Text>
        </View>
        {showTrendLine && (
          <View className="flex-row items-center">
            <View className="mr-1 h-[2px] w-4 bg-blue-500 dark:bg-blue-300" />
            <Text className="text-xs text-gray-600 dark:text-gray-400">Tendência</Text>
          </View>
        )}
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
