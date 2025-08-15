import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
  FlatList,
  TextInput,
} from "react-native";
import { Share, Platform } from "react-native";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { TransactionDAO, AccountDAO, CategoryDAO } from "../../lib/database";
import { exportTransactionsCsv } from "./exportCsv";
import { FilterChips, AdvancedFilterModal } from "../../components";
import { PresetsModal } from "../../components/PresetsModal";
import { formatCurrency } from "../../lib/utils";
import type { Transaction, Account, Category, TransactionFilters } from "../../types/entities";
import { useAppStore } from "../../lib/store";
import { Events } from "../../lib/events";
import { countActiveFilters } from "./filtersUtil";

interface TransactionWithDetails extends Transaction {
  account_name: string;
  category_name?: string;
  destination_account_name?: string;
}

export default function TransactionsListScreen() {
  const [transactions, setTransactions] = useState<TransactionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filters, setFilters] = useState<TransactionFilters>({});
  const [rangeKey, setRangeKey] = useState<string>("month");
  const [showAccountsModal, setShowAccountsModal] = useState(false);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [showAdvancedModal, setShowAdvancedModal] = useState(false);
  const [tempSearch, setTempSearch] = useState("");
  const [tempAmountMin, setTempAmountMin] = useState<string>("");
  const [tempAmountMax, setTempAmountMax] = useState<string>("");
  const [tempTags, setTempTags] = useState<string>("");
  const [tempPendingOnly, setTempPendingOnly] = useState<boolean>(false);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [csvSeparator, setCsvSeparator] = useState<string>(",");
  const [markTransfers, setMarkTransfers] = useState<boolean>(true);
  const [tagsMode, setTagsMode] = useState<"ANY" | "ALL">("ANY");
  const [includeTransfers, setIncludeTransfers] = useState(true);
  const [showPresetsModal, setShowPresetsModal] = useState(false);
  // Fallback rename modal (Android / platforms sem Alert.prompt)
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [renamingFilterId, setRenamingFilterId] = useState<string | null>(null);
  const lastUsedFilters = useAppStore((s) => s.lastUsedFilters);
  const setLastUsedFilters = useAppStore((s) => s.setLastUsedFilters);
  const savedFilters = useAppStore((s) => s.savedFilters);
  const addSavedFilter = useAppStore((s) => s.addSavedFilter);
  const removeSavedFilter = useAppStore((s) => s.removeSavedFilter);
  const updateSavedFilterName = useAppStore((s) => s.updateSavedFilterName as any);

  const router = useRouter();
  const transactionDAO = TransactionDAO.getInstance();
  const accountDAO = AccountDAO.getInstance();
  const categoryDAO = CategoryDAO.getInstance();

  // Recarregar quando a tela ganhar foco
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = useCallback(async (overrideFilters?: TransactionFilters) => {
    try {
      setLoading(true);

      // Carregar dados base
      const [accountsData, categoriesData] = await Promise.all([
        accountDAO.findAll(),
        categoryDAO.findAll(),
      ]);

      setAccounts(accountsData);
      setCategories(categoriesData);

      // Carregar transações
      await loadTransactions(accountsData, categoriesData, overrideFilters);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      Alert.alert("Erro", "Não foi possível carregar os dados");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTransactions = useCallback(
    async (
      accountsData?: Account[],
      categoriesData?: Category[],
      overrideFilters?: TransactionFilters
    ) => {
      try {
        const accountsList = accountsData || accounts;
        const categoriesList = categoriesData || categories;
        const effectiveFilters = overrideFilters || filters;
        const transactionsData = await transactionDAO.findAll(effectiveFilters);

        // Enriquecer transações com nomes de conta e categoria
        const enrichedTransactions = transactionsData.map((transaction) => {
          const account = accountsList.find((acc) => acc.id === transaction.account_id);
          const category = categoriesList.find((cat) => cat.id === transaction.category_id);
          const destinationAccount = accountsList.find(
            (acc) => acc.id === transaction.destination_account_id
          );

          return {
            ...transaction,
            account_name: account?.name || "Conta não encontrada",
            category_name: category?.name,
            destination_account_name: destinationAccount?.name,
          };
        });

        // Ordenar por data (mais recente primeiro)
        enrichedTransactions.sort(
          (a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()
        );

        setTransactions(enrichedTransactions);
      } catch (error) {
        console.error("Erro ao carregar transações:", error);
        Alert.alert("Erro", "Não foi possível carregar as transações");
      }
    },
    [accounts, categories, filters]
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData(filters);
    setRefreshing(false);
  }, [filters, loadData]);

  // Carregar filtros persistidos ao montar
  useEffect(() => {
    if (lastUsedFilters) {
      setFilters(lastUsedFilters);
      if (lastUsedFilters.account_ids) {
        setSelectedAccountIds(lastUsedFilters.account_ids);
      }
      // Derivar rangeKey simples
      if (lastUsedFilters.date_from && lastUsedFilters.date_to) {
        const from = new Date(lastUsedFilters.date_from);
        const to = new Date(lastUsedFilters.date_to);
        const now = new Date();
        const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        if (from.getTime() === startMonth.getTime() && to.getTime() === endMonth.getTime()) {
          setRangeKey("month");
        }
      }
    } else {
      applyRange("month");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Assinar eventos para recarregar sem perder filtros
  useEffect(() => {
    const off = Events.on("transactions:changed", () => {
      loadTransactions();
    });
    return off;
  }, [loadTransactions]);

  const applyRange = (key: string) => {
    const now = new Date();
    let date_from: string | undefined;
    let date_to: string | undefined;
    switch (key) {
      case "today": {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        date_from = start.toISOString();
        date_to = end.toISOString();
        break;
      }
      case "week": {
        // Considerar semana começando na segunda-feira
        const day = now.getDay(); // 0 domingo
        const diffToMonday = (day + 6) % 7; // transforma domingo (0) em 6
        const start = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - diffToMonday,
          0,
          0,
          0
        );
        const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
        end.setHours(23, 59, 59, 999);
        date_from = start.toISOString();
        date_to = end.toISOString();
        break;
      }
      case "7d": {
        const from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        date_from = from.toISOString();
        date_to = now.toISOString();
        break;
      }
      case "30d": {
        const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        date_from = from.toISOString();
        date_to = now.toISOString();
        break;
      }
      case "lastMonth": {
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        date_from = start.toISOString();
        date_to = end.toISOString();
        break;
      }
      case "month":
      default: {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        date_from = start.toISOString();
        date_to = end.toISOString();
      }
    }
    setRangeKey(key);
    const updated = { ...filters, date_from, date_to };
    setFilters(updated);
    setLastUsedFilters(updated);
    loadTransactions(undefined, undefined, updated);
  };

  const toggleType = (type: Transaction["type"]) => {
    const current = filters.transaction_types || [];
    const exists = current.includes(type);
    const updatedTypes = exists ? current.filter((t) => t !== type) : [...current, type];
    const updated = {
      ...filters,
      transaction_types: updatedTypes.length ? updatedTypes : undefined,
    };
    setFilters(updated);
    setLastUsedFilters(updated);
    loadTransactions(undefined, undefined, updated);
  };

  const toggleAccount = (id: string) => {
    let next: string[] = [];
    if (selectedAccountIds.includes(id)) {
      next = selectedAccountIds.filter((a) => a !== id);
    } else {
      next = [...selectedAccountIds, id];
    }
    setSelectedAccountIds(next);
    const updated = { ...filters, account_ids: next.length ? next : undefined };
    setFilters(updated);
    setLastUsedFilters(updated);
  };

  const applyAccounts = () => {
    setShowAccountsModal(false);
    loadTransactions();
  };

  const clearFilters = () => {
    const base: TransactionFilters = {};
    setFilters(base);
    setSelectedAccountIds([]);
    setRangeKey("month");
    setLastUsedFilters(base);
    applyRange("month");
  };

  const activeFiltersCount = countActiveFilters(filters);

  const handleDeleteTransaction = async (transaction: TransactionWithDetails) => {
    Alert.alert(
      "Excluir Transação",
      `Tem certeza que deseja excluir esta transação?\n\nEsta ação não pode ser desfeita.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            try {
              await transactionDAO.delete(transaction.id);
              await loadTransactions();
            } catch (error) {
              console.error("Erro ao excluir transação:", error);
              Alert.alert("Erro", "Não foi possível excluir a transação");
            }
          },
        },
      ]
    );
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "income":
        return "arrow-down";
      case "expense":
        return "arrow-up";
      case "transfer":
        return "swap-horizontal";
      default:
        return "receipt";
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case "income":
        return "#10b981"; // green
      case "expense":
        return "#ef4444"; // red
      case "transfer":
        return "#16a34a"; // primary green
      default:
        return "#6b7280"; // gray
    }
  };

  const getTransactionTypeLabel = (type: string) => {
    switch (type) {
      case "income":
        return "Receita";
      case "expense":
        return "Despesa";
      case "transfer":
        return "Transferência";
      default:
        return "Transação";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900">
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-600 dark:text-gray-400">Carregando transações...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <View className="border-b border-gray-200 bg-white px-4 py-4 dark:border-gray-700 dark:bg-gray-800">
        <View className="flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-gray-900 dark:text-white">Transações</Text>
          <TouchableOpacity
            onPress={() => router.push("/transactions/create")}
            className="rounded-lg bg-blue-500 px-4 py-2"
          >
            <Text className="font-medium text-white">Nova</Text>
          </TouchableOpacity>
        </View>
        <View className="mt-3 flex-row flex-wrap">
          <TouchableOpacity
            onPress={async () => {
              try {
                const path = await exportTransactionsCsv(filters, {
                  separator: csvSeparator.trim() || ",",
                  includeTransferMarker: markTransfers,
                });
                // Tentar compartilhamento imediato
                let shared = false;
                try {
                  if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(path, {
                      mimeType: "text/csv",
                      dialogTitle: "Exportar transações (CSV)",
                      UTI: "public.comma-separated-values-text",
                    });
                    shared = true;
                  } else {
                    // Fallback Share API
                    let uri = path;
                    if (Platform.OS === "android") {
                      try {
                        uri = await FileSystem.getContentUriAsync(path);
                      } catch {}
                    }
                    await Share.share({
                      message: "Transações exportadas em CSV",
                      url: uri,
                      title: "Exportar transações",
                    });
                    shared = true;
                  }
                } catch (shareErr) {
                  console.warn("Falha ao compartilhar automaticamente", shareErr);
                }

                if (!shared) {
                  Alert.alert(
                    "Exportação concluída",
                    `Arquivo CSV gerado:\n${path}\n\nNão foi possível abrir o menu de compartilhamento automático. Localize e compartilhe manualmente.`
                  );
                }
              } catch (e) {
                console.error(e);
                Alert.alert("Erro", "Falha ao exportar CSV");
              }
            }}
            className="mb-2 mr-3 rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600"
          >
            <Text className="text-xs font-medium text-gray-700 dark:text-gray-300">
              Exportar CSV
            </Text>
          </TouchableOpacity>
          {/* Config rápida CSV */}
          <View className="mb-2 mr-3 flex-row items-center">
            <Text className="mr-1 text-[10px] text-gray-600 dark:text-gray-400">Separador</Text>
            <TouchableOpacity
              onPress={() => setCsvSeparator(csvSeparator === "," ? ";" : ",")}
              className="mr-2 flex-row items-center rounded-md border border-gray-300 px-2 py-1 dark:border-gray-600"
              accessibilityLabel={`Alternar separador CSV. Atual: '${csvSeparator === "," ? "vírgula" : "ponto e vírgula"}'`}
            >
              <Text className="text-[10px] font-medium text-gray-700 dark:text-gray-200">
                {csvSeparator === "," ? ", (vírgula)" : "; (ponto e vírgula)"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setMarkTransfers((v) => !v)}
              className="flex-row items-center"
              accessibilityRole="checkbox"
              accessibilityState={{ checked: markTransfers }}
              accessibilityLabel="Incluir marcador de transferência no CSV"
            >
              <View
                className={`mr-1 h-4 w-4 items-center justify-center rounded border ${
                  markTransfers
                    ? "border-primary-500 bg-primary-500"
                    : "border-gray-400 dark:border-gray-600"
                }`}
              >
                {markTransfers && <Text className="text-[9px] font-bold text-white">✓</Text>}
              </View>
              <Text className="text-[10px] text-gray-600 dark:text-gray-300">Transf</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            onPress={() => {
              if (!filters || Object.keys(filters).length === 0) {
                Alert.alert("Aviso", "Aplique algum filtro antes de salvar.");
                return;
              }
              const defaultName = `Filtro ${savedFilters.length + 1}`;
              addSavedFilter(defaultName, filters);
              Alert.alert("Salvo", `Filtro salvo como '${defaultName}'.`);
            }}
            className="mb-2 mr-3 rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600"
          >
            <Text className="text-xs font-medium text-gray-700 dark:text-gray-300">
              Salvar Filtro
            </Text>
          </TouchableOpacity>
          {savedFilters.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="w-full">
              <View className="mt-1 flex-row items-center">
                {savedFilters.map((sf) => (
                  <View
                    key={sf.id}
                    className="mb-2 mr-2 flex-row items-center rounded-full border border-indigo-400 bg-indigo-50 px-2 py-1 dark:border-indigo-600 dark:bg-indigo-900/30"
                  >
                    <TouchableOpacity
                      onPress={() => {
                        setFilters(sf.filters);
                        setLastUsedFilters(sf.filters);
                        setSelectedAccountIds(sf.filters.account_ids || []);
                        loadTransactions(undefined, undefined, sf.filters);
                      }}
                    >
                      <Text className="text-[11px] font-medium text-indigo-700 dark:text-indigo-300">
                        {sf.name}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        if (Alert.prompt) {
                          Alert.prompt(
                            "Renomear Filtro",
                            "Novo nome:",
                            [
                              { text: "Cancelar", style: "cancel" },
                              {
                                text: "Salvar",
                                onPress: (text) => {
                                  if (text && text.trim().length > 0) {
                                    updateSavedFilterName(sf.id, text.trim());
                                  }
                                },
                              },
                            ],
                            "plain-text",
                            sf.name
                          );
                        } else {
                          setRenamingFilterId(sf.id);
                          setRenameValue(sf.name);
                          setShowRenameModal(true);
                        }
                      }}
                      className="ml-1"
                    >
                      <Ionicons name="create" size={11} color="#6366f1" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => removeSavedFilter(sf.id)} className="ml-1">
                      <Ionicons name="close" size={11} color="#6366f1" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </ScrollView>
          )}
        </View>
        <FilterChips
          rangeKey={rangeKey}
          setRangeKey={setRangeKey}
          applyRange={applyRange}
          filters={filters}
          toggleType={toggleType}
          openAccounts={() => setShowAccountsModal(true)}
          openAdvanced={() => setShowAdvancedModal(true)}
          clearFilters={clearFilters}
          activeFiltersCount={activeFiltersCount}
          includeTransfers={includeTransfers}
          toggleIncludeTransfers={() => {
            const next = !includeTransfers;
            setIncludeTransfers(next);
            const updated: TransactionFilters = { ...filters, include_transfers: next };
            setFilters(updated);
            setLastUsedFilters(updated);
            loadTransactions(undefined, undefined, updated);
          }}
          openPresets={() => setShowPresetsModal(true)}
        />
      </View>

      {transactions.length === 0 ? (
        <View className="flex-1 items-center justify-center p-8">
          <Ionicons name="receipt" size={64} color="#9ca3af" />
          <Text className="mt-4 text-center text-xl font-semibold text-gray-900 dark:text-white">
            Nenhuma transação encontrada
          </Text>
          <Text className="mb-6 mt-2 text-center text-gray-500 dark:text-gray-400">
            Comece criando sua primeira receita ou despesa
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/transactions/create")}
            className="rounded-lg bg-blue-500 px-6 py-3"
          >
            <Text className="font-semibold text-white">Criar Transação</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <View className="space-y-3 p-4">
            {transactions.map((transaction) => (
              <TouchableOpacity
                key={transaction.id}
                onPress={() => router.push(`/transactions/${transaction.id}`)}
                className={`rounded-xl p-4 shadow-sm ${
                  transaction.type === "transfer"
                    ? "border border-blue-300 bg-blue-50 dark:border-blue-600 dark:bg-blue-900/30"
                    : "bg-white dark:bg-gray-800"
                }`}
                accessibilityLabel={`Transação ${getTransactionTypeLabel(
                  transaction.type
                )} valor ${formatCurrency(transaction.amount)}`}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 flex-row items-center">
                    <View
                      className="mr-4 h-12 w-12 items-center justify-center rounded-full"
                      style={{ backgroundColor: getTransactionColor(transaction.type) }}
                    >
                      <Ionicons
                        name={getTransactionIcon(transaction.type) as any}
                        size={20}
                        color="white"
                      />
                    </View>

                    <View className="flex-1">
                      <View className="flex-row items-center justify-between">
                        <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                          {transaction.description}
                        </Text>
                        <Text
                          className="text-lg font-bold"
                          style={{ color: getTransactionColor(transaction.type) }}
                        >
                          {transaction.type === "expense" ? "-" : ""}
                          {formatCurrency(transaction.amount)}
                        </Text>
                      </View>

                      <View className="mt-1 flex-row items-center">
                        <Text className="text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(transaction.occurred_at)} • {transaction.account_name}
                        </Text>
                        {transaction.category_name && (
                          <Text className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                            • {transaction.category_name}
                          </Text>
                        )}
                        {transaction.recurrence_id && (
                          <View className="ml-2 rounded-full bg-purple-100 px-2 py-[2px] dark:bg-purple-700/40">
                            <Text className="text-[10px] font-semibold text-purple-700 dark:text-purple-300">
                              Recorrente
                            </Text>
                          </View>
                        )}
                      </View>

                      {transaction.type === "transfer" && transaction.destination_account_name && (
                        <View className="mt-2 flex-row items-center rounded-md bg-blue-100 px-2 py-1 dark:bg-blue-700/40">
                          <Text className="text-[11px] font-medium text-blue-800 dark:text-blue-200">
                            {transaction.account_name}
                          </Text>
                          <Ionicons
                            name="swap-horizontal"
                            size={14}
                            color={"#2563eb"}
                            style={{ marginHorizontal: 6 }}
                          />
                          <Text className="text-[11px] font-medium text-blue-800 dark:text-blue-200">
                            {transaction.destination_account_name}
                          </Text>
                        </View>
                      )}

                      {transaction.notes && (
                        <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          {transaction.notes}
                        </Text>
                      )}
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={() => handleDeleteTransaction(transaction)}
                    className="ml-3 p-2"
                  >
                    <Ionicons name="trash" size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}
      {/* Modal contas */}
      <Modal visible={showAccountsModal} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/50">
          <View className="max-h-[70%] rounded-t-2xl bg-white p-4 dark:bg-gray-800">
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                Selecionar Contas
              </Text>
              <TouchableOpacity onPress={() => setShowAccountsModal(false)}>
                <Text className="text-sm text-blue-500">Fechar</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={accounts}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const active = selectedAccountIds.includes(item.id);
                return (
                  <TouchableOpacity
                    onPress={() => toggleAccount(item.id)}
                    className={`mb-2 flex-row items-center rounded-lg border px-3 py-3 ${
                      active
                        ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                        : "border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-700"
                    }`}
                  >
                    <View
                      className="mr-3 h-8 w-8 items-center justify-center rounded-full"
                      style={{ backgroundColor: item.color }}
                    >
                      <Text className="text-xs font-bold text-white">{item.name[0]}</Text>
                    </View>
                    <Text className="flex-1 text-base font-medium text-gray-900 dark:text-white">
                      {item.name}
                    </Text>
                    {active && (
                      <Text className="text-xs font-semibold text-green-600 dark:text-green-300">
                        ✓
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              }}
            />
            <View className="mt-2 flex-row gap-3 pt-2">
              <TouchableOpacity
                onPress={() => {
                  setSelectedAccountIds([]);
                  const updated = { ...filters, account_ids: undefined };
                  setFilters(updated);
                  setLastUsedFilters(updated);
                }}
                className="flex-1 rounded-md bg-gray-200 py-3 dark:bg-gray-700"
              >
                <Text className="text-center font-semibold text-gray-900 dark:text-white">
                  Limpar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={applyAccounts}
                className="flex-1 rounded-md bg-blue-500 py-3"
              >
                <Text className="text-center font-semibold text-white">Aplicar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <AdvancedFilterModal
        visible={showAdvancedModal}
        onClose={() => setShowAdvancedModal(false)}
        categories={categories}
        tempSearch={tempSearch}
        setTempSearch={setTempSearch}
        tempAmountMin={tempAmountMin}
        setTempAmountMin={setTempAmountMin}
        tempAmountMax={tempAmountMax}
        setTempAmountMax={setTempAmountMax}
        tempTags={tempTags}
        setTempTags={setTempTags}
        tempPendingOnly={tempPendingOnly}
        setTempPendingOnly={setTempPendingOnly}
        selectedCategoryIds={selectedCategoryIds}
        setSelectedCategoryIds={setSelectedCategoryIds}
        onClear={() => {
          setTempSearch("");
          setTempAmountMin("");
          setTempAmountMax("");
          setTempTags("");
          setTempPendingOnly(false);
          setSelectedCategoryIds([]);
          setTagsMode("ANY");
          setIncludeTransfers(true);
        }}
        onApply={() => {
          const updated: TransactionFilters = {
            ...filters,
            search_text: tempSearch || undefined,
            amount_min: tempAmountMin ? parseFloat(tempAmountMin) : undefined,
            amount_max: tempAmountMax ? parseFloat(tempAmountMax) : undefined,
            tags: tempTags
              ? tempTags
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean)
              : undefined,
            tags_mode: tagsMode,
            category_ids: selectedCategoryIds.length ? selectedCategoryIds : undefined,
            is_pending: tempPendingOnly ? true : undefined,
            include_transfers: includeTransfers,
          };
          setFilters(updated);
          setLastUsedFilters(updated);
          setShowAdvancedModal(false);
          loadTransactions(undefined, undefined, updated);
        }}
        tagsMode={tagsMode}
        setTagsMode={setTagsMode}
        includeTransfers={includeTransfers}
        setIncludeTransfers={setIncludeTransfers}
      />
      <PresetsModal
        visible={showPresetsModal}
        onClose={() => setShowPresetsModal(false)}
        rangeKey={rangeKey}
        applyRange={applyRange}
        filters={filters}
        applyTypes={(types) => {
          const updated: TransactionFilters = { ...filters, transaction_types: types || undefined };
          setFilters(updated);
          setLastUsedFilters(updated);
          loadTransactions(undefined, undefined, updated);
        }}
        clearTypes={() => {
          const updated: TransactionFilters = { ...filters, transaction_types: undefined };
          setFilters(updated);
          setLastUsedFilters(updated);
          loadTransactions(undefined, undefined, updated);
        }}
      />
      {/* Modal Renomear Filtro (fallback) */}
      <Modal visible={showRenameModal} animationType="fade" transparent>
        <View className="flex-1 items-center justify-center bg-black/60">
          <View className="w-11/12 max-w-sm rounded-lg bg-white p-4 dark:bg-gray-800">
            <Text className="mb-3 text-base font-semibold text-gray-900 dark:text-white">
              Renomear Filtro
            </Text>
            <TextInput
              value={renameValue}
              onChangeText={setRenameValue}
              placeholder="Nome"
              className="mb-4 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              autoFocus
            />
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => {
                  setShowRenameModal(false);
                  setRenamingFilterId(null);
                  setRenameValue("");
                }}
                className="flex-1 rounded-md bg-gray-200 py-3 dark:bg-gray-700"
              >
                <Text className="text-center font-semibold text-gray-900 dark:text-white">
                  Cancelar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  if (renamingFilterId && renameValue.trim().length > 0) {
                    updateSavedFilterName(renamingFilterId, renameValue.trim());
                  }
                  setShowRenameModal(false);
                  setRenamingFilterId(null);
                  setRenameValue("");
                }}
                className="flex-1 rounded-md bg-blue-500 py-3"
              >
                <Text className="text-center font-semibold text-white">Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

TransactionsListScreen.displayName = "TransactionsListScreen";
