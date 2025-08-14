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
  const last12 = useMemo(() => trends.slice(-12), [trends]);
  const trendLine = useMemo(() => {
    const pts = visible.map((t, idx) => ({ x: idx, y: t.balance }));
    return computeTrendLine(pts);
  }, [visible]);

  const startBalance = visible[0]?.balance;
  const endBalance = visible[visible.length - 1]?.balance;
  const absoluteDelta = endBalance != null && startBalance != null ? endBalance - startBalance : 0;
  const pctDelta = startBalance ? (absoluteDelta / startBalance) * 100 : 0;

  // YTD comparativos
  const ytdStats = useMemo(() => {
    if (trends.length === 0) return null;
    const now = new Date();
    const currentYear = now.getFullYear();
    const prevYear = currentYear - 1;
    const parseYear = (p: string) => parseInt(p.split("-")[0]);
    const currentYearMonths = trends.filter((t) => parseYear(t.period) === currentYear);
    const prevYearMonths = trends.filter((t) => parseYear(t.period) === prevYear);
    const monthsElapsed = new Date().getMonth() + 1; // 1..12
    const currSlice = currentYearMonths.slice(0, monthsElapsed);
    const prevSlice = prevYearMonths.slice(0, monthsElapsed);
    const sum = (arr: typeof currSlice, field: keyof MonthlyTrend) =>
      arr.reduce((acc, m) => acc + (m[field] as number), 0);
    const incomeCurr = sum(currSlice, "income");
    const incomePrev = sum(prevSlice, "income");
    const expCurr = sum(currSlice, "expenses");
    const expPrev = sum(prevSlice, "expenses");
    const balCurr = sum(currSlice, "balance");
    const balPrev = sum(prevSlice, "balance");
    const pct = (curr: number, prev: number) => (prev ? ((curr - prev) / prev) * 100 : null);
    return {
      incomeCurr,
      incomePrev,
      expCurr,
      expPrev,
      balCurr,
      balPrev,
      incomePct: pct(incomeCurr, incomePrev),
      expPct: pct(expCurr, expPrev),
      balPct: pct(balCurr, balPrev),
      monthsElapsed,
    };
  }, [trends]);

  // Melhor / pior mês últimos 12 (por saldo)
  const bestWorst = useMemo(() => {
    if (last12.length === 0) return null;
    let best = last12[0];
    let worst = last12[0];
    for (const m of last12) {
      if (m.balance > best.balance) best = m;
      if (m.balance < worst.balance) worst = m;
    }
    return { best, worst };
  }, [last12]);

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
          <MonthlyTrendsChart data={trends} months={range} showTrendLine />
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
          {ytdStats && (
            <View className="rounded-xl bg-white p-4 dark:bg-gray-800">
              <Text className="mb-2 text-base font-semibold text-gray-900 dark:text-white">
                YTD vs Ano Anterior (meses correntes)
              </Text>
              <YtdRow
                label="Receitas"
                curr={ytdStats.incomeCurr}
                prev={ytdStats.incomePrev}
                pct={ytdStats.incomePct}
                positiveWhenUp
              />
              <YtdRow
                label="Despesas"
                curr={ytdStats.expCurr}
                prev={ytdStats.expPrev}
                pct={ytdStats.expPct}
                positiveWhenUp={false}
              />
              <YtdRow
                label="Saldo"
                curr={ytdStats.balCurr}
                prev={ytdStats.balPrev}
                pct={ytdStats.balPct}
                positiveWhenUp
              />
              <Text className="mt-2 text-[10px] text-gray-500 dark:text-gray-400">
                Considerando {ytdStats.monthsElapsed} meses (jan a mês atual) comparados ao mesmo
                período do ano anterior.
              </Text>
            </View>
          )}
          {bestWorst && (
            <View className="rounded-xl bg-white p-4 dark:bg-gray-800">
              <Text className="mb-2 text-base font-semibold text-gray-900 dark:text-white">
                Melhor / Pior Mês (últimos 12)
              </Text>
              <View className="flex-row justify-between">
                <HighlightMonth title="Melhor" month={bestWorst.best} positive />
                <HighlightMonth title="Pior" month={bestWorst.worst} />
              </View>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const formatNumber = (v: number) => v.toFixed(2);

const YtdRow = ({
  label,
  curr,
  prev,
  pct,
  positiveWhenUp,
}: {
  label: string;
  curr: number;
  prev: number;
  pct: number | null;
  positiveWhenUp: boolean;
}) => {
  const up = pct != null && pct >= 0;
  const good = pct == null ? false : positiveWhenUp ? up : !up;
  const color = good ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400";
  return (
    <View className="mb-2 flex-row items-center justify-between">
      <Text className="text-xs text-gray-600 dark:text-gray-400">{label}</Text>
      <View className="flex-row items-center gap-2">
        <Text className="text-xs text-gray-700 dark:text-gray-300">
          {formatNumber(curr)} / {formatNumber(prev || 0)}
        </Text>
        {pct != null && (
          <Text className={`text-[10px] font-semibold ${color}`}>{pct.toFixed(1)}%</Text>
        )}
      </View>
    </View>
  );
};

const HighlightMonth = ({
  title,
  month,
  positive,
}: {
  title: string;
  month: MonthlyTrend;
  positive?: boolean;
}) => {
  const [year, m] = month.period.split("-");
  const date = new Date(parseInt(year), parseInt(m) - 1, 1);
  const label = date.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
  return (
    <View
      className={`w-[48%] rounded-lg p-3 ${
        positive ? "bg-green-50 dark:bg-green-900/20" : "bg-red-50 dark:bg-red-900/20"
      }`}
    >
      <Text
        className={`text-[11px] font-semibold ${
          positive ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"
        }`}
      >
        {title}
      </Text>
      <Text className="mt-1 text-xs text-gray-700 dark:text-gray-200">{label}</Text>
      <Text
        className={`mt-1 text-sm font-bold ${
          positive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
        }`}
      >
        {month.balance.toFixed(2)}
      </Text>
      <Text className="mt-1 text-[10px] text-gray-500 dark:text-gray-400">
        R: {month.income.toFixed(0)} | D: {month.expenses.toFixed(0)}
      </Text>
    </View>
  );
};
