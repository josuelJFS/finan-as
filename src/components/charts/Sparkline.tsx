import React from "react";
import { View } from "react-native";
import Svg, { Path, G } from "react-native-svg";

interface DataPoint {
  value: number;
  timestamp?: string;
}

interface Props {
  data: DataPoint[];
  width?: number;
  height?: number;
  color?: string;
  strokeWidth?: number;
  smooth?: boolean;
}

export const Sparkline: React.FC<Props> = ({
  data,
  width = 60,
  height = 30,
  color = "#059669",
  strokeWidth = 1.5,
  smooth = true,
}) => {
  if (!data || data.length < 2) {
    return <View style={{ width, height }} className="rounded bg-gray-100 dark:bg-gray-700" />;
  }

  const padding = 2;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const minValue = Math.min(...data.map((d) => d.value));
  const maxValue = Math.max(...data.map((d) => d.value));
  const valueRange = maxValue - minValue || 1;

  const points = data.map((d, i) => ({
    x: padding + (i / (data.length - 1)) * chartWidth,
    y: padding + ((maxValue - d.value) / valueRange) * chartHeight,
  }));

  const createPath = () => {
    if (points.length === 0) return "";

    if (!smooth) {
      // Linha reta
      let path = `M ${points[0].x} ${points[0].y}`;
      for (let i = 1; i < points.length; i++) {
        path += ` L ${points[i].x} ${points[i].y}`;
      }
      return path;
    }

    // Linha suave com curvas de Bézier
    let path = `M ${points[0].x} ${points[0].y}`;

    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];

      // Pontos de controle para suavização
      const cp1x = prev.x + (curr.x - prev.x) * 0.4;
      const cp1y = prev.y;
      const cp2x = curr.x - (curr.x - prev.x) * 0.4;
      const cp2y = curr.y;

      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
    }

    return path;
  };

  const linePath = createPath();

  // Determinar cor baseada na tendência
  const trend = data.length >= 2 ? data[data.length - 1].value - data[0].value : 0;
  const lineColor = trend >= 0 ? color : "#dc2626";

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <G>
          <Path
            d={linePath}
            stroke={lineColor}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </G>
      </Svg>
    </View>
  );
};
