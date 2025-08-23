import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { TransactionDAO } from "../../src/lib/database/TransactionDAO";
import type { MonthlyTrend, CategorySummary } from "../../src/lib/database/TransactionDAO";
import { formatCurrency } from "../../src/lib/utils";
import Svg, {
  G,
  Rect,
  Text as SvgText,
  Defs,
  LinearGradient,
  Stop,
  Path,
  Circle,
} from "react-native-svg";

interface ReportData {
  trends: MonthlyTrend[];
  categories: CategorySummary[];
  summary: {
    totalIncome: number;
    totalExpenses: number;
    balance: number;
    topCategory: string;
    transactionCount: number;
  };
}

// Componente simples de gráfico de barras sem hooks problemáticos
const SimpleBarChart: React.FC<{
  data: MonthlyTrend[];
  height?: number;
}> = ({ data, height = 120 }) => {
  const { width } = useWindowDimensions();
  const chartWidth = Math.min(width - 32, 400);

  if (!data || data.length === 0) {
    return (
      <View className="flex-1 items-center justify-center py-8">
        <Text className="text-gray-500 dark:text-gray-400">Sem dados para exibir</Text>
      </View>
    );
  }

  const maxValue = Math.max(...data.map((d) => Math.max(d.income, d.expenses)));
  const barWidth = (chartWidth - 40) / data.length / 2;
  const padding = 20;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <Svg width={Math.max(chartWidth, data.length * 60)} height={height + 40}>
        <Defs>
          <LinearGradient id="incomeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#10b981" stopOpacity={0.8} />
            <Stop offset="100%" stopColor="#059669" stopOpacity={1} />
          </LinearGradient>
          <LinearGradient id="expenseGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#f87171" stopOpacity={0.8} />
            <Stop offset="100%" stopColor="#dc2626" stopOpacity={1} />
          </LinearGradient>
        </Defs>

        {data.map((item, index) => {
          const x = padding + index * 60;
          const incomeHeight = (item.income / maxValue) * height;
          const expenseHeight = (item.expenses / maxValue) * height;

          return (
            <G key={item.period}>
              {/* Barra de receitas */}
              <Rect
                x={x}
                y={height - incomeHeight}
                width={barWidth}
                height={incomeHeight}
                fill="url(#incomeGrad)"
                rx={2}
              />

              {/* Barra de despesas */}
              <Rect
                x={x + barWidth + 4}
                y={height - expenseHeight}
                width={barWidth}
                height={expenseHeight}
                fill="url(#expenseGrad)"
                rx={2}
              />

              {/* Label do período */}
              <SvgText
                x={x + barWidth}
                y={height + 20}
                fontSize={10}
                fill="#6b7280"
                textAnchor="middle"
              >
                {item.period.includes("-")
                  ? item.period.split("-")[1] + "/" + item.period.split("-")[0].slice(-2)
                  : item.period}
              </SvgText>
            </G>
          );
        })}
      </Svg>
    </ScrollView>
  );
};

