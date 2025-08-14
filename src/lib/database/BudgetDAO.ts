import * as SQLite from "expo-sqlite";
import { getDatabase } from "./migrations";
import type { Budget, BudgetPeriodType, Transaction } from "../../types/entities";
import { Events } from "../events";

export interface BudgetFilters {
  category_id?: string;
  period_type?: BudgetPeriodType;
  is_active?: boolean;
  period_start?: string;
  period_end?: string;
}

export interface BudgetProgress {
  budget: Budget;
  spent: number;
  percentage: number;
  remaining: number;
  is_exceeded: boolean;
}

export class BudgetDAO {
  private static instance: BudgetDAO;
  private db: SQLite.SQLiteDatabase | null = null;

  private constructor() {}

  public static getInstance(): BudgetDAO {
    if (!BudgetDAO.instance) {
      BudgetDAO.instance = new BudgetDAO();
    }
    return BudgetDAO.instance;
  }

  private async getDb(): Promise<SQLite.SQLiteDatabase> {
    if (!this.db) {
      this.db = await getDatabase();
    }
    return this.db;
  }

  // Criar orçamento
  async create(budget: Omit<Budget, "id" | "created_at" | "updated_at">): Promise<Budget> {
    const db = await this.getDb();
    // Gerar ID manualmente (32 chars hex) para evitar depender de lastInsertRowId em PK TEXT
    const id = Array.from({ length: 16 }, () =>
      Math.floor(Math.random() * 256)
        .toString(16)
        .padStart(2, "0")
    ).join("");

    await db.runAsync(
      `
      INSERT INTO budgets (id, name, category_id, amount, period_type, period_start, period_end, alert_percentage, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        id,
        budget.name,
        budget.category_id || null,
        budget.amount,
        budget.period_type,
        budget.period_start,
        budget.period_end,
        budget.alert_percentage,
        budget.is_active ? 1 : 0,
      ]
    );

    const createdBudget = await this.findById(id);
    if (!createdBudget) {
      console.error("BudgetDAO.create: falha ao recuperar orçamento recém inserido", {
        id,
        budget,
      });
      throw new Error("Erro ao criar orçamento");
    }

    // Inicializar cache (valor gasto 0) para o período
    try {
      await this.upsertCache(id, budget.period_start, budget.period_end, 0);
    } catch (e) {
      console.warn("[BudgetDAO] Falha ao inicializar cache de orçamento", e);
    }
    Events.emit("budgets:progressInvalidated", { reason: "budget created" } as any);
    return createdBudget;
  }

  // Buscar por ID
  async findById(id: string): Promise<Budget | null> {
    const db = await this.getDb();

    const result = await db.getFirstAsync<any>(
      `
      SELECT 
        b.*,
        c.name as category_name
      FROM budgets b
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE b.id = ?
      `,
      [id]
    );

    if (!result) return null;

    return {
      ...result,
      is_active: result.is_active === 1,
    };
  }

  // Buscar todos com filtros
  async findAll(filters: BudgetFilters = {}): Promise<Budget[]> {
    const db = await this.getDb();

    let query = `
      SELECT 
        b.*,
        c.name as category_name
      FROM budgets b
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters.category_id !== undefined) {
      query += " AND b.category_id = ?";
      params.push(filters.category_id);
    }

    if (filters.period_type) {
      query += " AND b.period_type = ?";
      params.push(filters.period_type);
    }

    if (filters.is_active !== undefined) {
      query += " AND b.is_active = ?";
      params.push(filters.is_active ? 1 : 0);
    }

    if (filters.period_start) {
      query += " AND b.period_end >= ?";
      params.push(filters.period_start);
    }

    if (filters.period_end) {
      query += " AND b.period_start <= ?";
      params.push(filters.period_end);
    }

    query += " ORDER BY b.created_at DESC";

    if (__DEV__) {
      console.log("[BudgetDAO] findAll query", { query, params });
    }

    const results = await db.getAllAsync<any>(query, params);

    if (__DEV__) {
      console.log("[BudgetDAO] findAll results count", results.length);
    }

    return results.map((budget) => ({
      ...budget,
      is_active: budget.is_active === 1,
    }));
  } // Atualizar orçamento
  async update(id: string, budget: Partial<Omit<Budget, "id" | "created_at">>): Promise<Budget> {
    const fields: string[] = [];
    const params: any[] = [];

    if (budget.name !== undefined) {
      fields.push("name = ?");
      params.push(budget.name);
    }

    if (budget.category_id !== undefined) {
      fields.push("category_id = ?");
      params.push(budget.category_id || null);
    }

    if (budget.amount !== undefined) {
      fields.push("amount = ?");
      params.push(budget.amount);
    }

    if (budget.period_type !== undefined) {
      fields.push("period_type = ?");
      params.push(budget.period_type);
    }

    if (budget.period_start !== undefined) {
      fields.push("period_start = ?");
      params.push(budget.period_start);
    }

    if (budget.period_end !== undefined) {
      fields.push("period_end = ?");
      params.push(budget.period_end);
    }

    if (budget.alert_percentage !== undefined) {
      fields.push("alert_percentage = ?");
      params.push(budget.alert_percentage);
    }

    if (budget.is_active !== undefined) {
      fields.push("is_active = ?");
      params.push(budget.is_active ? 1 : 0);
    }

    if (fields.length === 0) {
      throw new Error("Nenhum campo para atualizar");
    }

    fields.push("updated_at = datetime('now')");

    const db = await this.getDb();
    await db.runAsync(`UPDATE budgets SET ${fields.join(", ")} WHERE id = ?`, [...params, id]);

    const updatedBudget = await this.findById(id);
    if (!updatedBudget) {
      throw new Error("Erro ao atualizar orçamento");
    }
    // Invalida cache deste orçamento (será recalculado sob demanda)
    await this.invalidateCacheForBudget(id);
    Events.emit("budgets:progressInvalidated", { reason: "budget updated" } as any);
    return updatedBudget;
  }

