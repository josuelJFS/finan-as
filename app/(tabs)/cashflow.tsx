import React from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MonthlyCashFlow } from "../../src/components/MonthlyCashFlow";

export default function CashFlowScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900" style={{ paddingTop: insets.top }}>
      <MonthlyCashFlow />
    </View>
  );
}
