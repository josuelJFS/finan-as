import { View, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAppStore } from "../src/lib/store";
import { Ionicons } from "@expo/vector-icons";

export default function OnboardingScreen() {
  const router = useRouter();
  const { setOnboardingCompleted } = useAppStore();

  const handleCompleteOnboarding = () => {
    setOnboardingCompleted(true);
    router.replace("/(tabs)");
  };

  return (
    <SafeAreaView className="flex-1 bg-green-600">
      <View className="flex-1 items-center justify-center px-6">
        {/* Icon */}
        <View className="mb-8 h-24 w-24 items-center justify-center rounded-full bg-white">
          <Ionicons name="wallet" size={48} color="#16a34a" />
        </View>

        {/* Title */}
        <Text className="mb-4 text-center text-3xl font-bold text-white">
          Bem-vindo ao AppFinança
        </Text>

        {/* Subtitle */}
        <Text className="mb-12 text-center text-lg leading-6 text-green-100">
          Gerencie suas finanças pessoais de forma simples e eficiente
        </Text>

        {/* Features */}
        <View className="mb-12 w-full">
          <View className="mb-4 flex-row items-center">
            <Ionicons name="checkmark-circle" size={24} color="white" />
            <Text className="ml-3 text-base text-white">Controle de receitas e despesas</Text>
          </View>

          <View className="mb-4 flex-row items-center">
            <Ionicons name="checkmark-circle" size={24} color="white" />
            <Text className="ml-3 text-base text-white">Orçamentos e metas financeiras</Text>
          </View>

          <View className="mb-4 flex-row items-center">
            <Ionicons name="checkmark-circle" size={24} color="white" />
            <Text className="ml-3 text-base text-white">Relatórios e gráficos detalhados</Text>
          </View>

          <View className="flex-row items-center">
            <Ionicons name="checkmark-circle" size={24} color="white" />
            <Text className="ml-3 text-base text-white">Dados seguros e offline</Text>
          </View>
        </View>

        {/* Get Started Button */}
        <TouchableOpacity
          onPress={handleCompleteOnboarding}
          className="w-full rounded-full bg-white px-8 py-4"
        >
          <Text className="text-center text-lg font-semibold text-green-600">Começar agora</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
