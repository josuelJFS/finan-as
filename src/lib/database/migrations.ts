import * as SQLite from "expo-sqlite";

// Versão atual do banco de dados
export const DB_VERSION = 2;
export const DB_NAME = "appfinanca.db";

let db: SQLite.SQLiteDatabase | null = null;
// Promessa de abertura em andamento para evitar condições de corrida
let openingPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export const getDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  // Retorna instância já pronta
  if (db) return db;

  // Se já há uma abertura em andamento, reutiliza a promessa
  if (openingPromise) return openingPromise;

  openingPromise = (async () => {
    console.log("[DB] Abrindo banco de dados...");
    const database = await SQLite.openDatabaseAsync(DB_NAME);
    try {
      // Ativar WAL para melhorar concorrência (ignora erro se não suportado)
      await database.execAsync("PRAGMA journal_mode = WAL;").catch(() => {});
      // Aumentar timeout de espera por locks
      await database.execAsync("PRAGMA busy_timeout = 4000;").catch(() => {});
      // Ajustar synchronous para reduzir bloqueios de I/O (trade-off aceitável mobile)
      await database.execAsync("PRAGMA synchronous = NORMAL;").catch(() => {});
    } catch {}
    console.log("[DB] Banco aberto, executando migrations...");
    await runMigrations(database);
    console.log("[DB] Migrations concluídas.");
    db = database;
    return database;
  })();

  return openingPromise;
};

const runMigrations = async (database: SQLite.SQLiteDatabase) => {
  // Verificar versão atual
  const result = await database.getFirstAsync<{ user_version: number }>("PRAGMA user_version");
  const currentVersion = result?.user_version || 0;

  console.log(`Database version: ${currentVersion}, target: ${DB_VERSION}`);

  // Executar migrações necessárias
  if (currentVersion < 1) {
    await migration_001_initial_schema(database);
  }

  if (currentVersion < 2) {
    const ok = await migration_002_add_indexes(database);
    if (!ok) {
      console.warn("[DB] Migration 002 parcial - agendando background.");
      ensureIndexesInBackground(database);
    }
  } else {
    ensureIndexesInBackground(database); // garantir em execuções futuras
  }

  // Atualizar versão do banco
  if (currentVersion < DB_VERSION) {
    await database.execAsync(`PRAGMA user_version = ${DB_VERSION}`);
  }
};