  // Deletar orçamento
  async delete(id: string): Promise<void> {
    const db = await this.getDb();
    await db.runAsync("DELETE FROM budgets WHERE id = ?", [id]);
    // Remover cache associado
    await db.runAsync("DELETE FROM budget_progress_cache WHERE budget_id = ?", [id]);
    Events.emit("budgets:progressInvalidated", { reason: "budget deleted" } as any);
  }

  // Calcular progresso dos orçamentos
  async getBudgetProgress(filters: BudgetFilters = {}): Promise<BudgetProgress[]> {
    const budgets = await this.findAll(filters);
    const progressList: BudgetProgress[] = [];

    for (const budget of budgets) {
      const spent = await this.calculateSpentAmount(budget);
      const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
      const remaining = budget.amount - spent;

      progressList.push({
        budget,
        spent,
        percentage: Math.min(percentage, 100),
        remaining,
        is_exceeded: spent > budget.amount,
      });
    }

    return progressList;
  }

  // Versão otimizada: calcula gasto via subquery em lote
  async getActiveBudgetsProgressOptimized(): Promise<BudgetProgress[]> {
    const db = await this.getDb();
    // Buscar orçamentos ativos
    const budgets = await db.getAllAsync<any>(
      `SELECT b.*, c.name as category_name FROM budgets b LEFT JOIN categories c ON b.category_id = c.id WHERE b.is_active = 1 ORDER BY b.created_at DESC`
    );

    const results: BudgetProgress[] = [];
    for (const b of budgets) {
      // Tentar ler cache
      let spent: number | null = null;
      const cacheRow = await db.getFirstAsync<any>(
        `SELECT spent FROM budget_progress_cache WHERE budget_id = ? AND period_start = ? AND period_end = ?`,
        [b.id, b.period_start, b.period_end]
      );
      if (cacheRow) {
        spent = cacheRow.spent;
      }
      if (spent === null) {
        // Calcular e gravar
        spent = await this.calculateSpentAmount(b as any as Budget);
        await this.upsertCache(b.id, b.period_start, b.period_end, spent);
      }
      const amount = b.amount as number;
      const percentage = amount > 0 ? Math.min((spent / amount) * 100, 100) : 0;
      const remaining = amount - spent;
      results.push({
        budget: {
          id: b.id,
          name: b.name,
          category_id: b.category_id,
          amount: b.amount,
          period_type: b.period_type,
          period_start: b.period_start,
          period_end: b.period_end,
          alert_percentage: b.alert_percentage,
          is_active: b.is_active === 1,
          created_at: b.created_at,
          updated_at: b.updated_at,
          category_name: b.category_name,
        } as any,
        spent,
        percentage,
        remaining,
        is_exceeded: spent > amount,
      });
    }
    return results;
  }

  // Calcular valor gasto no orçamento
  private async calculateSpentAmount(budget: Budget): Promise<number> {
    const db = await this.getDb();

    let query = `
      SELECT COALESCE(SUM(amount), 0) as total_spent
      FROM transactions
      WHERE type = 'expense'
        AND is_pending = 0
        AND occurred_at >= ?
        AND occurred_at <= ?
    `;
    const params: any[] = [budget.period_start, budget.period_end];

    // Se tem categoria específica, filtrar por ela
    if (budget.category_id) {
      query += " AND category_id = ?";
      params.push(budget.category_id);
    }

    const result = await db.getFirstAsync<{ total_spent: number }>(query, params);
    return result?.total_spent || 0;
  }

  // Buscar orçamentos ativos do período atual
  async getCurrentActiveBudgets(): Promise<BudgetProgress[]> {
    // Usar versão otimizada
    return this.getActiveBudgetsProgressOptimized();
  }

