import * as SQLite from "expo-sqlite";
import { getDatabase } from "./migrations";
import type { Budget, BudgetPeriodType } from "../../types/entities";

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

    console.log("BudgetDAO findAll - Query:", query);
    console.log("BudgetDAO findAll - Params:", params);

    const results = await db.getAllAsync<any>(query, params);

    console.log("BudgetDAO findAll - Results:", results);

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

    return updatedBudget;
  }

  // Deletar orçamento
  async delete(id: string): Promise<void> {
    const db = await this.getDb();
    await db.runAsync("DELETE FROM budgets WHERE id = ?", [id]);
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
    const query = `
      SELECT 
        b.*, 
        c.name as category_name,
        (
          SELECT COALESCE(SUM(t.amount),0)
          FROM transactions t
          WHERE t.type = 'expense'
            AND t.is_pending = 0
            AND t.occurred_at >= b.period_start
            AND t.occurred_at <= b.period_end
            AND (b.category_id IS NULL OR t.category_id = b.category_id)
        ) as spent
      FROM budgets b
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE b.is_active = 1
      ORDER BY b.created_at DESC
    `;

    const rows = await db.getAllAsync<any>(query);

    return rows.map((row) => {
      const amount = row.amount as number;
      const spent = row.spent as number;
      const percentage = amount > 0 ? Math.min((spent / amount) * 100, 100) : 0;
      const remaining = amount - spent;
      return {
        budget: {
          id: row.id,
          name: row.name,
          category_id: row.category_id,
          amount: row.amount,
            period_type: row.period_type,
          period_start: row.period_start,
          period_end: row.period_end,
          alert_percentage: row.alert_percentage,
          is_active: row.is_active === 1,
          created_at: row.created_at,
          updated_at: row.updated_at,
          category_name: row.category_name,
        } as any,
        spent,
        percentage,
        remaining,
        is_exceeded: spent > amount,
      } as BudgetProgress;
    });
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
      console.log("BudgetDAO: Testando conexão...");
      const db = await this.getDb();

      const results = await db.getAllAsync<any>("SELECT * FROM budgets LIMIT 5");
      console.log("BudgetDAO: Teste de conexão bem-sucedido, resultados:", results);

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
}
