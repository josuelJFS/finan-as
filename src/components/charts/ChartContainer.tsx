import React from "react";
import { View, Text } from "react-native";

interface Props {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  className?: string;
  isLoading?: boolean;
}

export const ChartContainer: React.FC<Props> = ({
  children,
  title,
  subtitle,
  className = "",
  isLoading = false,
}) => {
  return (
    <View className={`rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800 ${className}`}>
      {(title || subtitle) && (
        <View className="mb-4">
          {title && (
            <Text className="text-lg font-semibold text-gray-900 dark:text-white">{title}</Text>
          )}
          {subtitle && (
            <Text className="mt-1 text-sm text-gray-600 dark:text-gray-400">{subtitle}</Text>
          )}
        </View>
      )}

      {isLoading ? <ChartSkeleton /> : children}
    </View>
  );
};

export const ChartSkeleton: React.FC<{ height?: number }> = ({ height = 200 }) => {
  return (
    <View style={{ height }} className="rounded-lg bg-gray-100 dark:bg-gray-700">
      <View className="animate-pulse">
        {/* Skeleton bars */}
        <View className="flex-row items-end justify-between p-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <View
              key={i}
              className="bg-gray-200 dark:bg-gray-600"
              style={{
                width: 16,
                height: Math.random() * 80 + 20,
                borderRadius: 2,
              }}
            />
          ))}
        </View>

        {/* Skeleton legend */}
        <View className="mt-4 flex-row justify-center gap-4">
          <View className="h-3 w-16 rounded bg-gray-200 dark:bg-gray-600" />
          <View className="h-3 w-16 rounded bg-gray-200 dark:bg-gray-600" />
        </View>
      </View>
    </View>
  );
};
