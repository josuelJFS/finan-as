import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { getDatabase } from "./database/migrations";

interface BackupBundleV1 {
  version: 1;
  generated_at: string;
  data: {
    settings: any[];
    accounts: any[];
    categories: any[];
    budgets: any[];
    goals: any[];
    recurrences: any[];
    transactions: any[];
    saved_filters: any[];
  };
}

export async function exportBackupToFile(): Promise<string> {
  const db = await getDatabase();
  const tables = [
    "settings",
    "accounts",
    "categories",
    "budgets",
    "goals",
    "recurrences",
    "transactions",
    "saved_filters",
  ];
  const data: any = {};
  for (const t of tables) {
    try {
      data[t] = await db.getAllAsync<any>(`SELECT * FROM ${t}`);
    } catch (e) {
      data[t] = [];
    }
  }
  const bundle: BackupBundleV1 = {
    version: 1,
    generated_at: new Date().toISOString(),
    data: {
      settings: data.settings || [],
      accounts: data.accounts || [],
      categories: data.categories || [],
      budgets: data.budgets || [],
      goals: data.goals || [],
      recurrences: data.recurrences || [],
      transactions: data.transactions || [],
      saved_filters: data.saved_filters || [],
    },
  };
  const json = JSON.stringify(bundle, null, 2);
  const baseDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
  if (!baseDir) throw new Error("Diretório indisponível");
  const filePath = `${baseDir}backup_${Date.now()}.json`;
  await FileSystem.writeAsStringAsync(filePath, json, { encoding: FileSystem.EncodingType.UTF8 });
  return filePath;
}

export async function shareBackup(): Promise<string> {
  const path = await exportBackupToFile();
  try {
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(path, { dialogTitle: "Exportar Backup" });
    }
  } catch (e) {
    console.warn("Falha ao compartilhar backup", e);
  }
  return path;
}

interface ImportOptions {
  overwrite?: boolean; // default true limpa dados antes
}

export async function importBackup(jsonString: string, options?: ImportOptions): Promise<void> {
  const overwrite = options?.overwrite !== false; // default true
  let bundle: BackupBundleV1;
  try {
    bundle = JSON.parse(jsonString);
  } catch {
    throw new Error("JSON inválido");
  }
  if (!bundle || bundle.version !== 1 || !bundle.data) {
    throw new Error("Formato de backup não suportado (versão)");
  }
  const db = await getDatabase();
  await db.execAsync("BEGIN TRANSACTION");
  try {
    if (overwrite) {
      // Ordem para evitar violação de FK
      await db.runAsync("DELETE FROM transactions");
      await db.runAsync("DELETE FROM budgets");
      await db.runAsync("DELETE FROM recurrences");
      await db.runAsync("DELETE FROM categories");
      await db.runAsync("DELETE FROM accounts");
      await db.runAsync("DELETE FROM goals");
      await db.runAsync("DELETE FROM saved_filters");
      await db.runAsync("DELETE FROM settings");
    }
    // Inserir mantendo IDs (colunas listadas explicitamente)
    const insertAll = async (table: string, rows: any[]) => {
      if (!rows || rows.length === 0) return;
      for (const row of rows) {
        const cols = Object.keys(row);
        const placeholders = cols.map(() => "?").join(",");
        const values = cols.map((c) => (row[c] === undefined ? null : row[c]));
        await db.runAsync(
          `INSERT INTO ${table} (${cols.join(",")}) VALUES (${placeholders})`,
          values
        );
      }
    };
    // Ordem de inserção
    await insertAll("settings", bundle.data.settings);
    await insertAll("accounts", bundle.data.accounts);
    await insertAll("categories", bundle.data.categories);
    await insertAll("budgets", bundle.data.budgets);
    await insertAll("goals", bundle.data.goals);
    await insertAll("recurrences", bundle.data.recurrences);
    await insertAll("transactions", bundle.data.transactions);
    await insertAll("saved_filters", bundle.data.saved_filters);
    await db.execAsync("COMMIT");
  } catch (e) {
    await db.execAsync("ROLLBACK");
    console.warn("Import backup rollback", e);
    throw new Error("Falha ao importar backup");
  }
}
