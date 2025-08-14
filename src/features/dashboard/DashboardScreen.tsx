import React, { useEffect, useState, useMemo } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView } from "react-native";
import { TransactionDAO } from "../../lib/database";
import { MonthlyTrendsChart } from "../../components";
import type { MonthlyTrend } from "../../lib/database/TransactionDAO";

function computeTrendLine(points: { x: number; y: number }[]) {
  if (points.length < 2) return null;
  const n = points.length;
  let sumX = 0,
    sumY = 0,
    sumXY = 0,
    sumXX = 0;
  for (const p of points) {
    sumX += p.x;
    sumY += p.y;
    sumXY += p.x * p.y;
    sumXX += p.x * p.x;
  }
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return null;
  const m = (n * sumXY - sumX * sumY) / denom;
  const b = (sumY - m * sumX) / n;
  return { m, b };
}

export default function DashboardScreen() {
  const [trends, setTrends] = useState<MonthlyTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<6 | 12>(6);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const dao = TransactionDAO.getInstance();
        const data = await dao.getMonthlyTrends(12); // carregamos até 12 e recortamos
        setTrends(data);
      } catch (e: any) {
        setError(e.message || "Falha ao carregar");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const visible = useMemo(() => trends.slice(-range), [trends, range]);
  const trendLine = useMemo(() => {
    const pts = visible.map((t, idx) => ({ x: idx, y: t.balance }));
    return computeTrendLine(pts);
  }, [visible]);

  const startBalance = visible[0]?.balance;
  const endBalance = visible[visible.length - 1]?.balance;
  const absoluteDelta = endBalance != null && startBalance != null ? endBalance - startBalance : 0;
  const pctDelta = startBalance ? (absoluteDelta / startBalance) * 100 : 0;

  return (
    <ScrollView
      className="flex-1 bg-gray-50 p-4 dark:bg-gray-900"
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <Text className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">Dashboard</Text>
      <View className="mb-4 flex-row rounded-md bg-white p-1 dark:bg-gray-800">
        {[6, 12].map((r) => (
          <TouchableOpacity
            key={r}
            onPress={() => setRange(r as 6 | 12)}
            className={`flex-1 rounded-md py-2 ${range === r ? "bg-blue-600" : ""}`}
          >
            <Text
              className={`text-center text-sm font-semibold ${
                range === r ? "text-white" : "text-gray-700 dark:text-gray-300"
              }`}
            >
              Últimos {r}m
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {loading && (
        <View className="mb-4 rounded-lg bg-white p-6 dark:bg-gray-800">
          <ActivityIndicator />
          <Text className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Carregando...
          </Text>
        </View>
      )}
      {error && (
        <View className="mb-4 rounded-lg bg-white p-4 dark:bg-gray-800">
          <Text className="text-sm text-red-600 dark:text-red-400">{error}</Text>
        </View>
      )}
      {!loading && !error && visible.length === 0 && (
        <View className="mb-4 rounded-lg bg-white p-4 dark:bg-gray-800">
          <Text className="text-sm text-gray-600 dark:text-gray-400">Sem transações ainda.</Text>
        </View>
      )}
      {!loading && !error && visible.length > 0 && (
        <View className="space-y-4">
          <MonthlyTrendsChart data={trends} months={range} />
          <View className="rounded-xl bg-white p-4 dark:bg-gray-800">
            <Text className="mb-2 text-base font-semibold text-gray-900 dark:text-white">
              Tendência do Saldo
            </Text>
            {trendLine ? (
              <>
                <Text className="text-xs text-gray-600 dark:text-gray-400">
                  Linha ajuste linear (saldo): y = {trendLine.m.toFixed(2)}x +{" "}
                  {trendLine.b.toFixed(2)}
                </Text>
                <Text className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                  Delta período: {absoluteDelta.toFixed(2)} ({pctDelta.toFixed(1)}%)
                </Text>
              </>
            ) : (
              <Text className="text-xs text-gray-600 dark:text-gray-400">Dados insuficientes.</Text>
            )}
          </View>
        </View>
      )}
    </ScrollView>
  );
}
