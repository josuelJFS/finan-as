import React from "react";
import { View, Text, useWindowDimensions, ScrollView } from "react-native";
import Svg, { G, Path, LinearGradient, Stop, Defs, Text as SvgText, Line } from "react-native-svg";
import type { MonthlyTrend } from "../../lib/database/TransactionDAO";

interface Props {
  data: MonthlyTrend[];
  periods?: number;
  granularity?: "day" | "week" | "month" | "year";
  height?: number;
  showGrid?: boolean;
  title?: string;
  fullWidth?: boolean; // se true adapta largura disponível
  minPointWidth?: number; // largura mínima por ponto para evitar compressão extrema
}

export const AreaChart: React.FC<Props> = ({
  data,
  periods = 6,
  granularity = "month",
  height = 200,
  showGrid = true,
  title = "Fluxo de Caixa",
  fullWidth = true,
  minPointWidth = 42,
}) => {
  if (!data || data.length === 0) {
    return (
      <View className="rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800">
        <Text className="text-sm text-gray-600 dark:text-gray-400">Sem dados disponíveis.</Text>
      </View>
    );
  }

  const recent = data.slice(-periods);
  if (recent.length === 0) return null;

  const maxVal = Math.max(1, ...recent.map((r) => Math.max(r.income, r.expenses)));
  const padding = { top: 20, right: 16, bottom: 40, left: 40 };
  const { width: windowW } = useWindowDimensions();
  const available = Math.max(240, windowW - 32 - padding.left - padding.right); // 32 ~ padding container
  const desired = (recent.length - 1) * minPointWidth;
  const chartWidth = fullWidth ? Math.max(available, desired) : 300;
  const chartHeight = height - padding.top - padding.bottom;

  const xStep = chartWidth / Math.max(1, recent.length - 1);
  const yScale = chartHeight / maxVal;

  // Pontos para receitas e despesas
  const incomePoints = recent.map((d, i) => ({
    x: padding.left + i * xStep,
    y: padding.top + chartHeight - d.income * yScale,
  }));

  const expensePoints = recent.map((d, i) => ({
    x: padding.left + i * xStep,
    y: padding.top + chartHeight - d.expenses * yScale,
  }));

  // Criar paths para áreas preenchidas
  const createAreaPath = (points: typeof incomePoints) => {
    if (points.length === 0) return "";

    let path = `M ${padding.left} ${padding.top + chartHeight}`;
    points.forEach((p, i) => {
      path += i === 0 ? ` L ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`;
    });
    path += ` L ${padding.left + chartWidth} ${padding.top + chartHeight} Z`;
    return path;
  };

  const incomeAreaPath = createAreaPath(incomePoints);
  const expenseAreaPath = createAreaPath(expensePoints);

  // Criar linha suave
  const createSmoothLine = (points: typeof incomePoints) => {
    if (points.length < 2) return "";

    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cp1x = prev.x + (curr.x - prev.x) * 0.4;
      const cp1y = prev.y;
      const cp2x = curr.x - (curr.x - prev.x) * 0.4;
      const cp2y = curr.y;
      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
    }
    return path;
  };

  const incomeLine = createSmoothLine(incomePoints);
  const expenseLine = createSmoothLine(expensePoints);

  const formatLabel = (period: string) => {
    try {
      if (granularity === "month") {
        const [year, month] = period.split("-");
        return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString("pt-BR", {
          month: "short",
        });
      }
      return period;
    } catch {
      return period;
    }
  };

  // Grid lines
  const gridLines = [];
  if (showGrid) {
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (i * chartHeight) / 4;
      gridLines.push(
        <Line
          key={`grid-${i}`}
          x1={padding.left}
          y1={y}
          x2={padding.left + chartWidth}
          y2={y}
          stroke="#e5e7eb"
          strokeWidth={0.5}
          opacity={0.5}
        />
      );
    }
  }

  const svgTotalWidth = chartWidth + padding.left + padding.right;
  const svgElement = (
    <Svg width={svgTotalWidth} height={height}>
      <Defs>
        {/* Gradiente para receitas */}
        <LinearGradient id="incomeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#10b981" stopOpacity={0.8} />
          <Stop offset="100%" stopColor="#10b981" stopOpacity={0.1} />
        </LinearGradient>

        {/* Gradiente para despesas */}
        <LinearGradient id="expenseGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#ef4444" stopOpacity={0.8} />
          <Stop offset="100%" stopColor="#ef4444" stopOpacity={0.1} />
        </LinearGradient>
      </Defs>

      <G>
        {/* Grid */}
        {gridLines}

        {/* Áreas preenchidas */}
        <Path d={incomeAreaPath} fill="url(#incomeGradient)" />
        <Path d={expenseAreaPath} fill="url(#expenseGradient)" />

        {/* Linhas suaves */}
        <Path d={incomeLine} fill="none" stroke="#059669" strokeWidth={2.5} strokeLinecap="round" />
        <Path
          d={expenseLine}
          fill="none"
          stroke="#dc2626"
          strokeWidth={2.5}
          strokeLinecap="round"
        />

        {/* Labels no eixo X */}
        {recent.map((d, i) => (
          <SvgText
            key={`label-${i}`}
            x={padding.left + i * xStep}
            y={height - 15}
            fontSize={10}
            fill="#6b7280"
            textAnchor="middle"
          >
            {formatLabel(d.period)}
          </SvgText>
        ))}

        {/* Labels no eixo Y */}
        {[0, 1, 2, 3, 4].map((i) => {
          const value = (maxVal / 4) * i;
          const y = padding.top + chartHeight - (i * chartHeight) / 4;
          return (
            <SvgText
              key={`y-label-${i}`}
              x={padding.left - 10}
              y={y + 3}
              fontSize={9}
              fill="#6b7280"
              textAnchor="end"
            >
              {value.toFixed(0)}
            </SvgText>
          );
        })}
      </G>
    </Svg>
  );

  return (
    <View className="overflow-hidden rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800">
      <Text className="mb-3 text-base font-semibold text-gray-900 dark:text-white">{title}</Text>
      {svgTotalWidth > windowW - 32 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {svgElement}
        </ScrollView>
      ) : (
        svgElement
      )}

      {/* Legenda */}
      <View className="mt-3 flex-row justify-center gap-6">
        <View className="flex-row items-center">
          <View className="mr-2 h-3 w-3 rounded-sm bg-green-500" />
          <Text className="text-xs text-gray-600 dark:text-gray-400">Receitas</Text>
        </View>
        <View className="flex-row items-center">
          <View className="mr-2 h-3 w-3 rounded-sm bg-red-500" />
          <Text className="text-xs text-gray-600 dark:text-gray-400">Despesas</Text>
        </View>
      </View>
    </View>
  );
};
