import React, { useEffect, useState, useMemo } from "react";
import { View, Text, TextInput, ScrollView, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RecurrenceDAO } from "../../lib/database";
import type { RecurrenceFrequency, TransactionType } from "../../types/entities";
import { AccountSelector, CategorySelector, MoneyInput, DatePicker } from "../../components";
import { useRouter, useLocalSearchParams } from "expo-router";

export default function RecurrenceFormScreen() {
  const insets = useSafeAreaInsets();
  const bottomPadding = insets.bottom + 24;
  const [name, setName] = useState("");
  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState(0);
  const [frequency, setFrequency] = useState<RecurrenceFrequency>("monthly");
  const [intervalCount, setIntervalCount] = useState("1");
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [dayOfMonth, setDayOfMonth] = useState("");
  const [saving, setSaving] = useState(false);
  const [accountId, setAccountId] = useState("");
  const [destAccountId, setDestAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [notes, setNotes] = useState("");
  const [active, setActive] = useState(true);
  const [weekDays, setWeekDays] = useState<number[]>([]); // 0=Dom ... 6=Sab
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [touched, setTouched] = useState(false);
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const editingId = params.id as string | undefined;

  useEffect(() => {
    if (editingId) {
      (async () => {
        try {
          const dao = RecurrenceDAO.getInstance();
          const r = await dao.getById(editingId);
          if (r) {
            setName(r.name);
            setType(r.type);
            setAmount(r.amount);
            setFrequency(r.frequency);
            setIntervalCount(String(r.interval_count));
            setStartDate(new Date(r.start_date));
            setDayOfMonth(r.day_of_month ? String(r.day_of_month) : "");
            setAccountId(r.account_id);
            setDestAccountId(r.destination_account_id || "");
            setCategoryId(r.category_id || "");
            setNotes(r.notes || "");
            setActive(r.is_active);
            setWeekDays(r.days_of_week || []);
          }
        } catch (e) {
          console.warn(e);
        }
      })();
    }
  }, [editingId]);

  const handleSave = async () => {
    if (!name || !amount || !accountId) return;
    // validações específicas
    if (frequency === "weekly" && weekDays.length === 0) return;
    if (
      frequency === "monthly" &&
      dayOfMonth &&
      (parseInt(dayOfMonth, 10) < 1 || parseInt(dayOfMonth, 10) > 31)
    )
      return;
    if (type === "transfer" && !destAccountId) return;
    if (parseInt(intervalCount || "1", 10) < 1) return;
    if (endDate && endDate < startDate) return;
    setSaving(true);
    try {
      const dao = RecurrenceDAO.getInstance();
      if (editingId) {
        await dao.update(editingId, {
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
          end_date: endDate ? endDate.toISOString().substring(0, 10) : undefined,
          day_of_month: dayOfMonth ? parseInt(dayOfMonth, 10) : undefined,
          is_active: active,
          days_of_week:
            frequency === "weekly" ? (weekDays.length ? weekDays : undefined) : undefined,
        });
      } else {
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
          end_date: endDate ? endDate.toISOString().substring(0, 10) : undefined,
          day_of_month: dayOfMonth ? parseInt(dayOfMonth, 10) : undefined,
          is_active: active,
          days_of_week:
            frequency === "weekly" ? (weekDays.length ? weekDays : undefined) : undefined,
        });
      }
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

  // Regras de validação e mensagens
  const validationMessage = useMemo(() => {
    if (!name) return "Informe um nome";
    if (!accountId) return "Selecione a conta";
    if (!amount) return "Informe o valor";
    if (type === "transfer" && !destAccountId) return "Selecione a conta destino";
    const intervalNum = parseInt(intervalCount || "1", 10);
    if (isNaN(intervalNum) || intervalNum < 1) return "Intervalo deve ser >= 1";
    if (frequency === "weekly" && weekDays.length === 0)
      return "Selecione ao menos 1 dia da semana";
    if (frequency === "monthly" && dayOfMonth) {
      const d = parseInt(dayOfMonth, 10);
      if (isNaN(d) || d < 1 || d > 31) return "Dia do mês inválido";
    }
    if (endDate && endDate < startDate) return "Data fim anterior à inicial";
    return null;
  }, [
    name,
    accountId,
    amount,
    type,
    destAccountId,
    intervalCount,
    frequency,
    weekDays,
    dayOfMonth,
    startDate,
    endDate,
  ]);

  const disabled = !!validationMessage || saving;

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
        {frequency === "weekly" && (
          <View className="mt-4">
            <Text className="mb-1 text-xs font-semibold text-gray-600 dark:text-gray-300">
              Dias da semana
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {["D", "S", "T", "Q", "Q", "S", "S"].map((lbl, idx) => {
                const activeDay = weekDays.includes(idx);
                return (
                  <TouchableOpacity
                    key={idx}
                    onPress={() =>
                      setWeekDays((prev) =>
                        prev.includes(idx) ? prev.filter((d) => d !== idx) : [...prev, idx]
                      )
                    }
                    className={`w-9 items-center rounded-md py-2 ${activeDay ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"}`}
                  >
                    <Text
                      className={`text-xs font-semibold ${activeDay ? "text-white" : "text-gray-800 dark:text-gray-200"}`}
                    >
                      {lbl}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
        <Text className="mb-1 mt-4 text-xs font-semibold text-gray-600 dark:text-gray-300">
          Frequência
        </Text>
        <View className="mb-4 flex-row overflow-hidden rounded-md border border-gray-300 dark:border-gray-600">
          {(["daily", "weekly", "monthly", "yearly"] as RecurrenceFrequency[]).map((f) => (
            <TouchableOpacity
              key={f}
              onPress={() => {
                setFrequency(f);
                // Reset campos específicos
                if (f !== "weekly") setWeekDays([]);
                if (f !== "monthly") setDayOfMonth("");
              }}
              className={`flex-1 p-3 ${
                frequency === f ? "bg-blue-600" : "bg-white dark:bg-gray-800"
              }`}
            >
              <Text
                className={`text-center text-xs font-medium ${
                  frequency === f ? "text-white" : "text-gray-800 dark:text-gray-200"
                }`}
              >
                {f === "daily"
                  ? "Diária"
                  : f === "weekly"
                    ? "Semanal"
                    : f === "monthly"
                      ? "Mensal"
                      : "Anual"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
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
        {frequency === "monthly" && (
          <>
            <Text className="mb-1 mt-4 text-xs font-semibold text-gray-600 dark:text-gray-300">
              Dia do mês (opcional)
            </Text>
            <TextInput
              value={dayOfMonth}
              onChangeText={setDayOfMonth}
              keyboardType="numeric"
              className="mb-4 rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            />
          </>
        )}
        <View className="mt-2">
          <TouchableOpacity
            onPress={() => setShowEndDatePicker((v) => !v)}
            className="self-start rounded-md bg-gray-200 px-3 py-2 dark:bg-gray-700"
          >
            <Text className="text-xs font-semibold text-gray-800 dark:text-gray-200">
              {showEndDatePicker ? "Remover data fim" : "Adicionar data fim"}
            </Text>
          </TouchableOpacity>
          {showEndDatePicker && (
            <View className="mt-3">
              <Text className="mb-1 text-xs font-semibold text-gray-600 dark:text-gray-300">
                Data fim (opcional)
              </Text>
              <DatePicker value={endDate || new Date()} onDateChange={(d) => setEndDate(d)} />
            </View>
          )}
        </View>
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
        {touched && validationMessage && (
          <Text className="mb-2 text-xs font-medium text-red-600 dark:text-red-400">
            {validationMessage}
          </Text>
        )}

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
            onPress={() => {
              setTouched(true);
              handleSave();
            }}
            disabled={disabled}
            className={`flex-1 rounded-md py-3 ${disabled ? "bg-gray-300 dark:bg-gray-600" : "bg-blue-500"}`}
          >
            <Text className="text-center font-semibold text-white">
              {saving ? "Salvando..." : editingId ? "Atualizar" : "Criar"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}
