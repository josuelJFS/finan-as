import React, { useEffect } from "react";
import { View, Text, useWindowDimensions, ScrollView, Pressable } from "react-native";
import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedProps,
  withDelay,
  Easing,
} from "react-native-reanimated";
import Svg, {
  G,
  Rect,
  Line,
  Path,
  Text as SvgText,
  Defs,
  LinearGradient,
  Stop,
  Filter,
} from "react-native-svg";
import type { MonthlyTrend } from "../lib/database/TransactionDAO";
import { useChartTooltip } from "./charts/common/ChartTooltip";

interface Props {
  data: MonthlyTrend[];
  periods?: number;
  granularity?: "day" | "week" | "month" | "year";
  showTrendLine?: boolean;
  showMovingAverage?: boolean;
  height?: number;
}

export const SvgTrendsChart: React.FC<Props> = ({
  data,
  periods = 6,
  granularity = "month",
  showTrendLine = true,
  showMovingAverage = true,
  height = 180,
}) => {
  if (!data || data.length === 0) {
    return (
      <View className="rounded-xl bg-white p-4 dark:bg-gray-800">
        <Text className="text-sm text-gray-600 dark:text-gray-400">Sem dados.</Text>
      </View>
    );
  }
  const recent = data.slice(-periods);
  if (recent.length === 0) return null;
  const maxVal = Math.max(1, ...recent.map((r) => Math.max(r.income, r.expenses)));
  const chartPadding = 28;
  const minSlot = 34; // largura mínima para cada par de barras
  const w = Math.max(16 * recent.length, minSlot * recent.length);
  const h = height;
  const barW = 6;
  const y = (v: number) => h - chartPadding - (v / maxVal) * (h - chartPadding - 16);
  const x = (i: number) => 12 + i * 16;

  let trendPath = "";
  if (showTrendLine && recent.length >= 2) {
    const pts = recent.map((d, i) => ({ x: i, y: d.balance }));
    const n = pts.length;
    const sumX = pts.reduce((s, p) => s + p.x, 0);
    const sumY = pts.reduce((s, p) => s + p.y, 0);
    const sumXY = pts.reduce((s, p) => s + p.x * p.y, 0);
    const sumX2 = pts.reduce((s, p) => s + p.x * p.x, 0);
    const denom = n * sumX2 - sumX * sumX;
    if (denom !== 0) {
      const a = (n * sumXY - sumX * sumY) / denom;
      const b = (sumY - a * sumX) / n;
      const linePts = pts.map((p) => ({ px: x(p.x) + barW, py: y(Math.max(0, a * p.x + b)) }));
      trendPath = linePts.reduce(
        (acc, p, idx) => acc + `${idx === 0 ? "M" : "L"}${p.px},${p.py} `,
        ""
      );
    }
  }

  let maPath = "";
  if (showMovingAverage && recent.length >= 3) {
    const balances = recent.map((r) => r.balance);
    const ma = recent.map((_, i) => {
      const slice = balances.slice(Math.max(0, i - 2), i + 1);
      return slice.reduce((s, v) => s + v, 0) / slice.length;
    });
    const pts = ma.map((v, i) => ({ px: x(i) + barW, py: y(Math.max(0, v)) }));
    maPath = pts.reduce((acc, p, i) => acc + `${i === 0 ? "M" : "L"}${p.px},${p.py} `, "");
  }

  const formatLabel = (period: string) => {
    try {
      if (granularity === "month") {
        const [yStr, mStr] = period.split("-");
        return new Date(parseInt(yStr), parseInt(mStr) - 1, 1).toLocaleDateString("pt-BR", {
          month: "short",
        });
      } else if (granularity === "day") {
        return new Date(period).toLocaleDateString("pt-BR", { day: "2-digit" });
      } else if (granularity === "week") {
        return "S" + period.split("-")[1];
      }
      return period;
    } catch {
      return period;
    }
  };

  const totalWidth = w + 24;
  const { width: windowW } = useWindowDimensions();
  // Shared values para cada barra (duas por período: income e expense)
  const barHeightsIncome = recent.map(() => useSharedValue(0));
  const barHeightsExpense = recent.map(() => useSharedValue(0));
  const { show, hide } = useChartTooltip();
  useEffect(() => {
    recent.forEach((d, i) => {
      const incRatio = d.income / maxVal;
      const expRatio = d.expenses / maxVal;
      barHeightsIncome[i].value = 0;
      barHeightsExpense[i].value = 0;
      barHeightsIncome[i].value = withDelay(
        40 * i,
        withTiming(incRatio, { duration: 600, easing: Easing.out(Easing.cubic) })
      );
      barHeightsExpense[i].value = withDelay(
        40 * i + 100,
        withTiming(expRatio, { duration: 600, easing: Easing.out(Easing.cubic) })
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recent.map((d) => `${d.period}:${d.income}:${d.expenses}`).join(","), maxVal]);

  const AnimatedRect: any = Animated.createAnimatedComponent(Rect as any);

  const svg = (
    <Svg
      width={totalWidth}
      height={h}
      accessibilityLabel="Gráfico de barras de receitas e despesas com linhas de tendência"
    >
      <Defs>
        {/* Gradiente para receitas */}
        <LinearGradient id="incomeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#10b981" />
          <Stop offset="100%" stopColor="#059669" />
        </LinearGradient>

        {/* Gradiente para despesas */}
        <LinearGradient id="expenseGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#f87171" />
          <Stop offset="100%" stopColor="#dc2626" />
        </LinearGradient>
      </Defs>
      <Line
        x1={0}
        y1={h - chartPadding}
        x2={w + 12}
        y2={h - chartPadding}
        stroke="#9ca3af"
        strokeWidth={1}
        strokeDasharray="2 4"
      />
      <G>
        {recent.map((d, i) => {
          const incomeAnimatedProps = useAnimatedProps(() => {
            const targetHeight = barHeightsIncome[i].value * (h - chartPadding - 16);
            const barHeight = targetHeight;
            const yPos = h - chartPadding - barHeight;
            return { y: yPos, height: barHeight } as any;
          });
          const expenseAnimatedProps = useAnimatedProps(() => {
            const targetHeight = barHeightsExpense[i].value * (h - chartPadding - 16);
            const barHeight = targetHeight;
            const yPos = h - chartPadding - barHeight;
            return { y: yPos, height: barHeight } as any;
          });
          return (
            <G key={d.period}>
              <AnimatedRect
                x={x(i)}
                width={barW}
                animatedProps={incomeAnimatedProps}
                fill="url(#incomeGradient)"
                rx={3}
                ry={3}
                opacity={0.95}
              />
              <AnimatedRect
                x={x(i) + barW + 2}
                width={barW}
                animatedProps={expenseAnimatedProps}
                fill="url(#expenseGradient)"
                rx={3}
                ry={3}
                opacity={0.95}
              />
              {/* Área interativa invisível para tooltip */}
              <Rect
                x={x(i) - 6}
                y={0}
                width={barW * 2 + 14}
                height={h - chartPadding}
                fill="transparent"
                onPress={(evt) => {
                  const { pageX, pageY } = evt.nativeEvent;
                  show({
                    x: pageX + 4,
                    y: pageY - 60,
                    title: formatLabel(d.period),
                    accentColor: d.balance >= 0 ? "#16a34a" : "#dc2626",
                    lines: [
                      {
                        label: "Entradas",
                        value: d.income.toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }),
                        color: "#16a34a",
                      },
                      {
                        label: "Saídas",
                        value: d.expenses.toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }),
                        color: "#dc2626",
                      },
                      {
                        label: "Saldo",
                        value: d.balance.toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }),
                        color: d.balance >= 0 ? "#16a34a" : "#dc2626",
                      },
                    ],
                  });
                }}
                onPressOut={() => hide()}
              />
              <SvgText
                x={x(i) + barW}
                y={h - chartPadding + 10}
                fontSize={9}
                fill="#6b7280"
                textAnchor="middle"
              >
                {formatLabel(d.period)}
              </SvgText>
            </G>
          );
        })}
      </G>
      {trendPath && (
        <Path d={trendPath} stroke="#16a34a" strokeWidth={2} fill="none" strokeLinecap="round" />
      )}
      {maPath && (
        <Path
          d={maPath}
          stroke="#8b5cf6"
          strokeWidth={2}
          fill="none"
          strokeDasharray="4 4"
          strokeLinecap="round"
        />
      )}
    </Svg>
  );

  return (
    <View className="overflow-hidden rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800">
      <Text className="mb-2 text-base font-semibold text-gray-900 dark:text-white">
        Entradas vs Saídas
      </Text>
      {totalWidth > windowW - 32 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {svg}
        </ScrollView>
      ) : (
        svg
      )}
      <View className="mt-3 flex-row flex-wrap gap-4">
        <Legend color="#16a34a" label="Entradas" />
        <Legend color="#dc2626" label="Saídas" />
        {showTrendLine && <Legend color="#16a34a" label="Tendência" line />}
        {showMovingAverage && <Legend color="#8b5cf6" label="Média 3p" dashed />}
      </View>
    </View>
  );
};

const Legend = ({
  color,
  label,
  line,
  dashed,
}: {
  color: string;
  label: string;
  line?: boolean;
  dashed?: boolean;
}) => (
  <View className="flex-row items-center">
    {line ? (
      <View style={{ width: 16, height: 2, backgroundColor: color, borderRadius: 1 }} />
    ) : (
      <View style={{ width: 10, height: 10, backgroundColor: color, borderRadius: 2 }} />
    )}
    <Text className="ml-1 text-xs text-gray-600 dark:text-gray-400">{label}</Text>
  </View>
);