// Migração inicial - Criação das tabelas
const migration_001_initial_schema = async (db: SQLite.SQLiteDatabase) => {
  console.log("Running migration 001: Initial schema");

  await db.execAsync(`
    -- Configurações da aplicação
    CREATE TABLE IF NOT EXISTS settings (
      id TEXT PRIMARY KEY DEFAULT 'default',
      currency TEXT NOT NULL DEFAULT 'BRL',
      theme TEXT NOT NULL DEFAULT 'system',
      first_day_of_week INTEGER NOT NULL DEFAULT 1,
      date_format TEXT NOT NULL DEFAULT 'DD/MM/YYYY',
      number_format TEXT NOT NULL DEFAULT 'pt-BR',
      language TEXT NOT NULL DEFAULT 'pt-BR',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    
    -- Contas
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('checking', 'savings', 'credit_card', 'cash', 'investment', 'other')),
      initial_balance REAL NOT NULL DEFAULT 0,
      current_balance REAL NOT NULL DEFAULT 0,
      color TEXT NOT NULL DEFAULT '#3b82f6',
      icon TEXT NOT NULL DEFAULT 'wallet',
      is_archived INTEGER NOT NULL DEFAULT 0,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    
    -- Categorias
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
      name TEXT NOT NULL,
      parent_id TEXT,
      type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
      color TEXT NOT NULL DEFAULT '#6b7280',
      icon TEXT NOT NULL DEFAULT 'tag',
      is_system INTEGER NOT NULL DEFAULT 0,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (parent_id) REFERENCES categories (id) ON DELETE SET NULL
    );
    
    -- Transações
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
      type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
      account_id TEXT NOT NULL,
      destination_account_id TEXT,
      category_id TEXT,
      amount REAL NOT NULL,
      description TEXT NOT NULL,
      notes TEXT,
      occurred_at TEXT NOT NULL,
      tags TEXT, -- JSON array como string
      attachment_path TEXT,
      recurrence_id TEXT,
      is_pending INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (account_id) REFERENCES accounts (id) ON DELETE RESTRICT,
      FOREIGN KEY (destination_account_id) REFERENCES accounts (id) ON DELETE RESTRICT,
      FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE SET NULL,
      FOREIGN KEY (recurrence_id) REFERENCES recurrences (id) ON DELETE SET NULL
    );
    
    -- Orçamentos
    CREATE TABLE IF NOT EXISTS budgets (
      id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
      name TEXT NOT NULL,
      category_id TEXT,
      amount REAL NOT NULL,
      period_type TEXT NOT NULL CHECK (period_type IN ('monthly', 'quarterly', 'yearly', 'custom')),
      period_start TEXT NOT NULL,
      period_end TEXT NOT NULL,
      alert_percentage REAL NOT NULL DEFAULT 80,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE CASCADE
    );
    
    -- Metas
    CREATE TABLE IF NOT EXISTS goals (
      id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
      name TEXT NOT NULL,
      description TEXT,
      target_amount REAL NOT NULL,
      current_amount REAL NOT NULL DEFAULT 0,
      target_date TEXT,
      is_completed INTEGER NOT NULL DEFAULT 0,
      color TEXT NOT NULL DEFAULT '#10b981',
      icon TEXT NOT NULL DEFAULT 'target',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    
    -- Recorrências
    CREATE TABLE IF NOT EXISTS recurrences (
      id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
      account_id TEXT NOT NULL,
      destination_account_id TEXT,
      category_id TEXT,
      amount REAL NOT NULL,
      description TEXT NOT NULL,
      notes TEXT,
      frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
      interval_count INTEGER NOT NULL DEFAULT 1,
      days_of_week TEXT, -- JSON array para dias da semana
      day_of_month INTEGER,
      start_date TEXT NOT NULL,
      end_date TEXT,
      next_occurrence TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      tags TEXT, -- JSON array como string
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (account_id) REFERENCES accounts (id) ON DELETE RESTRICT,
      FOREIGN KEY (destination_account_id) REFERENCES accounts (id) ON DELETE RESTRICT,
      FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE SET NULL
    );
    
    -- Filtros salvos
    CREATE TABLE IF NOT EXISTS saved_filters (
      id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
      name TEXT NOT NULL,
      filters TEXT NOT NULL, -- JSON object como string
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    
    -- Índices para performance
    CREATE INDEX IF NOT EXISTS idx_transactions_occurred_at ON transactions (occurred_at);
    CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions (account_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions (category_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions (type);
    CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories (parent_id);
    CREATE INDEX IF NOT EXISTS idx_categories_type ON categories (type);
    CREATE INDEX IF NOT EXISTS idx_budgets_category_id ON budgets (category_id);
    CREATE INDEX IF NOT EXISTS idx_budgets_period ON budgets (period_start, period_end);
    
    -- Triggers para atualizar updated_at automaticamente
    CREATE TRIGGER IF NOT EXISTS update_accounts_updated_at 
      AFTER UPDATE ON accounts
      BEGIN
        UPDATE accounts SET updated_at = datetime('now') WHERE id = NEW.id;
      END;
      
    CREATE TRIGGER IF NOT EXISTS update_categories_updated_at 
      AFTER UPDATE ON categories
      BEGIN
        UPDATE categories SET updated_at = datetime('now') WHERE id = NEW.id;
      END;
      
    CREATE TRIGGER IF NOT EXISTS update_transactions_updated_at 
      AFTER UPDATE ON transactions
      BEGIN
        UPDATE transactions SET updated_at = datetime('now') WHERE id = NEW.id;
      END;
      
    CREATE TRIGGER IF NOT EXISTS update_budgets_updated_at 
      AFTER UPDATE ON budgets
      BEGIN
        UPDATE budgets SET updated_at = datetime('now') WHERE id = NEW.id;
      END;
      
    CREATE TRIGGER IF NOT EXISTS update_goals_updated_at 
      AFTER UPDATE ON goals
      BEGIN
        UPDATE goals SET updated_at = datetime('now') WHERE id = NEW.id;
      END;
      
    CREATE TRIGGER IF NOT EXISTS update_recurrences_updated_at 
      AFTER UPDATE ON recurrences
      BEGIN
        UPDATE recurrences SET updated_at = datetime('now') WHERE id = NEW.id;
      END;
  `);

  console.log("Migration 001 completed");
};

