import * as SQLite from "expo-sqlite";
import { getDatabase } from "./migrations";
import { Events } from "../events";
import { AccountDAO } from "./AccountDAO";
import { BudgetDAO } from "./BudgetDAO";
import type { Transaction, TransactionType, TransactionFilters } from "../../types/entities";

export class TransactionDAO {
  private static instance: TransactionDAO;
  private db: SQLite.SQLiteDatabase | null = null;
  private accountDAO: AccountDAO;
  private budgetDAO: BudgetDAO;

  private constructor() {
    this.accountDAO = AccountDAO.getInstance();
    this.budgetDAO = BudgetDAO.getInstance();
  }

  public static getInstance(): TransactionDAO {
    if (!TransactionDAO.instance) {
      TransactionDAO.instance = new TransactionDAO();
    }
    return TransactionDAO.instance;
  }

  private async getDb(): Promise<SQLite.SQLiteDatabase> {
    if (!this.db) {
      this.db = await getDatabase();
    }
    return this.db;
  }

  async create(
    transaction: Omit<Transaction, "id" | "created_at" | "updated_at">
  ): Promise<string> {
    const db = await this.getDb();

    // Iniciar transação atômica
    await db.execAsync("BEGIN TRANSACTION");

    try {
      // Inserir transação
      const result = await db.runAsync(
        `
        INSERT INTO transactions (
          type, account_id, destination_account_id, category_id, amount, 
          description, notes, occurred_at, tags, attachment_path, 
          recurrence_id, is_pending
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          transaction.type,
          transaction.account_id,
          transaction.destination_account_id || null,
          transaction.category_id || null,
          transaction.amount,
          transaction.description,
          transaction.notes || null,
          transaction.occurred_at,
          transaction.tags ? JSON.stringify(transaction.tags) : null,
          transaction.attachment_path || null,
          transaction.recurrence_id || null,
          transaction.is_pending ? 1 : 0,
        ]
      );

      const transactionId = result.lastInsertRowId?.toString() || "";

      // Atualizar saldos das contas (apenas se não for pendente)
      if (!transaction.is_pending) {
        await this.updateAccountBalances({
          ...transaction,
          id: transactionId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }

      await db.execAsync("COMMIT");
      // Invalidação seletiva budgets
      try {
        await this.budgetDAO.invalidateForTransactionChange(
          null as any,
          {
            ...transaction,
            id: transactionId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as any
        );
      } catch (e) {
        console.warn("[TransactionDAO] erro ao invalidar budgets (create)", e);
      }
      // Emitir eventos
      Events.emit("transactions:changed", { action: "create", id: transactionId });
      Events.emit("accounts:balancesChanged", undefined as any);
      return transactionId;
    } catch (error) {
      await db.execAsync("ROLLBACK");
      throw error;
    }
  }

  async findAll(
    filters?: TransactionFilters,
    limit?: number,
    offset?: number
  ): Promise<Transaction[]> {
    const db = await this.getDb();

    const { query, params } = this.buildFilterQuery(filters, limit, offset);

    const rows = await db.getAllAsync<any>(query, params);

    return rows.map(this.mapRowToTransaction);
  }

  async findById(id: string): Promise<Transaction | null> {
    const db = await this.getDb();

    const row = await db.getFirstAsync<any>("SELECT * FROM transactions WHERE id = ?", [id]);

    return row ? this.mapRowToTransaction(row) : null;
  }

  async findByAccount(accountId: string, limit?: number, offset?: number): Promise<Transaction[]> {
    const db = await this.getDb();

    let query = `
      SELECT * FROM transactions 
      WHERE account_id = ? OR destination_account_id = ?
      ORDER BY occurred_at DESC, created_at DESC
    `;

    const params = [accountId, accountId];

    if (limit) {
      query += " LIMIT ?";
      params.push(limit.toString());

      if (offset) {
        query += " OFFSET ?";
        params.push(offset.toString());
      }
    }

    const rows = await db.getAllAsync<any>(query, params);

    return rows.map(this.mapRowToTransaction);
  }

  async update(
    id: string,
    updates: Partial<Omit<Transaction, "id" | "created_at" | "updated_at">>
  ): Promise<void> {
    const db = await this.getDb();

    // Buscar transação atual para reverter saldos
    const currentTransaction = await this.findById(id);
    if (!currentTransaction) {
      throw new Error("Transação não encontrada");
    }

    await db.execAsync("BEGIN TRANSACTION");

    try {
      // Reverter saldos da transação atual (se não era pendente)
      if (!currentTransaction.is_pending) {
        await this.reverseAccountBalances(currentTransaction);
      }

      // Atualizar transação
      const setClause = [];
      const values = [];

      if (updates.type !== undefined) {
        setClause.push("type = ?");
        values.push(updates.type);
      }

      if (updates.account_id !== undefined) {
        setClause.push("account_id = ?");
        values.push(updates.account_id);
      }

      if (updates.destination_account_id !== undefined) {
        setClause.push("destination_account_id = ?");
        values.push(updates.destination_account_id);
      }

      if (updates.category_id !== undefined) {
        setClause.push("category_id = ?");
        values.push(updates.category_id);
      }

      if (updates.amount !== undefined) {
        setClause.push("amount = ?");
        values.push(updates.amount);
      }

      if (updates.description !== undefined) {
        setClause.push("description = ?");
        values.push(updates.description);
      }

      if (updates.notes !== undefined) {
        setClause.push("notes = ?");
        values.push(updates.notes);
      }

      if (updates.occurred_at !== undefined) {
        setClause.push("occurred_at = ?");
        values.push(updates.occurred_at);
      }

      if (updates.tags !== undefined) {
        setClause.push("tags = ?");
        values.push(updates.tags ? JSON.stringify(updates.tags) : null);
      }

      if (updates.attachment_path !== undefined) {
        setClause.push("attachment_path = ?");
        values.push(updates.attachment_path);
      }

      if (updates.is_pending !== undefined) {
        setClause.push("is_pending = ?");
        values.push(updates.is_pending ? 1 : 0);
      }

      if (setClause.length > 0) {
        values.push(id);

        await db.runAsync(`UPDATE transactions SET ${setClause.join(", ")} WHERE id = ?`, values);
      }

      // Aplicar novos saldos (se a transação atualizada não for pendente)
      const updatedTransaction = { ...currentTransaction, ...updates };
      if (!updatedTransaction.is_pending) {
        await this.updateAccountBalances(updatedTransaction);
      }

      await db.execAsync("COMMIT");
      // Invalidação seletiva budgets
      try {
        await this.budgetDAO.invalidateForTransactionChange(
          currentTransaction as any,
          updatedTransaction as any
        );
      } catch (e) {
        console.warn("[TransactionDAO] erro ao invalidar budgets (update)", e);
      }
      Events.emit("transactions:changed", { action: "update", id });
      Events.emit("accounts:balancesChanged", undefined as any);
    } catch (error) {
      await db.execAsync("ROLLBACK");
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    const db = await this.getDb();

    // Buscar transação para reverter saldos
    const transaction = await this.findById(id);
    if (!transaction) {
      throw new Error("Transação não encontrada");
    }

    await db.execAsync("BEGIN TRANSACTION");

    try {
      // Reverter saldos (se não era pendente)
      if (!transaction.is_pending) {
        await this.reverseAccountBalances(transaction);
      }

      // Deletar transação
      await db.runAsync("DELETE FROM transactions WHERE id = ?", [id]);

      await db.execAsync("COMMIT");
      // Invalidação seletiva budgets
      try {
        await this.budgetDAO.invalidateForTransactionChange(transaction as any, null as any);
      } catch (e) {
        console.warn("[TransactionDAO] erro ao invalidar budgets (delete)", e);
      }
      Events.emit("transactions:changed", { action: "delete", id });
      Events.emit("accounts:balancesChanged", undefined as any);
    } catch (error) {
      await db.execAsync("ROLLBACK");
      throw error;
    }
  }

  async count(filters?: TransactionFilters): Promise<number> {
    const db = await this.getDb();

    const { whereClause, params } = this.buildWhereClause(filters);

    const query = `SELECT COUNT(*) as count FROM transactions ${whereClause}`;

    const result = await db.getFirstAsync<{ count: number }>(query, params);

    return result?.count || 0;
  }

  async getMonthlyTrends(months: number = 12): Promise<MonthlyTrend[]> {
    const db = await this.getDb();

    const rows = await db.getAllAsync<any>(`
      SELECT 
        strftime('%Y-%m', occurred_at) as period,
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expenses
      FROM transactions 
      WHERE occurred_at >= date('now', '-${months} months')
        AND is_pending = 0
      GROUP BY strftime('%Y-%m', occurred_at)
      ORDER BY period ASC
    `);

    return rows.map((row) => {
      const income = row.income ?? row.total_income ?? 0;
      const expenses = row.expenses ?? row.total_expense ?? 0;
      return {
        period: row.period,
        income,
        expenses,
        balance: income - expenses,
      };
    });
  }

  /**
   * Retorna tendências agregadas por granularidade (dia, semana, mês, ano)
   * @param granularity 'day' | 'week' | 'month' | 'year'
   * @param periods quantidade de períodos recentes (ex: últimos 30 dias, 12 semanas, 6 meses, 5 anos)
   */
  async getTrends(
    granularity: "day" | "week" | "month" | "year",
    periods: number
  ): Promise<MonthlyTrend[]> {
    const db = await this.getDb();

    const config = {
      day: { fmt: "%Y-%m-%d", unit: "days" },
      week: { fmt: "%Y-%W", unit: "weeks" }, // %W: semana (segunda primeiro dia)
      month: { fmt: "%Y-%m", unit: "months" },
      year: { fmt: "%Y", unit: "years" },
    } as const;

    const { fmt, unit } = config[granularity];

    // Ajuste de segurança para limites máximos razoáveis
    const safePeriods = Math.min(
      periods,
      granularity === "day" ? 90 : granularity === "week" ? 52 : granularity === "month" ? 36 : 15
    );

    const rows = await db.getAllAsync<any>(`
      SELECT 
        strftime('${fmt}', t.occurred_at) as period,
        SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END) as income,
        SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END) as expenses
      FROM transactions t
      LEFT JOIN accounts a ON t.account_id = a.id
      LEFT JOIN accounts a_to ON t.destination_account_id = a_to.id
      WHERE t.occurred_at >= date('now', '-${safePeriods} ${unit}')
        AND t.is_pending = 0
        AND (a.type != 'investment' OR a.type IS NULL)
        AND (a_to.type != 'investment' OR a_to.type IS NULL OR t.type != 'transfer')
      GROUP BY strftime('${fmt}', t.occurred_at)
      ORDER BY period ASC
    `);
    const map = new Map<string, { income: number; expenses: number }>();
    rows.forEach((r) => {
      const income = r.income ?? r.total_income ?? 0;
      const expenses = r.expenses ?? r.total_expense ?? 0;
      map.set(r.period, { income, expenses });
    });

    // Gerar a lista contínua de períodos terminando no período atual
    const periodsList: string[] = [];
    const now = new Date();
    function pad(n: number) {
      return n < 10 ? `0${n}` : `${n}`;
    }
    if (granularity === "day") {
      for (let i = periods - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        periodsList.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
      }
    } else if (granularity === "month") {
      for (let i = periods - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        periodsList.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`);
      }
    } else if (granularity === "year") {
      for (let i = periods - 1; i >= 0; i--) {
        periodsList.push(`${now.getFullYear() - i}`);
      }
    } else if (granularity === "week") {
      // Aproximação: usar %W (semana começando segunda) do ano atual e retroceder datas
      const d = new Date(now);
      for (let i = periods - 1; i >= 0; i--) {
        const tmp = new Date(d);
        tmp.setDate(d.getDate() - i * 7);
        // Calcular semana
        const jan1 = new Date(tmp.getFullYear(), 0, 1);
        const days = Math.floor((tmp.getTime() - jan1.getTime()) / 86400000);
        const week = Math.floor((days + jan1.getDay()) / 7);
        periodsList.push(`${tmp.getFullYear()}-${pad(week)}`);
      }
    }

    return periodsList.map((p) => {
      const rec = map.get(p) || { income: 0, expenses: 0 };
      return {
        period: p,
        income: rec.income,
        expenses: rec.expenses,
        balance: rec.income - rec.expenses,
      };
    });
  }

  async getCategorySummary(
    dateFrom?: string,
    dateTo?: string,
    type?: TransactionType
  ): Promise<CategorySummary[]> {
    const db = await this.getDb();

    let query = `
      SELECT 
        c.id as category_id,
        c.name as category_name,
        SUM(t.amount) as amount,
        COUNT(t.id) as transaction_count
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      LEFT JOIN accounts a ON t.account_id = a.id
      WHERE t.is_pending = 0
        AND (a.type != 'investment' OR a.type IS NULL)
    `;

    const params: any[] = [];

    if (dateFrom) {
      query += " AND t.occurred_at >= ?";
      params.push(dateFrom);
    }

    if (dateTo) {
      query += " AND t.occurred_at <= ?";
      params.push(dateTo);
    }

    if (type && type !== "transfer") {
      query += " AND t.type = ?";
      params.push(type);
    }

    query += " GROUP BY c.id, c.name ORDER BY amount DESC";

    const rows = await db.getAllAsync<any>(query, params);

    // Calcular percentuais
    const total = rows.reduce((sum, row) => sum + row.amount, 0);

    return rows.map((row) => ({
      category_id: row.category_id,
      category_name: row.category_name,
      amount: row.amount,
      percentage: total > 0 ? (row.amount / total) * 100 : 0,
      transaction_count: row.transaction_count,
    }));
  }

  /**
   * Retorna atividade diária (somatório absoluto ou separado) para heatmap.
   * mode: 'net' => saldo (income - expenses); 'expense' => apenas despesas; 'income' => apenas receitas; 'abs' => income+expenses
   */
  async getDailyActivity(
    days: number = 120,
    mode: "net" | "expense" | "income" | "abs" = "expense"
  ): Promise<{ date: string; value: number }[]> {
    const db = await this.getDb();
    const rows = await db.getAllAsync<any>(
      `SELECT strftime('%Y-%m-%d', occurred_at) as day,
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
       FROM transactions
       WHERE occurred_at >= date('now', '-' || ? || ' days')
         AND is_pending = 0
       GROUP BY day
       ORDER BY day ASC`,
      [days]
    );

    const map = new Map<string, { income: number; expense: number }>();
    rows.forEach((r) => map.set(r.day, { income: r.income || 0, expense: r.expense || 0 }));

    const result: { date: string; value: number }[] = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const key = `${yyyy}-${mm}-${dd}`;
      const rec = map.get(key) || { income: 0, expense: 0 };
      let value = 0;
      switch (mode) {
        case "net":
          value = rec.income - rec.expense;
          break;
        case "income":
          value = rec.income;
          break;
        case "abs":
          value = rec.income + rec.expense;
          break;
        default:
          value = rec.expense;
      }
      result.push({ date: key, value });
    }
    return result;
  }

  private async updateAccountBalances(transaction: Transaction): Promise<void> {
    switch (transaction.type) {
      case "income":
        // Adicionar ao saldo da conta
        await this.adjustAccountBalance(transaction.account_id, transaction.amount);
        break;

      case "expense":
        // Subtrair do saldo da conta
        await this.adjustAccountBalance(transaction.account_id, -transaction.amount);
        break;

      case "transfer":
        // Subtrair da conta origem e adicionar à conta destino
        if (transaction.destination_account_id) {
          await this.adjustAccountBalance(transaction.account_id, -transaction.amount);
          await this.adjustAccountBalance(transaction.destination_account_id, transaction.amount);
        }
        break;
    }
  }

  private async reverseAccountBalances(transaction: Transaction): Promise<void> {
    switch (transaction.type) {
      case "income":
        // Reverter: subtrair do saldo da conta
        await this.adjustAccountBalance(transaction.account_id, -transaction.amount);
        break;

      case "expense":
        // Reverter: adicionar ao saldo da conta
        await this.adjustAccountBalance(transaction.account_id, transaction.amount);
        break;

      case "transfer":
        // Reverter: adicionar à conta origem e subtrair da conta destino
        if (transaction.destination_account_id) {
          await this.adjustAccountBalance(transaction.account_id, transaction.amount);
          await this.adjustAccountBalance(transaction.destination_account_id, -transaction.amount);
        }
        break;
    }
  }

  private async adjustAccountBalance(accountId: string, adjustment: number): Promise<void> {
    const db = await this.getDb();

    await db.runAsync("UPDATE accounts SET current_balance = current_balance + ? WHERE id = ?", [
      adjustment,
      accountId,
    ]);
  }

  private buildFilterQuery(
    filters?: TransactionFilters,
    limit?: number,
    offset?: number
  ): { query: string; params: any[] } {
    const { whereClause, params } = this.buildWhereClause(filters);

    let query = `SELECT * FROM transactions ${whereClause} ORDER BY occurred_at DESC, created_at DESC`;

    if (limit) {
      query += " LIMIT ?";
      params.push(limit.toString());

      if (offset) {
        query += " OFFSET ?";
        params.push(offset.toString());
      }
    }

    return { query, params };
  }

  private buildWhereClause(filters?: TransactionFilters): {
    whereClause: string;
    params: any[];
  } {
    const conditions = [];
    const params: any[] = [];

    if (filters?.account_ids && filters.account_ids.length > 0) {
      const placeholders = filters.account_ids.map(() => "?").join(",");
      conditions.push(
        `(account_id IN (${placeholders}) OR destination_account_id IN (${placeholders}))`
      );
      params.push(...filters.account_ids, ...filters.account_ids);
    }

    if (filters?.category_ids && filters.category_ids.length > 0) {
      const placeholders = filters.category_ids.map(() => "?").join(",");
      conditions.push(`category_id IN (${placeholders})`);
      params.push(...filters.category_ids);
    }

    if (filters?.transaction_types && filters.transaction_types.length > 0) {
      const placeholders = filters.transaction_types.map(() => "?").join(",");
      conditions.push(`type IN (${placeholders})`);
      params.push(...filters.transaction_types);
    }

    if (filters?.date_from) {
      conditions.push("occurred_at >= ?");
      params.push(filters.date_from);
    }

    if (filters?.date_to) {
      conditions.push("occurred_at <= ?");
      params.push(filters.date_to);
    }

    if (filters?.amount_min !== undefined) {
      conditions.push("amount >= ?");
      params.push(filters.amount_min);
    }

    if (filters?.amount_max !== undefined) {
      conditions.push("amount <= ?");
      params.push(filters.amount_max);
    }

    if (filters?.search_text) {
      conditions.push("(description LIKE ? OR notes LIKE ?)");
      const searchParam = `%${filters.search_text}%`;
      params.push(searchParam, searchParam);
    }

    if (filters?.tags && filters.tags.length > 0) {
      const mode = filters.tags_mode || "ANY";
      const tagConds: string[] = [];
      for (const tag of filters.tags) {
        tagConds.push("tags LIKE ?");
        params.push(`%"${tag}"%`);
      }
      conditions.push(
        mode === "ALL" ? tagConds.map((c) => `(${c})`).join(" AND ") : `(${tagConds.join(" OR ")})`
      );
    }

    if (filters && filters.include_transfers === false) {
      conditions.push("type != 'transfer'");
    }

    if (filters?.is_pending !== undefined) {
      conditions.push("is_pending = ?");
      params.push(filters.is_pending ? 1 : 0);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    return { whereClause, params };
  }

  private mapRowToTransaction(row: any): Transaction {
    return {
      id: row.id,
      type: row.type as TransactionType,
      account_id: row.account_id,
      destination_account_id: row.destination_account_id,
      category_id: row.category_id,
      amount: row.amount,
      description: row.description,
      notes: row.notes,
      occurred_at: row.occurred_at,
      tags: row.tags ? JSON.parse(row.tags) : undefined,
      attachment_path: row.attachment_path,
      recurrence_id: row.recurrence_id,
      is_pending: Boolean(row.is_pending),
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  async findByRecurrenceAndDate(recurrenceId: string, date: string): Promise<Transaction | null> {
    const db = await this.getDb();
    const row = await db.getFirstAsync<any>(
      "SELECT * FROM transactions WHERE recurrence_id = ? AND occurred_at = ?",
      [recurrenceId, date]
    );
    return row ? this.mapRowToTransaction(row) : null;
  }
}

export interface MonthlyTrend {
  period: string;
  income: number;
  expenses: number;
  balance: number;
}

export interface CategorySummary {
  category_id: string;
  category_name: string;
  amount: number;
  percentage: number;
  transaction_count: number;
}