  // Método de teste simples
  async testConnection(): Promise<Budget[]> {
    try {
      if (__DEV__) console.log("[BudgetDAO] testConnection start");
      const db = await this.getDb();

      const results = await db.getAllAsync<any>("SELECT * FROM budgets LIMIT 5");
      if (__DEV__) console.log("[BudgetDAO] testConnection ok", results.length);

      return results.map((budget) => ({
        ...budget,
        is_active: budget.is_active === 1,
      }));
    } catch (error) {
      console.error("BudgetDAO: Erro no teste de conexão:", error);
      throw error;
    }
  } // Buscar orçamentos que precisam de alerta
  async getBudgetsWithAlerts(): Promise<BudgetProgress[]> {
    const progressList = await this.getCurrentActiveBudgets();
    return progressList.filter((p) => p.percentage >= p.budget.alert_percentage);
  }

  private async upsertCache(
    budget_id: string,
    period_start: string,
    period_end: string,
    spent: number
  ) {
    const db = await this.getDb();
    await db.runAsync(
      `INSERT INTO budget_progress_cache (budget_id, period_start, period_end, spent, updated_at)
       VALUES (?, ?, ?, ?, datetime('now'))
       ON CONFLICT(budget_id, period_start, period_end) DO UPDATE SET
         spent=excluded.spent,
         updated_at=datetime('now')`,
      [budget_id, period_start, period_end, spent]
    );
  }

  private async invalidateCacheForBudget(budget_id: string) {
    const db = await this.getDb();
    await db.runAsync("DELETE FROM budget_progress_cache WHERE budget_id = ?", [budget_id]);
    Events.emit("budgets:progressInvalidated", { reason: "selective invalidation" } as any);
  }

  // Invalidação seletiva baseada em mudança de transação (antes/depois)
  async invalidateForTransactionChange(prevTx: Transaction | null, nextTx: Transaction | null) {
    try {
      const db = await this.getDb();
      // Considerar apenas impactos de despesas (budget rastreia gastos) incluindo mudança de data/categoria
      const relevant: { date: string; category_id: string | null }[] = [];
      const collect = (tx: Transaction | null) => {
        if (!tx) return;
        if (tx.type !== "expense") return;
        relevant.push({ date: tx.occurred_at, category_id: tx.category_id || null });
      };
      collect(prevTx);
      collect(nextTx);

      // Se houve mudança de data (dia) ou categoria entre prev e next (ambos despesa), incluir ambas as combinações
      if (prevTx && nextTx && prevTx.type === "expense" && nextTx.type === "expense") {
        const prevDay = prevTx.occurred_at.substring(0, 10);
        const nextDay = nextTx.occurred_at.substring(0, 10);
        const prevCat = prevTx.category_id || null;
        const nextCat = nextTx.category_id || null;
        if (prevDay !== nextDay || prevCat !== nextCat) {
          relevant.push({ date: prevTx.occurred_at, category_id: prevCat });
          relevant.push({ date: nextTx.occurred_at, category_id: nextCat });
        }
      }
      if (relevant.length === 0) return;

      // Normalizar (remover duplicados)
      const keySet = new Set<string>();
      const combos = relevant.filter((r) => {
        const k = `${r.date.substring(0, 10)}|${r.category_id || "_"}`;
        if (keySet.has(k)) return false;
        keySet.add(k);
        return true;
      });

      const affectedBudgetIds = new Set<string>();
      for (const combo of combos) {
        const date = combo.date;
        const categoryId = combo.category_id;
        // Buscar orçamentos ativos que abrangem a data e combinam com categoria (ou sem categoria)
        const rows = await db.getAllAsync<any>(
          `SELECT id, period_start, period_end FROM budgets
             WHERE is_active = 1
               AND period_start <= ?
               AND period_end >= ?
               AND (category_id IS NULL OR category_id = ?)`,
          [date, date, categoryId]
        );
        for (const r of rows) {
          affectedBudgetIds.add(`${r.id}|${r.period_start}|${r.period_end}`);
        }
      }

      if (affectedBudgetIds.size === 0) return;

      await db.execAsync("BEGIN TRANSACTION");
      try {
        for (const key of affectedBudgetIds) {
          const [id, period_start, period_end] = key.split("|");
          await db.runAsync(
            `DELETE FROM budget_progress_cache WHERE budget_id = ? AND period_start = ? AND period_end = ?`,
            [id, period_start, period_end]
          );
        }
        await db.execAsync("COMMIT");
      } catch (e) {
        await db.execAsync("ROLLBACK");
        throw e;
      }
      Events.emit("budgets:progressInvalidated", { reason: "transaction selective" } as any);
    } catch (e) {
      console.warn("[BudgetDAO] Falha na invalidação seletiva por transação", e);
    }
  }
}

// (Listener global removido em favor de invalidação seletiva dentro do TransactionDAO)