// Componente simples de gráfico de donut
const SimpleDonutChart: React.FC<{
  data: CategorySummary[];
  type: "expense" | "income";
  selectedPeriod: number;
}> = ({ data, type, selectedPeriod }) => {
  if (!data || data.length === 0) {
    return (
      <View className="flex-1 items-center justify-center py-8">
        <MaterialIcons name="pie-chart" size={48} color="#9ca3af" />
        <Text className="mt-2 text-center text-gray-500 dark:text-gray-400">
          Sem {type === "expense" ? "despesas" : "receitas"} nos últimos {selectedPeriod} meses
        </Text>
        <Text className="mt-1 text-center text-xs text-gray-400 dark:text-gray-500">
          Tente um período maior ou adicione transações
        </Text>
      </View>
    );
  }

  const size = 140;
  const strokeWidth = 18;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const total = data.reduce((sum, item) => sum + item.amount, 0);

  const colors = [
    "#059669",
    "#0ea5e9",
    "#8b5cf6",
    "#f59e0b",
    "#ef4444",
    "#06b6d4",
    "#84cc16",
    "#f97316",
    "#ec4899",
    "#6366f1",
  ];

  let currentAngle = 0;
  const segments = data.slice(0, 10).map((item, index) => {
    const percentage = (item.amount / total) * 100;
    const angle = (item.amount / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle += angle;

    const startRad = ((startAngle - 90) * Math.PI) / 180;
    const endRad = ((endAngle - 90) * Math.PI) / 180;

    const x1 = center + radius * Math.cos(startRad);
    const y1 = center + radius * Math.sin(startRad);
    const x2 = center + radius * Math.cos(endRad);
    const y2 = center + radius * Math.sin(endRad);

    const largeArc = angle > 180 ? 1 : 0;
    const path = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;

    return {
      path,
      color: colors[index % colors.length],
      category: item.category_name,
      amount: item.amount,
      percentage,
    };
  });

  return (
    <View className="flex-row items-center">
      <Svg width={size} height={size}>
        {segments.map((segment, index) => (
          <Path key={index} d={segment.path} fill={segment.color} opacity={0.9} />
        ))}

        {/* Círculo central */}
        <Circle
          cx={center}
          cy={center}
          r={radius - strokeWidth - 8}
          fill="rgba(255,255,255,0.95)"
          stroke="#e5e7eb"
          strokeWidth={1}
        />

        <SvgText
          x={center}
          y={center - 5}
          fontSize={12}
          fontWeight="600"
          fill="#374151"
          textAnchor="middle"
        >
          Total
        </SvgText>
        <SvgText x={center} y={center + 12} fontSize={10} fill="#6b7280" textAnchor="middle">
          {formatCurrency(total)}
        </SvgText>
      </Svg>

      <View className="ml-4 flex-1">
        {segments.map((segment, index) => (
          <View key={index} className="mb-2 flex-row items-center">
            <View
              style={{
                backgroundColor: segment.color,
                width: 12,
                height: 12,
                borderRadius: 2,
              }}
            />
            <Text
              className="ml-2 flex-1 text-sm text-gray-700 dark:text-gray-300"
              numberOfLines={1}
            >
              {segment.category}
            </Text>
            <Text className="ml-2 text-xs text-gray-500 dark:text-gray-400">
              {segment.percentage.toFixed(1)}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

export default function ReportsScreen() {
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState(1);
  const [chartType, setChartType] = useState<"expense" | "income">("expense");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const dao = TransactionDAO.getInstance();

      // Buscar tendências
      const trends = await dao.getTrends("month", selectedPeriod);

      // Buscar categorias - Sempre incluir o mês atual completo
      const now = new Date();
      let dateFrom: string;
      let dateTo: string;

      if (selectedPeriod === 1) {
        // Apenas mês atual (igual à home)
        dateFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
        dateTo = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
      } else {
        // Mês atual + X meses anteriores completos
        const monthsBack = selectedPeriod - 1;
        dateFrom = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1)
          .toISOString()
          .split("T")[0];
        dateTo = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
      }

      const categories = await dao.getCategorySummary(dateFrom, dateTo, chartType);

      if (__DEV__) {
        console.log(`[Reports] Período: ${selectedPeriod} mês(es), Tipo: ${chartType}`);
        console.log(`[Reports] Data range: ${dateFrom} até ${dateTo}`);
        console.log(`[Reports] Categorias encontradas: ${categories.length}`);
        categories.forEach((cat, index) => {
          console.log(
            `[Reports] ${index + 1}. ${cat.category_name}: ${cat.amount} (${cat.transaction_count} transações)`
          );
        });
      }

      // Calcular resumo
      const totalIncome = trends.reduce((sum, t) => sum + t.income, 0);
      const totalExpenses = trends.reduce((sum, t) => sum + t.expenses, 0);
      const balance = totalIncome - totalExpenses;
      const topCategory = categories[0]?.category_name || "Nenhuma";
      const transactionCount = categories.reduce((sum, c) => sum + c.transaction_count, 0);

      setData({
        trends,
        categories,
        summary: {
          totalIncome,
          totalExpenses,
          balance,
          topCategory,
          transactionCount,
        },
      });
    } catch (error) {
      console.error("Erro ao carregar dados dos relatórios:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedPeriod, chartType]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <View
        className="flex-1 items-center justify-center bg-gray-50 dark:bg-gray-900"
        style={{ paddingTop: insets.top }}
      >
        <ActivityIndicator size="large" color="#6366f1" />
        <Text className="mt-4 text-gray-600 dark:text-gray-400">Carregando relatórios...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900" style={{ paddingTop: insets.top }}>
      <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="mb-6">
          <Text className="text-2xl font-bold text-gray-900 dark:text-white">Relatórios</Text>
          <Text className="text-gray-600 dark:text-gray-400">Visão geral das suas finanças</Text>
        </View>

        {/* Filtros de Período */}
        <View className="mb-6 rounded-xl bg-white p-4 dark:bg-gray-800">
          <Text className="mb-3 text-base font-semibold text-gray-900 dark:text-white">
            Período
          </Text>
          <View className="flex-row space-x-2">
            {[3, 6, 12].map((months) => (
              <TouchableOpacity
                key={months}
                onPress={() => setSelectedPeriod(months)}
                className={`flex-1 rounded-lg py-2 ${
                  selectedPeriod === months ? "bg-blue-500" : "bg-gray-100 dark:bg-gray-700"
                }`}
              >
                <Text
                  className={`text-center font-medium ${
                    selectedPeriod === months ? "text-white" : "text-gray-700 dark:text-gray-300"
                  }`}
                >
                  {months} meses
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Cards de Resumo */}
        {data && (
          <View className="mb-6 flex-row space-x-3">
            <View className="flex-1 rounded-xl bg-green-50 p-4 dark:bg-green-900/20">
              <View className="flex-row items-center">
                <MaterialIcons name="trending-up" size={20} color="#10b981" />
                <Text className="ml-2 font-medium text-green-800 dark:text-green-300">
                  Receitas
                </Text>
              </View>
              <Text className="mt-1 text-lg font-bold text-green-900 dark:text-green-200">
                {formatCurrency(data.summary.totalIncome)}
              </Text>
            </View>

            <View className="flex-1 rounded-xl bg-red-50 p-4 dark:bg-red-900/20">
              <View className="flex-row items-center">
                <MaterialIcons name="trending-down" size={20} color="#dc2626" />
                <Text className="ml-2 font-medium text-red-800 dark:text-red-300">Despesas</Text>
              </View>
              <Text className="mt-1 text-lg font-bold text-red-900 dark:text-red-200">
                {formatCurrency(data.summary.totalExpenses)}
              </Text>
            </View>
          </View>
        )}

        {/* Saldo */}
        {data && (
          <View
            className={`mb-6 rounded-xl p-4 ${
              data.summary.balance >= 0
                ? "bg-blue-50 dark:bg-blue-900/20"
                : "bg-orange-50 dark:bg-orange-900/20"
            }`}
          >
            <View className="flex-row items-center justify-between">
              <View>
                <Text
                  className={`font-medium ${
                    data.summary.balance >= 0
                      ? "text-blue-800 dark:text-blue-300"
                      : "text-orange-800 dark:text-orange-300"
                  }`}
                >
                  Saldo do Período
                </Text>
                <Text
                  className={`text-2xl font-bold ${
                    data.summary.balance >= 0
                      ? "text-blue-900 dark:text-blue-200"
                      : "text-orange-900 dark:text-orange-200"
                  }`}
                >
                  {formatCurrency(data.summary.balance)}
                </Text>
              </View>
              <MaterialIcons
                name={data.summary.balance >= 0 ? "account-balance-wallet" : "warning"}
                size={32}
                color={data.summary.balance >= 0 ? "#2563eb" : "#ea580c"}
              />
            </View>
          </View>
        )}

        {/* Gráfico de Tendências */}
        <View className="mb-6 rounded-xl bg-white p-4 dark:bg-gray-800">
          <Text className="mb-4 text-base font-semibold text-gray-900 dark:text-white">
            Evolução Mensal
          </Text>
          {data && <SimpleBarChart data={data.trends} />}

          <View className="mt-4 flex-row items-center justify-center space-x-6">
            <View className="flex-row items-center">
              <View className="mr-2 h-3 w-3 rounded bg-green-500" />
              <Text className="text-sm text-gray-600 dark:text-gray-400">Receitas</Text>
            </View>
            <View className="flex-row items-center">
              <View className="mr-2 h-3 w-3 rounded bg-red-500" />
              <Text className="text-sm text-gray-600 dark:text-gray-400">Despesas</Text>
            </View>
          </View>
        </View>

        {/* Distribuição por Categorias */}
        <View className="mb-6 rounded-xl bg-white p-4 dark:bg-gray-800">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-base font-semibold text-gray-900 dark:text-white">
              Categorias - {chartType === "expense" ? "Despesas" : "Receitas"}
            </Text>
            <TouchableOpacity
              onPress={() => setChartType(chartType === "expense" ? "income" : "expense")}
              className="rounded-lg bg-gray-100 px-3 py-1 dark:bg-gray-700"
            >
              <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {chartType === "expense" ? "Ver Receitas" : "Ver Despesas"}
              </Text>
            </TouchableOpacity>
          </View>

          {data && (
            <SimpleDonutChart
              data={data.categories}
              type={chartType}
              selectedPeriod={selectedPeriod}
            />
          )}
        </View>

        {/* Estatísticas Extras */}
        {data && (
          <View className="mb-6 rounded-xl bg-white p-4 dark:bg-gray-800">
            <Text className="mb-4 text-base font-semibold text-gray-900 dark:text-white">
              Estatísticas
            </Text>

            <View className="space-y-3">
              <View className="flex-row justify-between">
                <Text className="text-gray-600 dark:text-gray-400">Categoria Top:</Text>
                <Text className="font-medium text-gray-900 dark:text-white">
                  {data.summary.topCategory}
                </Text>
              </View>

              <View className="flex-row justify-between">
                <Text className="text-gray-600 dark:text-gray-400">Total de Transações:</Text>
                <Text className="font-medium text-gray-900 dark:text-white">
                  {data.summary.transactionCount}
                </Text>
              </View>

              <View className="flex-row justify-between">
                <Text className="text-gray-600 dark:text-gray-400">Média Mensal:</Text>
                <Text className="font-medium text-gray-900 dark:text-white">
                  {formatCurrency(data.summary.totalExpenses / selectedPeriod)}
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
