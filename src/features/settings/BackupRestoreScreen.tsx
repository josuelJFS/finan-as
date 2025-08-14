import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from "react-native";
// expo-document-picker instalado; import direto
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { shareBackup, importBackup } from "../../lib/backup";
import { Events } from "../../lib/events";

export default function BackupRestoreScreen() {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  const doExport = async () => {
    setExporting(true);
    try {
      const path = await shareBackup();
      Alert.alert("Backup", `Arquivo gerado: ${path.split("/").pop()}`);
    } catch (e: any) {
      Alert.alert("Erro", e.message || "Falha ao exportar");
    } finally {
      setExporting(false);
    }
  };

  const doImport = async () => {
    try {
      const pick = await DocumentPicker.getDocumentAsync({ type: "application/json" });
      if (pick.canceled || !pick.assets || !pick.assets[0]) return;
      setImporting(true);
      const asset = pick.assets[0];
      let content = "";
      if (asset.uri.startsWith("file")) {
        content = await FileSystem.readAsStringAsync(asset.uri);
      } else if ((asset as any).file) {
        content = await FileSystem.readAsStringAsync((asset as any).file); // fallback
      }
      await importBackup(content, { overwrite: true });
      // Disparar eventos para atualizar UI
      Events.emit("transactions:changed", { action: "import" } as any);
      Events.emit("accounts:balancesChanged", undefined as any);
      Events.emit("budgets:progressInvalidated", { reason: "import" } as any);
      Alert.alert("Importação", "Backup importado com sucesso");
    } catch (e: any) {
      console.warn(e);
      Alert.alert("Erro", e.message || "Falha ao importar backup");
    } finally {
      setImporting(false);
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-gray-50 p-6 dark:bg-gray-900"
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <Text className="mb-4 text-xl font-bold text-gray-900 dark:text-white">Backup & Restore</Text>
      <Text className="mb-6 text-sm leading-5 text-gray-600 dark:text-gray-300">
        Exporte um arquivo JSON contendo todas as suas contas, categorias, transações, orçamentos,
        recorrências e configurações. Guarde em local seguro. Para restaurar, importe um arquivo
        previamente exportado (versão 1).
      </Text>
      <View className="mb-8 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <Text className="mb-2 text-base font-semibold text-gray-900 dark:text-white">Exportar</Text>
        <Text className="mb-4 text-xs text-gray-600 dark:text-gray-400">
          Gera arquivo JSON e abre compartilhamento do sistema.
        </Text>
        <TouchableOpacity
          disabled={exporting}
          onPress={doExport}
          className={`rounded-md px-4 py-3 ${exporting ? "bg-gray-300 dark:bg-gray-600" : "bg-blue-600"}`}
        >
          {exporting ? (
            <View className="flex-row items-center justify-center">
              <ActivityIndicator color="#fff" />
              <Text className="ml-2 font-semibold text-white">Gerando...</Text>
            </View>
          ) : (
            <Text className="text-center font-semibold text-white">Exportar Backup</Text>
          )}
        </TouchableOpacity>
      </View>
      <View className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <Text className="mb-2 text-base font-semibold text-gray-900 dark:text-white">Importar</Text>
        <Text className="mb-4 text-xs text-gray-600 dark:text-gray-400">
          Substitui todos os dados locais pelo arquivo selecionado (overwrite completo).
        </Text>
        <TouchableOpacity
          disabled={importing}
          onPress={doImport}
          className={`rounded-md px-4 py-3 ${importing ? "bg-gray-300 dark:bg-gray-600" : "bg-rose-600"}`}
        >
          {importing ? (
            <View className="flex-row items-center justify-center">
              <ActivityIndicator color="#fff" />
              <Text className="ml-2 font-semibold text-white">Importando...</Text>
            </View>
          ) : (
            <Text className="text-center font-semibold text-white">Importar Backup</Text>
          )}
        </TouchableOpacity>
      </View>
      <Text className="mt-6 text-[11px] leading-4 text-gray-500 dark:text-gray-400">
        Atenção: funcionalidade inicial. Recomenda-se testar exportar e reimportar antes de depender
        como única cópia.
      </Text>
    </ScrollView>
  );
}
