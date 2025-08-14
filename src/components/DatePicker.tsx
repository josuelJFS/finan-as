import React, { useState } from "react";
import { View, Text, TouchableOpacity, Modal, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";

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

  // Por enquanto, vamos usar um seletor simples
  // TODO: Implementar com expo-date-picker quando necessário
  const handlePress = () => {
    // Por enquanto, apenas atualiza para data atual
    // Em produção, implementar modal com seletor de data
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

      {/* Modal simples para demonstração */}
      <Modal visible={showPicker} transparent animationType="fade">
        <View className="flex-1 items-center justify-center bg-black/50">
          <View className="mx-4 w-80 rounded-xl bg-white p-6 dark:bg-gray-800">
            <Text className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              Selecionar {mode === "date" ? "Data" : mode === "time" ? "Hora" : "Data e Hora"}
            </Text>

            <Text className="mb-6 text-center text-gray-600 dark:text-gray-400">
              Data atual: {formatDate(new Date())}
            </Text>

            <View className="flex-row justify-between">
              <TouchableOpacity
                onPress={() => setShowPicker(false)}
                className="mr-2 flex-1 rounded-lg bg-gray-300 px-6 py-3 dark:bg-gray-600"
              >
                <Text className="text-center font-medium text-gray-700 dark:text-gray-300">
                  Cancelar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  onDateChange(new Date());
                  setShowPicker(false);
                }}
                className="ml-2 flex-1 rounded-lg bg-blue-500 px-6 py-3"
              >
                <Text className="text-center font-medium text-white">Hoje</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
