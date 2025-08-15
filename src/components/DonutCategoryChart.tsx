import React, { useState, useEffect, useMemo } from "react";
import { View, Text, TouchableOpacity } from "react-native";
// Haptics (certifique-se de ter instalado expo-haptics; caso contrário, condicional)
let Haptics: any = { selectionAsync: () => {}, impactAsync: () => {} };
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Haptics = require("expo-haptics");
} catch (e) {
  // fallback silencioso em web/test
}
import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedProps,
  withDelay,
  Easing,
} from "react-native-reanimated";
import Svg, {
  G,
  Path,
  Circle,
  Defs,
  LinearGradient,
  Stop,
  Text as SvgText,
} from "react-native-svg";
import type { CategorySummary } from "../lib/database/TransactionDAO";
import { formatCurrency } from "../lib/utils";

interface Props {
  data: CategorySummary[];
  maxItems?: number;
  size?: number;
  strokeWidth?: number;
  title?: string;
  type?: "expense" | "income";
  onToggleType?: (t: "expense" | "income") => void;
}

function arcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}
function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

export const DonutCategoryChart: React.FC<Props> = ({
  data,
  maxItems = 5,
  size = 140,
  strokeWidth = 18,
  title = "Categorias",
  type = "expense",
  onToggleType,
}) => {
  const [active, setActive] = useState<number | null>(null);
  // Animação de montagem do conjunto
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 16);
    return () => clearTimeout(t);
  }, []);
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
  if (othersTotal > 0) {
    top.push({
      category_id: "others",
      category_name: "Outras",
      amount: othersTotal,
      percentage: (othersTotal / sorted.reduce((s, c) => s + c.amount, 0)) * 100,
      transaction_count: 0,
    });
  }
  const total = top.reduce((s, c) => s + c.amount, 0) || 1;

  // Paleta com gradientes mais modernos
  const paletteColors = [
    { primary: "#059669", light: "#10b981" }, // green
    { primary: "#0ea5e9", light: "#38bdf8" }, // sky
    { primary: "#8b5cf6", light: "#a78bfa" }, // violet
    { primary: "#f59e0b", light: "#fbbf24" }, // amber
    { primary: "#ef4444", light: "#f87171" }, // red
    { primary: "#06b6d4", light: "#22d3ee" }, // cyan
    { primary: "#84cc16", light: "#a3e635" }, // lime
    { primary: "#f97316", light: "#fb923c" }, // orange
  ];

  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  let currentAngle = 0;

  // Pré-calcula segmentos (memo para evitar recomputo pesado em renders de animação)
  const segments = useMemo(() => {
    currentAngle = 0;
    return top.map((c, i) => {
      const pct = c.amount / total;
      const angle = pct * 360;
      const start = currentAngle;
      const end = currentAngle + angle;
      const path = arcPath(center, center, radius, start, end);
      const colors = paletteColors[i % paletteColors.length];
      currentAngle += angle;
      return {
        path,
        startAngle: start,
        endAngle: end,
        color: colors.primary,
        lightColor: colors.light,
        category: c.category_name,
        amount: c.amount,
        pct: pct * 100,
        gradientId: `gradient-${i}`,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(top), total, center, radius]);

  // Shared values para comprimento dos arcos
  const animatedLengths = segments.map(() => useSharedValue(0));
  const totalCircumference = 2 * Math.PI * radius;
  useEffect(() => {
    segments.forEach((seg, i) => {
      const pct = seg.pct / 100;
      animatedLengths[i].value = 0;
      animatedLengths[i].value = withDelay(
        40 * i,
        withTiming(pct, { duration: 650, easing: Easing.out(Easing.cubic) })
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segments.map((s) => s.pct).join(","), radius]);

  const AnimatedPath: any = Animated.createAnimatedComponent(Path as any);

  const activeSegment = active !== null ? segments[active] : null;
  const totalExpenses = top.reduce((s, c) => s + c.amount, 0);
  return (
    <View className="rounded-xl bg-white p-4 dark:bg-gray-800">
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="text-base font-semibold text-gray-900 dark:text-white">
          {title} {type === "expense" ? "(Despesas)" : "(Receitas)"}
        </Text>
        {onToggleType && (
          <TouchableOpacity
            onPress={() => onToggleType(type === "expense" ? "income" : "expense")}
            className="rounded-md bg-gray-200 px-2 py-[2px] dark:bg-gray-700"
          >
            <Text className="text-[10px] font-medium text-gray-700 dark:text-gray-200">
              {type === "expense" ? "Ver Receitas" : "Ver Despesas"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      <View className="flex-row items-center">
        <Svg width={size} height={size}>
          <Defs>
            {segments.map((s, i) => (
              <LinearGradient
                key={s.gradientId}
                id={s.gradientId}
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <Stop offset="0%" stopColor={s.lightColor} />
                <Stop offset="100%" stopColor={s.color} />
              </LinearGradient>
            ))}
          </Defs>

          <G originX={center} originY={center}>
            {segments.map((s, i) => {
              // Para animar usando strokeDasharray precisamos converter o arco em path parcial (approx) -> simplificação: usar o path completo e animar strokeDashoffset invertido
              const lengthValue = animatedLengths[i];
              const animatedProps = useAnimatedProps(() => {
                const pctDrawn = lengthValue.value; // 0..1
                const dashArray = totalCircumference;
                const dashOffset = (1 - pctDrawn) * dashArray;
                return {
                  strokeDasharray: `${dashArray} ${dashArray}`,
                  strokeDashoffset: dashOffset,
                  opacity: mounted ? 1 : 0,
                } as any;
              });
              return (
                <AnimatedPath
                  key={i}
                  d={s.path}
                  stroke={`url(#${s.gradientId})`}
                  strokeWidth={active === i ? strokeWidth + 3 : strokeWidth}
                  strokeLinecap="round"
                  fill="none"
                  onPress={() => {
                    setActive(active === i ? null : i);
                    Haptics.selectionAsync();
                  }}
                  accessibilityLabel={`${s.category} ${s.pct.toFixed(1)} por cento`}
                  animatedProps={animatedProps}
                />
              );
            })}

            {/* Círculo interno para área de tooltip */}
            <Circle
              cx={center}
              cy={center}
              r={radius - strokeWidth / 2}
              fill="transparent"
              onPress={() => {
                setActive(null);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              accessibilityLabel="Limpar seleção"
            />

            {/* Tooltip central */}
            {activeSegment && (
              <G>
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
                  y={center - 8}
                  fontSize={12}
                  fontWeight="600"
                  fill="#374151"
                  textAnchor="middle"
                >
                  {activeSegment.category}
                </SvgText>
                <SvgText x={center} y={center + 8} fontSize={10} fill="#6b7280" textAnchor="middle">
                  {formatCurrency(activeSegment.amount)}
                </SvgText>
                <SvgText x={center} y={center + 22} fontSize={9} fill="#9ca3af" textAnchor="middle">
                  {activeSegment.pct.toFixed(1)}%
                </SvgText>
              </G>
            )}
          </G>
        </Svg>
        <View className="ml-4 flex-1 flex-col flex-wrap">
          {segments.map((s, i) => (
            <TouchableOpacity
              key={i}
              className="mb-1 flex-row items-center"
              onPress={() => setActive(active === i ? null : i)}
            >
              <View
                style={{
                  backgroundColor: s.color,
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  opacity: active === i ? 1 : 0.7,
                }}
              />
              <Text
                className={`ml-2 flex-1 text-[11px] ${active === i ? "font-semibold text-gray-900 dark:text-white" : "text-gray-700 dark:text-gray-300"}`}
                numberOfLines={1}
              >
                {s.category}
              </Text>
              <Text className="ml-2 text-[10px] text-gray-500 dark:text-gray-400">
                {s.pct.toFixed(1)}%
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <View className="mt-2 items-center">
        <Text className="text-xs text-gray-600 dark:text-gray-400">
          Total {type === "expense" ? "Despesas" : "Receitas"}
        </Text>
        <Text
          className={`text-sm font-semibold ${type === "expense" ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}
        >
          {totalExpenses.toFixed(2)}
        </Text>
      </View>
    </View>
  );
};
