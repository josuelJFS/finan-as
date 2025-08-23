import React from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import FixedExpensesComponent from "../../src/components/FixedExpenses";

export default function FixedExpensesScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900" style={{ paddingTop: insets.top }}>
      <FixedExpensesComponent />
    </View>
  );
}
