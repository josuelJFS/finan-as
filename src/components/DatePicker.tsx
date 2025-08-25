import React, { useState } from "react";
import { View, Text, TouchableOpacity, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";

interface DatePickerProps {
  value: Date;
  onDateChange: (date: Date) => void;
  mode?: "date" | "time" | "datetime";
  label?: string;
  className?: string;
  error?: string;
}

export function DatePicker({
  value,
  onDateChange,
  mode = "date",
  label,
  className = "",
  error,
}: DatePickerProps) {
  const [showPicker, setShowPicker] = useState(false);

  const formatDate = (date: Date) => {
    switch (mode) {
      case "date":
        return date.toLocaleDateString("pt-BR");
      case "time":
        return date.toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        });
      case "datetime":
        return `${date.toLocaleDateString("pt-BR")} ${date.toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        })}`;
      default:
        return date.toLocaleDateString("pt-BR");
    }
  };

  const getIcon = () => {
    switch (mode) {
      case "date":
        return "calendar";
      case "time":
        return "time";
      case "datetime":
        return "calendar";
      default:
        return "calendar";
    }
  };

  const handlePress = () => {
    setShowPicker(true);
  };

  return (
    <View className={className}>
      {label && (
        <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">{label}</Text>
      )}

      <TouchableOpacity
        onPress={handlePress}
        className={`flex-row items-center justify-between rounded-lg border bg-gray-100 px-3 py-3 dark:bg-gray-700 ${
          error ? "border-red-500" : "border-gray-300 dark:border-gray-600"
        }`}
      >
        <Text className="text-base text-gray-900 dark:text-white">{formatDate(value)}</Text>
        <Ionicons name={getIcon() as any} size={20} className="text-gray-500" />
      </TouchableOpacity>

      {error && <Text className="mt-1 text-sm text-red-500">{error}</Text>}

      {showPicker && (
        <DateTimePicker
          value={value}
          mode={mode}
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(event, selectedDate) => {
            setShowPicker(Platform.OS === "ios");
            if (selectedDate) onDateChange(selectedDate);
          }}
          minimumDate={new Date(2000, 0, 1)}
          maximumDate={new Date(2100, 11, 31)}
        />
      )}
    </View>
  );
}