// Migração 002 - Índices complementares para filtros avançados e performance
const migration_002_add_indexes = async (db: SQLite.SQLiteDatabase): Promise<boolean> => {
  console.log("Running migration 002: Additional indexes");
  const statements = [
    `CREATE INDEX IF NOT EXISTS idx_transactions_destination_account_id ON transactions (destination_account_id);`,
    `CREATE INDEX IF NOT EXISTS idx_transactions_account_type_date ON transactions (account_id, type, occurred_at);`,
    `CREATE INDEX IF NOT EXISTS idx_budgets_category_period ON budgets (category_id, period_start, period_end);`,
  ];
  let allOk = true;
  for (const stmt of statements) {
    const ok = await runWithRetry(db, stmt, 2, 100, false); // sem IMMEDIATE para reduzir lock
    if (!ok) allOk = false;
  }
  if (allOk) {
    await ensureIndexes(db, [
      "idx_transactions_occurred_at",
      "idx_transactions_account_id",
      "idx_transactions_category_id",
      "idx_transactions_type",
      "idx_transactions_destination_account_id",
      "idx_transactions_account_type_date",
      "idx_budgets_category_id",
      "idx_budgets_period",
      "idx_budgets_category_period",
    ]);
    console.log("Migration 002 completed (sincrona)");
  }
  return allOk;
};

// Executa statement com retry simples em caso de 'database is locked'
async function runWithRetry(
  db: SQLite.SQLiteDatabase,
  statement: string,
  retries: number = 3,
  delayMs: number = 80,
  useImmediateTx: boolean = false
) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (useImmediateTx) {
        await db.execAsync("BEGIN IMMEDIATE;");
        await db.execAsync(statement);
        await db.execAsync("COMMIT;");
      } else {
        await db.execAsync(statement);
      }
      console.log(`[DB][migration] OK '${statement.slice(0, 60)}' (attempt ${attempt + 1})`);
      return true; // sucesso
    } catch (err: any) {
      // Tentar rollback se transação aberta
      try {
        await db.execAsync("ROLLBACK;");
      } catch {}
      const message = String(err?.message || err);
      const last = attempt === retries;
      console.warn(
        `[DB][migration] Falha '${statement.slice(0, 60)}' tentativa ${attempt + 1}/${
          retries + 1
        }: ${message}`
      );
      if (message.includes("database is locked") && !last) {
        // Backoff exponencial leve
        const wait = delayMs * Math.pow(1.6, attempt);
        await new Promise((res) => setTimeout(res, wait));
        continue;
      }
      if (!message.includes("already exists")) {
        if (last) {
          console.warn(`[DB][migration] desistindo: ${statement}`);
          return false;
        }
      } else {
        return true; // índice já existe
      }
    }
  }
  return false;
}

async function ensureIndexes(db: SQLite.SQLiteDatabase, names: string[]) {
  const existing = await db.getAllAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='index'"
  );
  const existingSet = new Set(existing.map((r) => r.name));
  for (const name of names) {
    if (!existingSet.has(name)) {
      console.warn(`[DB] Index faltando '${name}', tentando recriar...`);
      // Não sabemos a definição exata aqui (já listada nas migrations). Por segurança pular.
    }
  }
}

function ensureIndexesInBackground(db: SQLite.SQLiteDatabase, attempts: number = 3) {
  const names = [
    "idx_transactions_destination_account_id",
    "idx_transactions_account_type_date",
    "idx_budgets_category_period",
  ];
  let attempt = 0;
  const tick = async () => {
    attempt++;
    console.log(`[DB][bg] tentativa índices ${attempt}/${attempts}`);
    let okAll = true;
    for (const n of names) {
      const stmt =
        n === "idx_transactions_destination_account_id"
          ? `CREATE INDEX IF NOT EXISTS idx_transactions_destination_account_id ON transactions (destination_account_id);`
          : n === "idx_transactions_account_type_date"
            ? `CREATE INDEX IF NOT EXISTS idx_transactions_account_type_date ON transactions (account_id, type, occurred_at);`
            : `CREATE INDEX IF NOT EXISTS idx_budgets_category_period ON budgets (category_id, period_start, period_end);`;
      const ok = await runWithRetry(db, stmt, 1, 150, false);
      if (!ok) okAll = false;
    }
    if (!okAll && attempt < attempts) {
      setTimeout(tick, 1200 * attempt);
    } else if (!okAll) {
      console.warn("[DB][bg] índices não criados após tentativas (seguir sem eles)");
    } else {
      console.log("[DB][bg] índices garantidos");
    }
  };
  setTimeout(tick, 700);
}
