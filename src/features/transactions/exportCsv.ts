import * as FileSystem from "expo-file-system";
import { TransactionDAO, AccountDAO, CategoryDAO } from "../../lib/database";
import type { TransactionFilters } from "../../types/entities";

// Gera CSV das transações filtradas e retorna o caminho do arquivo temporário
export async function exportTransactionsCsv(filters?: TransactionFilters): Promise<string> {
  const transactionDAO = TransactionDAO.getInstance();
  const accountDAO = AccountDAO.getInstance();
  const categoryDAO = CategoryDAO.getInstance();

  const [transactions, accounts, categories] = await Promise.all([
    transactionDAO.findAll(filters),
    accountDAO.findAll(),
    categoryDAO.findAll(),
  ]);

  const accountMap = new Map(accounts.map((a) => [a.id, a]));
  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  const header = [
    "id",
    "tipo",
    "conta_origem",
    "conta_destino",
    "categoria",
    "valor",
    "descricao",
    "data",
    "pendente",
  ];

  const rows = transactions.map((t) => [
    t.id,
    t.type,
    accountMap.get(t.account_id)?.name || "",
    t.destination_account_id ? accountMap.get(t.destination_account_id)?.name || "" : "",
    t.category_id ? categoryMap.get(t.category_id)?.name || "" : "",
    (t.type === "expense" ? -t.amount : t.amount).toString(),
    sanitize(t.description),
    t.occurred_at,
    t.is_pending ? "1" : "0",
  ]);

  const csv = [header, ...rows].map((cols) => cols.map(csvEscape).join(",")).join("\n");

  const fileName = `transacoes_${Date.now()}.csv`;
  const baseDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
  if (!baseDir) throw new Error("Diretório de escrita indisponível");
  const filePath = baseDir + fileName;
  await FileSystem.writeAsStringAsync(filePath, csv, { encoding: FileSystem.EncodingType.UTF8 });
  return filePath;
}

function csvEscape(value: string) {
  if (value == null) return "";
  const needsQuotes = /[",\n;]/.test(value);
  const v = value.replace(/"/g, '""');
  return needsQuotes ? `"${v}"` : v;
}

function sanitize(value: string) {
  return value?.replace(/\r?\n|\r/g, " ").trim();
}
