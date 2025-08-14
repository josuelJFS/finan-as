import * as FileSystem from "expo-file-system";
import { TransactionDAO, AccountDAO, CategoryDAO } from "../../lib/database";
import type { TransactionFilters } from "../../types/entities";

export interface ExportCsvOptions {
  separator?: string; // padrão ","
  includeTransferMarker?: boolean; // adiciona coluna 'transferencia' com 1/0
}

// Gera CSV das transações filtradas e retorna o caminho do arquivo temporário
export async function exportTransactionsCsv(
  filters?: TransactionFilters,
  options?: ExportCsvOptions & { locale?: string; regionalFormatting?: boolean }
): Promise<string> {
  const separator = options?.separator || ",";
  const includeTransferMarker = options?.includeTransferMarker !== false; // default true
  const locale = options?.locale || "pt-BR";
  const regional = options?.regionalFormatting !== false; // ativa por padrão
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
    "tags",
  ];
  if (includeTransferMarker) header.push("transferencia");

  const useDecimalComma = regional && separator === ";" && locale.startsWith("pt");

  function formatNumber(n: number) {
    if (!regional) return n.toString();
    if (useDecimalComma) {
      // Formata com Intl e depois remove separador de milhar para evitar conflitos em alguns parsers
      const f = new Intl.NumberFormat(locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(n);
      // Garantir: milhar '.' decimal ','
      return f;
    }
    // Caso padrão: usar ponto decimal (locale en-US para estabilidade)
    return n.toFixed(2);
  }

  const rows = transactions.map((t) => {
    const base = [
      t.id,
      t.type,
      accountMap.get(t.account_id)?.name || "",
      t.destination_account_id ? accountMap.get(t.destination_account_id)?.name || "" : "",
      t.category_id ? categoryMap.get(t.category_id)?.name || "" : "",
      formatNumber(t.type === "expense" ? -t.amount : t.amount),
      sanitize(t.description),
      t.occurred_at,
      t.is_pending ? "1" : "0",
      t.tags ? t.tags.join("|") : "",
    ];
    if (includeTransferMarker) base.push(t.type === "transfer" ? "1" : "0");
    return base;
  });

  const csv = [header, ...rows].map((cols) => cols.map(csvEscape).join(separator)).join("\n");

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
