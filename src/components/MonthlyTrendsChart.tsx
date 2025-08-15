import React, { useEffect } from "react";
import { View, Text, useWindowDimensions, ScrollView } from "react-native";
import Svg, {
  G,
  Rect,
  Path,
  Text as SvgText,
  Defs,
  LinearGradient,
  Stop,
  Line,
} from "react-native-svg";
import Animated, {
  useSharedValue,
  withTiming,
  withDelay,
  useAnimatedProps,
  Easing,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import type { MonthlyTrend } from "../lib/database/TransactionDAO";

interface Props {
  data: MonthlyTrend[]; // já agregado conforme granularidade
  periods?: number; // quantos últimos períodos exibir
  /** @deprecated usar periods */
  months?: number; // compat legacy
  granularity?: "day" | "week" | "month" | "year";
  showTrendLine?: boolean;
  showMovingAverage?: boolean; // média móvel 3 períodos sobre saldo
}

// Versão modernizada em SVG com animações reanimated
export const MonthlyTrendsChart: React.FC<Props> = ({
  data,
  periods,
  months,
  granularity = "month",
  showTrendLine = false,
  showMovingAverage = false,
}) => {
  if (!data || data.length === 0) {
    return (
      <View className="rounded-lg bg-white p-4 dark:bg-gray-800">
        <Text className="text-sm text-gray-600 dark:text-gray-400">Sem dados suficientes.</Text>
      </View>
    );
  }

  const finalPeriods = periods ?? months ?? 6;
  const recent = data.slice(-finalPeriods);
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
  let maPoints: { x: number; y: number }[] = [];
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

  // Média móvel 3m do saldo
  if (showMovingAverage && recent.length >= 3) {
    maPoints = recent.map((_, idx) => {
      const slice = recent.slice(Math.max(0, idx - 2), idx + 1); // últimas até 3
      const avg = slice.reduce((s, m) => s + m.balance, 0) / slice.length;
      return { x: idx, y: avg };
    });
  }

  // Configurações SVG
  const chartHeight = 120;
  const paddingBottom = 34;
  const barWidth = 10;
  const gap = 14;
  const totalWidth = recent.length * gap + 40;
  const { width: windowW } = useWindowDimensions();
  const y = (v: number) =>
    chartHeight - paddingBottom - (v / maxValue) * (chartHeight - paddingBottom - 8);

  // Animated shared values
  const incomesSV = recent.map(() => useSharedValue(0));
  const expensesSV = recent.map(() => useSharedValue(0));
  useEffect(() => {
    recent.forEach((d, i) => {
      incomesSV[i].value = 0;
      expensesSV[i].value = 0;
      incomesSV[i].value = withDelay(
        40 * i,
        withTiming(d.income / maxValue, { duration: 600, easing: Easing.out(Easing.cubic) })
      );
      expensesSV[i].value = withDelay(
        40 * i + 120,
        withTiming(d.expenses / maxValue, { duration: 600, easing: Easing.out(Easing.cubic) })
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recent.map((r) => `${r.period}:${r.income}:${r.expenses}`).join(","), maxValue]);
  const AnimatedRect: any = Animated.createAnimatedComponent(Rect as any);

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

  // Paths linhas
  let trendPathStr = "";
  if (showTrendLine && trendPoints.length === recent.length && trendPoints.length > 1) {
    trendPathStr = trendPoints
      .map((p, i) => {
        const px = 24 + i * gap + barWidth / 2;
        const py = y(p.y);
        return `${i === 0 ? "M" : "L"}${px},${py}`;
      })
      .join(" ");
  }
  let maPathStr = "";
  if (showMovingAverage && maPoints.length === recent.length && maPoints.length > 1) {
    maPathStr = maPoints
      .map((p, i) => {
        const px = 24 + i * gap + barWidth / 2;
        const py = y(p.y);
        return `${i === 0 ? "M" : "L"}${px},${py}`;
      })
      .join(" ");
  }

  const svg = (
    <Svg
      width={totalWidth}
      height={chartHeight}
      accessibilityLabel="Gráfico mensal de entradas vs saídas"
    >
      <Defs>
        <LinearGradient id="incomeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#10b981" />
          <Stop offset="100%" stopColor="#059669" />
        </LinearGradient>
        <LinearGradient id="expenseGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#f87171" />
          <Stop offset="100%" stopColor="#dc2626" />
        </LinearGradient>
      </Defs>
      <Line
        x1={0}
        y1={chartHeight - paddingBottom}
        x2={totalWidth}
        y2={chartHeight - paddingBottom}
        stroke="#d1d5db"
        strokeWidth={1}
        strokeDasharray="3 5"
      />
      <G>
        {recent.map((d, i) => {
          const incomeAnimatedProps = useAnimatedProps(() => {
            const ratio = incomesSV[i].value;
            const h = ratio * (chartHeight - paddingBottom - 8);
            const yPos = chartHeight - paddingBottom - h;
            return { y: yPos, height: h } as any;
          });
          const expenseAnimatedProps = useAnimatedProps(() => {
            const ratio = expensesSV[i].value;
            const h = ratio * (chartHeight - paddingBottom - 8);
            const yPos = chartHeight - paddingBottom - h;
            return { y: yPos, height: h } as any;
          });
          return (
            <G key={d.period}>
              <AnimatedRect
                x={24 + i * gap}
                width={barWidth / 2}
                animatedProps={incomeAnimatedProps}
                fill="url(#incomeGrad)"
                rx={2}
                ry={2}
                opacity={0.95}
              />
              <AnimatedRect
                x={24 + i * gap + barWidth / 2 + 2}
                width={barWidth / 2}
                animatedProps={expenseAnimatedProps}
                fill="url(#expenseGrad)"
                rx={2}
                ry={2}
                opacity={0.95}
              />
              <SvgText
                x={24 + i * gap + barWidth / 2 + 1}
                y={chartHeight - paddingBottom + 12}
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
      {trendPathStr && (
        <Path d={trendPathStr} stroke="#16a34a" strokeWidth={2} fill="none" strokeLinecap="round" />
      )}
      {maPathStr && (
        <Path
          d={maPathStr}
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
    <View className="overflow-hidden rounded-xl bg-white p-5 shadow-sm dark:bg-gray-800">
      <Text className="mb-1 text-base font-semibold text-gray-900 dark:text-white">
        Entradas vs Saídas
      </Text>
      {current && (
        <View className="mb-3">
          <Text className="text-xs text-gray-600 dark:text-gray-400">
            Período atual ({current.period}): Receitas {current.income.toFixed(2)} | Despesas{" "}
            {current.expenses.toFixed(2)} | Saldo {current.balance.toFixed(2)}
          </Text>
          <View className="mt-1 flex-row flex-wrap gap-x-3">
            <Delta label="Receitas" delta={incomeDelta} />
            <Delta label="Despesas" delta={expenseDelta} invert />
            <Delta label="Saldo" delta={balanceDelta} />
          </View>
        </View>
      )}
      {totalWidth > windowW - 32 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {svg}
        </ScrollView>
      ) : (
        svg
      )}
      <View className="mt-4 flex-row flex-wrap justify-center gap-4">
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
