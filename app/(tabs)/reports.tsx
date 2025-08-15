import React, { useEffect, useState, useMemo } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { TransactionDAO } from "../../src/lib/database";
import {
  MonthlyTrendsChart,
  CategoryDistributionChart,
  SvgTrendsChart,
  DonutCategoryChart,
  AreaChart,
  ChartContainer,
} from "../../src/components";

export default function ReportsScreen() {
  const [granularity, setGranularity] = useState<"day" | "week" | "month" | "year">("month");
  const [range, setRange] = useState(6);
  const [trends, setTrends] = useState<any[]>([]);
  const [cat, setCat] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chartMode, setChartMode] = useState<"bars" | "donut">("bars");
  const [donutType, setDonutType] = useState<"expense" | "income">("expense");

  useEffect(() => {
    load();
  }, [granularity, range, donutType]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const dao = TransactionDAO.getInstance();
      const data = await dao.getTrends(granularity, range + 2);
      setTrends(data);
      const slice = data.slice(-range);
      if (slice.length) {
        let dateFrom: string | undefined;
        let dateTo: string | undefined;
        const first = slice[0];
        const last = slice[slice.length - 1];
        if (granularity === "day") {
          dateFrom = first.period;
          dateTo = last.period;
        } else if (granularity === "week") {
          const weekToDate = (p: string, end?: boolean) => {
            const [y, w] = p.split("-");
            const year = parseInt(y);
            const week = parseInt(w);
            const jan4 = new Date(year, 0, 4);
            const dayOfWeek = jan4.getDay() || 7;
            const isoWeekStart = new Date(jan4);
            isoWeekStart.setDate(jan4.getDate() - (dayOfWeek - 1) + (week - 1) * 7);
            if (end) {
              const e = new Date(isoWeekStart);
              e.setDate(e.getDate() + 6);
              return e.toISOString().split("T")[0];
            }
            return isoWeekStart.toISOString().split("T")[0];
          };
          dateFrom = weekToDate(first.period);
          dateTo = weekToDate(last.period, true);
        } else if (granularity === "month") {
          dateFrom = first.period + "-01";
          const [ly, lm] = last.period.split("-");
          const lastDate = new Date(parseInt(ly), parseInt(lm), 0);
          dateTo = lastDate.toISOString().split("T")[0];
        } else {
          dateFrom = first.period + "-01-01";
          dateTo = last.period + "-12-31";
        }
        try {
          const cs = await dao.getCategorySummary(dateFrom, dateTo, donutType);
          setCat(cs);
        } catch {}
      } else setCat([]);
    } catch (e: any) {
      setError(e.message || "Falha ao carregar");
    } finally {
      setLoading(false);
    }
  }

  const visible = useMemo(() => trends.slice(-range), [trends, range]);

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900">
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
        <Text className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">Relatórios</Text>
        <View className="mb-2 flex-row rounded-md bg-white p-1 dark:bg-gray-800">
          {(["day", "week", "month", "year"] as const).map((g) => (
            <TouchableOpacity
              key={g}
              onPress={() => {
                setGranularity(g);
                setRange(g === "day" ? 14 : g === "week" ? 8 : g === "month" ? 6 : 5);
              }}
              className={`flex-1 rounded-md py-2 ${granularity === g ? "bg-green-600" : ""}`}
            >
              <Text
                className={`text-center text-[11px] font-semibold ${granularity === g ? "text-white" : "text-gray-700 dark:text-gray-300"}`}
              >
                {g === "day" ? "Dia" : g === "week" ? "Semana" : g === "month" ? "Mês" : "Ano"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View className="mb-2 flex-row rounded-md bg-white p-1 dark:bg-gray-800">
          {[
            granularity === "day" ? 7 : granularity === "week" ? 4 : 3,
            granularity === "day"
              ? 14
              : granularity === "week"
                ? 8
                : granularity === "month"
                  ? 6
                  : 5,
            granularity === "day"
              ? 30
              : granularity === "week"
                ? 12
                : granularity === "month"
                  ? 12
                  : 10,
          ].map((r) => (
            <TouchableOpacity
              key={r}
              onPress={() => setRange(r)}
              className={`flex-1 rounded-md py-2 ${range === r ? "bg-green-600" : ""}`}
            >
              <Text
                className={`text-center text-[11px] font-semibold ${range === r ? "text-white" : "text-gray-700 dark:text-gray-300"}`}
              >
                Últimos {r}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View className="mb-4 flex-row rounded-md bg-white p-1 dark:bg-gray-800">
          {(["bars", "donut"] as const).map((m) => (
            <TouchableOpacity
              key={m}
              onPress={() => setChartMode(m)}
              className={`flex-1 rounded-md py-2 ${chartMode === m ? "bg-green-600" : ""}`}
            >
              <Text
                className={`text-center text-[11px] font-semibold ${chartMode === m ? "text-white" : "text-gray-700 dark:text-gray-300"}`}
              >
                {m === "bars" ? "Barras" : "Pizza"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {loading && (
          <View className="rounded-lg bg-white p-6 dark:bg-gray-800">
            <ActivityIndicator />
            <Text className="mt-2 text-center text-xs text-gray-600 dark:text-gray-400">
              Carregando...
            </Text>
          </View>
        )}
        {error && !loading && (
          <View className="rounded-lg bg-white p-4 dark:bg-gray-800">
            <Text className="text-sm text-red-600 dark:text-red-400">{error}</Text>
          </View>
        )}
        {!loading && !error && visible.length > 0 && (
          <View className="space-y-4">
            {chartMode === "bars" && (
              <>
                {/* Gráfico de Área Moderno */}
                <AreaChart
                  data={trends}
                  periods={range}
                  granularity={granularity}
                  title="Análise Temporal"
                />

                {/* Gráfico SVG com Gradientes */}
                <SvgTrendsChart data={trends} periods={range} granularity={granularity} />

                {/* Gráfico Clássico */}
                <MonthlyTrendsChart
                  data={trends}
                  periods={range}
                  granularity={granularity}
                  showTrendLine
                  showMovingAverage
                />

                {/* Distribuição de Categorias */}
                {cat.length > 0 && <CategoryDistributionChart data={cat} />}
              </>
            )}
            {chartMode === "donut" && cat.length > 0 && (
              <DonutCategoryChart
                data={cat}
                maxItems={8}
                size={220}
                strokeWidth={26}
                title="Distribuição de Categorias"
                type={donutType}
                onToggleType={(t) => setDonutType(t)}
              />
            )}
          </View>
        )}
        {!loading && !error && visible.length === 0 && (
          <View className="rounded-lg bg-white p-4 dark:bg-gray-800">
            <Text className="text-sm text-gray-600 dark:text-gray-400">
              Sem dados para o período.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
