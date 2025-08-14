import React, { useState } from "react";
import { View, Text, TextInput, ScrollView, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RecurrenceDAO } from "../../lib/database";
import type { RecurrenceFrequency, TransactionType } from "../../types/entities";
import { AccountSelector, CategorySelector, MoneyInput, DatePicker } from "../../components";
import { useRouter } from "expo-router";

export default function RecurrenceFormScreen() {
  const insets = useSafeAreaInsets();
  const bottomPadding = insets.bottom + 24;
  const [name, setName] = useState("");
  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState(0);
  const [frequency, setFrequency] = useState<RecurrenceFrequency>("monthly");
  const [intervalCount, setIntervalCount] = useState("1");
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [dayOfMonth, setDayOfMonth] = useState("");
  const [saving, setSaving] = useState(false);
  const [accountId, setAccountId] = useState("");
  const [destAccountId, setDestAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [notes, setNotes] = useState("");
  const [active, setActive] = useState(true);
  const router = useRouter();

  const handleSave = async () => {
    if (!name || !amount || !accountId) return;
    setSaving(true);
    try {
      const dao = RecurrenceDAO.getInstance();
      await dao.create({
        name,
        type,
        account_id: accountId,
        destination_account_id: type === "transfer" ? destAccountId || undefined : undefined,
        category_id: type !== "transfer" ? categoryId || undefined : undefined,
        amount: amount,
        description: name,
        notes: notes || undefined,
        frequency,
        interval_count: parseInt(intervalCount || "1", 10),
        start_date: startDate.toISOString().substring(0, 10),
        day_of_month: dayOfMonth ? parseInt(dayOfMonth, 10) : undefined,
        is_active: active,
      });
      router.back();
    } catch (e) {
      console.warn(e);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <ScrollView
      className="flex-1 bg-gray-50 p-4 dark:bg-gray-900"
      contentContainerStyle={{ paddingBottom: bottomPadding }}
      keyboardShouldPersistTaps="handled"
    >
      <View>
        {/* Tipo */}
        <Text className="mb-1 text-xs font-semibold text-gray-600 dark:text-gray-300">Tipo</Text>
        <View className="mb-4 flex-row overflow-hidden rounded-md border border-gray-300 dark:border-gray-600">
          {(["expense", "income", "transfer"] as TransactionType[]).map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => {
                setType(t);
                if (t === "transfer") setCategoryId("");
              }}
              className={`flex-1 p-3 ${
                type === t
                  ? t === "income"
                    ? "bg-green-500"
                    : t === "transfer"
                      ? "bg-blue-500"
                      : "bg-red-500"
                  : "bg-white dark:bg-gray-800"
              }`}
            >
              <Text
                className={`text-center text-sm font-medium ${
                  type === t ? "text-white" : "text-gray-900 dark:text-white"
                }`}
              >
                {t === "expense" ? "Despesa" : t === "income" ? "Receita" : "Transferência"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text className="mb-1 text-xs font-semibold text-gray-600 dark:text-gray-300">Nome</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          className="mb-4 rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
        />
        {/* Conta origem */}
        <Text className="mb-1 text-xs font-semibold text-gray-600 dark:text-gray-300">Conta</Text>
        <AccountSelector
          selectedAccountId={accountId}
          onAccountSelect={(a) => setAccountId(a.id)}
          placeholder="Selecione a conta"
        />
        {/* Conta destino para transfer */}
        {type === "transfer" && (
          <View className="mt-4">
            <Text className="mb-1 text-xs font-semibold text-gray-600 dark:text-gray-300">
              Conta destino
            </Text>
            <AccountSelector
              selectedAccountId={destAccountId}
              excludeAccountId={accountId}
              onAccountSelect={(a) => setDestAccountId(a.id)}
              placeholder="Conta destino"
            />
          </View>
        )}
        {/* Categoria para income/expense */}
        {type !== "transfer" && (
          <View className="mt-4">
            <Text className="mb-1 text-xs font-semibold text-gray-600 dark:text-gray-300">
              Categoria
            </Text>
            <CategorySelector
              selectedCategoryId={categoryId}
              transactionType={type as "income" | "expense"}
              onCategorySelect={(c) => setCategoryId(c.id)}
              placeholder="Selecione a categoria"
            />
          </View>
        )}
        {/* Valor */}
        <View className="mt-4">
          <Text className="mb-1 text-xs font-semibold text-gray-600 dark:text-gray-300">Valor</Text>
          <MoneyInput value={amount} onValueChange={setAmount} placeholder="0,00" />
        </View>
        <Text className="mb-1 text-xs font-semibold text-gray-600 dark:text-gray-300">
          Frequência
        </Text>
        <TextInput
          value={frequency}
          onChangeText={(t) => setFrequency(t as RecurrenceFrequency)}
          className="mb-4 rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
        />
        <Text className="mb-1 text-xs font-semibold text-gray-600 dark:text-gray-300">
          Intervalo
        </Text>
        <TextInput
          value={intervalCount}
          onChangeText={setIntervalCount}
          keyboardType="numeric"
          className="mb-4 rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
        />
        <Text className="mb-1 text-xs font-semibold text-gray-600 dark:text-gray-300">
          Data início
        </Text>
        <DatePicker value={startDate} onDateChange={setStartDate} />
        <Text className="mb-1 text-xs font-semibold text-gray-600 dark:text-gray-300">
          Dia do mês (opcional)
        </Text>
        <TextInput
          value={dayOfMonth}
          onChangeText={setDayOfMonth}
          keyboardType="numeric"
          className="mb-4 rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
        />
        <Text className="mb-1 text-xs font-semibold text-gray-600 dark:text-gray-300">Notas</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          multiline
          className="mb-4 rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
        />
        <TouchableOpacity
          onPress={() => setActive((a) => !a)}
          className={`mb-4 self-start rounded-md px-3 py-2 text-xs font-semibold ${
            active ? "bg-green-600" : "bg-gray-500"
          }`}
        >
          <Text className="text-white">{active ? "Ativa" : "Inativa"}</Text>
        </TouchableOpacity>

        <View className="mt-2 flex-row gap-3 border-t border-gray-200 pt-3 dark:border-gray-700">
          <TouchableOpacity
            onPress={handleCancel}
            className="flex-1 rounded-md bg-gray-200 py-3 dark:bg-gray-700"
          >
            <Text className="text-center font-semibold text-gray-900 dark:text-white">
              Cancelar
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving || !name || !amount || !accountId}
            className={`flex-1 rounded-md py-3 ${
              saving || !name || !amount || !accountId
                ? "bg-gray-300 dark:bg-gray-600"
                : "bg-blue-500"
            }`}
          >
            <Text className="text-center font-semibold text-white">
              {saving ? "Salvando..." : "Criar"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}
