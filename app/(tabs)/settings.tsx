import { View, Text, TouchableOpacity, Switch, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAppStore } from "../../src/lib/store";

export default function SettingsScreen() {
  const router = useRouter();
  const {
    theme,
    setTheme,
    currency,
    setCurrency,
    showAccountBalances,
    setShowAccountBalances,
    biometricEnabled,
    setBiometricEnabled,
  } = useAppStore();

  const handleThemeChange = () => {
    const themes = ["light", "dark", "system"] as const;
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  const getThemeLabel = () => {
    switch (theme) {
      case "light":
        return "Claro";
      case "dark":
        return "Escuro";
      case "system":
        return "Sistema";
      default:
        return "Claro";
    }
  };

  const handleBackup = () => {
    Alert.alert("Backup", "Funcionalidade de backup em desenvolvimento", [{ text: "OK" }]);
  };

  const handleRestore = () => {
    Alert.alert("Restaurar", "Funcionalidade de restauração em desenvolvimento", [{ text: "OK" }]);
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <View className="border-b border-gray-200 bg-white px-4 py-4 dark:border-gray-700 dark:bg-gray-800">
        <Text className="text-2xl font-bold text-gray-900 dark:text-white">Configurações</Text>
      </View>

      <ScrollView className="flex-1">
        {/* Aparência */}
        <View className="mx-4 mt-4 rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800">
          <Text className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Aparência
          </Text>

          <TouchableOpacity
            onPress={handleThemeChange}
            className="flex-row items-center justify-between py-3"
          >
            <View className="flex-row items-center">
              <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
                <Ionicons name="color-palette" size={20} className="text-blue-600" />
              </View>
              <View>
                <Text className="text-base font-medium text-gray-900 dark:text-white">Tema</Text>
                <Text className="text-sm text-gray-600 dark:text-gray-400">{getThemeLabel()}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} className="text-gray-400" />
          </TouchableOpacity>
        </View>

        {/* Privacidade e Segurança */}
        <View className="mx-4 mt-4 rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800">
          <Text className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Privacidade e Segurança
          </Text>

          <View className="flex-row items-center justify-between py-3">
            <View className="flex-row items-center">
              <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                <Ionicons name="eye" size={20} className="text-green-600" />
              </View>
              <View>
                <Text className="text-base font-medium text-gray-900 dark:text-white">
                  Mostrar Saldos
                </Text>
                <Text className="text-sm text-gray-600 dark:text-gray-400">
                  Exibir valores na tela inicial
                </Text>
              </View>
            </View>
            <Switch
              value={showAccountBalances}
              onValueChange={setShowAccountBalances}
              trackColor={{ false: "#d1d5db", true: "#3b82f6" }}
              thumbColor={showAccountBalances ? "#ffffff" : "#f3f4f6"}
            />
          </View>

          <View className="flex-row items-center justify-between py-3">
            <View className="flex-row items-center">
              <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900">
                <Ionicons name="finger-print" size={20} className="text-purple-600" />
              </View>
              <View>
                <Text className="text-base font-medium text-gray-900 dark:text-white">
                  Biometria
                </Text>
                <Text className="text-sm text-gray-600 dark:text-gray-400">
                  Usar biometria para autenticação
                </Text>
              </View>
            </View>
            <Switch
              value={biometricEnabled}
              onValueChange={setBiometricEnabled}
              trackColor={{ false: "#d1d5db", true: "#3b82f6" }}
              thumbColor={biometricEnabled ? "#ffffff" : "#f3f4f6"}
            />
          </View>
        </View>

        {/* Gerenciar */}
        <View className="mx-4 mt-4 rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800">
          <Text className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Gerenciar
          </Text>

          <TouchableOpacity
            onPress={() => router.push("/accounts")}
            className="flex-row items-center justify-between py-3"
          >
            <View className="flex-row items-center">
              <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900">
                <Ionicons name="wallet" size={20} className="text-indigo-600" />
              </View>
              <View>
                <Text className="text-base font-medium text-gray-900 dark:text-white">Contas</Text>
                <Text className="text-sm text-gray-600 dark:text-gray-400">
                  Gerenciar suas contas
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} className="text-gray-400" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/categories")}
            className="flex-row items-center justify-between py-3"
          >
            <View className="flex-row items-center">
              <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                <Ionicons name="grid" size={20} className="text-green-600" />
              </View>
              <View>
                <Text className="text-base font-medium text-gray-900 dark:text-white">
                  Categorias
                </Text>
                <Text className="text-sm text-gray-600 dark:text-gray-400">
                  Organizar suas transações
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} className="text-gray-400" />
          </TouchableOpacity>

          <TouchableOpacity className="flex-row items-center justify-between py-3">
            <View className="flex-row items-center">
              <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900">
                <Ionicons name="pricetag" size={20} className="text-yellow-600" />
              </View>
              <View>
                <Text className="text-base font-medium text-gray-900 dark:text-white">
                  Categorias
                </Text>
                <Text className="text-sm text-gray-600 dark:text-gray-400">
                  Gerenciar categorias
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} className="text-gray-400" />
          </TouchableOpacity>
        </View>

        {/* Dados e Backup */}
        <View className="mx-4 mt-4 rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800">
          <Text className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Dados e Backup
          </Text>

          <TouchableOpacity
            onPress={handleBackup}
            className="flex-row items-center justify-between py-3"
          >
            <View className="flex-row items-center">
              <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
                <Ionicons name="cloud-upload" size={20} className="text-blue-600" />
              </View>
              <View>
                <Text className="text-base font-medium text-gray-900 dark:text-white">
                  Fazer Backup
                </Text>
                <Text className="text-sm text-gray-600 dark:text-gray-400">
                  Exportar dados para arquivo
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} className="text-gray-400" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleRestore}
            className="flex-row items-center justify-between py-3"
          >
            <View className="flex-row items-center">
              <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900">
                <Ionicons name="cloud-download" size={20} className="text-orange-600" />
              </View>
              <View>
                <Text className="text-base font-medium text-gray-900 dark:text-white">
                  Restaurar
                </Text>
                <Text className="text-sm text-gray-600 dark:text-gray-400">
                  Importar dados de arquivo
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} className="text-gray-400" />
          </TouchableOpacity>
        </View>

        {/* Sobre */}
        <View className="mx-4 mb-6 mt-4 rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800">
          <Text className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Sobre</Text>

          <View className="flex-row items-center justify-between py-3">
            <View className="flex-row items-center">
              <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
                <Ionicons name="information-circle" size={20} className="text-gray-600" />
              </View>
              <View>
                <Text className="text-base font-medium text-gray-900 dark:text-white">Versão</Text>
                <Text className="text-sm text-gray-600 dark:text-gray-400">1.0.0</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
