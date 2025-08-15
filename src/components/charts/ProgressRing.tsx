import React, { useEffect } from "react";
import { View, Text } from "react-native";
import Svg, { Circle, G } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  interpolate,
  Extrapolate,
} from "react-native-reanimated";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface Props {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  showPercentage?: boolean;
  title?: string;
  subtitle?: string;
  duration?: number;
}

export const ProgressRing: React.FC<Props> = ({
  progress,
  size = 100,
  strokeWidth = 8,
  color = "#059669",
  backgroundColor = "#e5e7eb",
  showPercentage = true,
  title,
  subtitle,
  duration = 1000,
}) => {
  const animatedValue = useSharedValue(0);
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    animatedValue.value = withTiming(progress, { duration });
  }, [progress, duration]);

  const animatedProps = useAnimatedProps(() => {
    const strokeDashoffset = interpolate(
      animatedValue.value,
      [0, 100],
      [circumference, 0],
      Extrapolate.CLAMP
    );

    return {
      strokeDashoffset,
    };
  });

  const getProgressColor = (value: number) => {
    if (value >= 100) return "#dc2626"; // red-600
    if (value >= 80) return "#f59e0b"; // amber-500
    return color;
  };

  const progressColor = getProgressColor(progress);

  return (
    <View className="items-center">
      {title && (
        <Text className="mb-2 text-sm font-medium text-gray-900 dark:text-white">{title}</Text>
      )}

      <View style={{ width: size, height: size }} className="relative">
        <Svg width={size} height={size}>
          <G>
            {/* Background circle */}
            <Circle
              cx={center}
              cy={center}
              r={radius}
              stroke={backgroundColor}
              strokeWidth={strokeWidth}
              fill="none"
            />

            {/* Progress circle */}
            <AnimatedCircle
              cx={center}
              cy={center}
              r={radius}
              stroke={progressColor}
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              animatedProps={animatedProps}
              transform={`rotate(-90 ${center} ${center})`}
            />
          </G>
        </Svg>

        {/* Center content */}
        <View className="absolute inset-0 items-center justify-center">
          {showPercentage && (
            <Text className="text-lg font-bold text-gray-900 dark:text-white">
              {Math.round(progress)}%
            </Text>
          )}
          {subtitle && <Text className="text-xs text-gray-600 dark:text-gray-400">{subtitle}</Text>}
        </View>
      </View>
    </View>
  );
};
