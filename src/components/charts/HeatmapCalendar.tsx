import React from "react";
import { View, Text } from "react-native";
import Svg, { Rect, G, Text as SvgText } from "react-native-svg";

interface DayValue {
  date: string;
  value: number;
}
interface Props {
  data: DayValue[]; // dias consecutivos ordenados ASC
  size?: number; // lado do quadrado
  gap?: number;
  weeks?: number; // inferido se não fornecido
  maxColor?: string;
  minColor?: string;
  emptyColor?: string;
  title?: string;
  modeLabel?: string; // ex: 'Despesas'
}

// Função simples para interpolar cor entre minColor e maxColor usando valor normalizado
function interpolateColor(minColor: string, maxColor: string, t: number) {
  const parse = (c: string) =>
    c
      .replace("#", "")
      .match(/.{1,2}/g)!
      .map((x) => parseInt(x, 16));
  const [r1, g1, b1] = parse(minColor);
  const [r2, g2, b2] = parse(maxColor);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r},${g},${b})`;
}

export const HeatmapCalendar: React.FC<Props> = ({
  data,
  size = 14,
  gap = 3,
  weeks,
  maxColor = "#dc2626",
  minColor = "#fee2e2",
  emptyColor = "#f3f4f6",
  title = "Atividade Diária",
  modeLabel = "Valor",
}) => {
  if (!data || data.length === 0) {
    return (
      <View className="rounded-xl bg-white p-4 dark:bg-gray-800">
        <Text className="text-sm text-gray-600 dark:text-gray-400">Sem dados.</Text>
      </View>
    );
  }
  const totalDays = data.length;
  const totalWeeks = weeks || Math.ceil(totalDays / 7);
  const matrix: DayValue[][] = Array.from({ length: totalWeeks }, () => []);
  // Supondo data ascendente, montar colunas (estilo GitHub) -> cada semana é coluna
  data.forEach((d, idx) => {
    const week = Math.floor(idx / 7);
    matrix[week].push(d);
  });
  // Preencher últimos slots se necessário
  matrix.forEach((col) => {
    while (col.length < 7) col.push({ date: "", value: 0 });
  });

  const maxVal = Math.max(1, ...data.map((d) => d.value));

  const width = totalWeeks * size + (totalWeeks - 1) * gap + 40; // + espaço labels
  const height = 7 * size + 6 * gap + 24; // + título

  const dayNames = ["S", "T", "Q", "Q", "S", "S", "D"]; // simplificado

  return (
    <View className="rounded-xl bg-white p-4 dark:bg-gray-800">
      <Text className="mb-2 text-base font-semibold text-gray-900 dark:text-white">{title}</Text>
      <Svg width={width} height={height} accessibilityLabel="Heatmap de atividade diária">
        <G x={32} y={0}>
          {matrix.map((weekCol, wIdx) => (
            <G key={wIdx} x={wIdx * (size + gap)}>
              {weekCol.map((d, dayIdx) => {
                const value = d.date ? d.value : 0;
                const norm = value / maxVal;
                const color = d.date
                  ? value === 0
                    ? emptyColor
                    : interpolateColor(minColor, maxColor, norm)
                  : "transparent";
                return (
                  <Rect
                    key={dayIdx + d.date}
                    x={0}
                    y={dayIdx * (size + gap)}
                    width={size}
                    height={size}
                    rx={3}
                    ry={3}
                    fill={color}
                    stroke="#e5e7eb"
                    strokeWidth={d.date ? 0.5 : 0}
                  />
                );
              })}
            </G>
          ))}
        </G>
        {/* Labels dias */}
        <G x={0} y={0}>
          {dayNames.map((d, i) => (
            <SvgText key={d + i} x={0} y={i * (size + gap) + size - 2} fill="#6b7280" fontSize={8}>
              {d}
            </SvgText>
          ))}
        </G>
      </Svg>
      <View className="mt-2 flex-row items-center justify-end gap-1">
        <Text className="text-[10px] text-gray-500 dark:text-gray-400">Menor</Text>
        <View className="h-3 w-3 rounded-sm" style={{ backgroundColor: emptyColor }} />
        <View className="h-3 w-3 rounded-sm" style={{ backgroundColor: minColor }} />
        <View className="h-3 w-3 rounded-sm" style={{ backgroundColor: maxColor }} />
        <Text className="text-[10px] text-gray-500 dark:text-gray-400">Maior {modeLabel}</Text>
      </View>
    </View>
  );
};
