import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface MoneyInputProps {
  value: number;
  onValueChange: (value: number) => void;
  placeholder?: string;
  currency?: string;
  className?: string;
  error?: string;
}

export function MoneyInput({
  value,
  onValueChange,
  placeholder = "0,00",
  currency = "R$",
  className = "",
  error,
}: MoneyInputProps) {
  const [focused, setFocused] = useState(false);
  const [displayValue, setDisplayValue] = useState(value > 0 ? formatMoney(value) : "");

  function formatMoney(amount: number): string {
    return amount.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function parseMoney(text: string): number {
    // Remove tudo exceto números e vírgula
    const cleaned = text.replace(/[^\d,]/g, "");
    // Substitui vírgula por ponto
    const withDot = cleaned.replace(",", ".");
    // Converte para número
    return parseFloat(withDot) || 0;
  }

  const handleChangeText = (text: string) => {
    setDisplayValue(text);
    const numericValue = parseMoney(text);
    onValueChange(numericValue);
  };

  const handleFocus = () => {
    setFocused(true);
  };

  const handleBlur = () => {
    setFocused(false);
    if (value > 0) {
      setDisplayValue(formatMoney(value));
    }
  };

  return (
    <View className={className}>
      <View
        className={`flex-row items-center rounded-lg bg-gray-100 px-3 py-3 dark:bg-gray-700 ${
          focused ? "border-2 border-blue-500" : "border border-gray-300 dark:border-gray-600"
        } ${error ? "border-red-500" : ""}`}
      >
        <Text className="mr-2 text-lg font-medium text-gray-700 dark:text-gray-300">
          {currency}
        </Text>
        <TextInput
          className="flex-1 text-lg font-medium text-gray-900 dark:text-white"
          value={displayValue}
          onChangeText={handleChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          placeholderTextColor="#9ca3af"
          keyboardType="numeric"
          returnKeyType="done"
        />
      </View>
      {error && <Text className="mt-1 text-sm text-red-500">{error}</Text>}
    </View>
  );
}
