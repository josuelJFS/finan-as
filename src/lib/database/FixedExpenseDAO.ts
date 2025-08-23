import * as SQLite from "expo-sqlite";
import { getDatabase } from "./migrations";
import { Events } from "../events";

export interface FixedExpense {
  id: string;
  name: string;
  amount: number;
  category: string;
  due_day: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FixedExpensePayment {
  id: string;
  fixed_expense_id: string;
  year: number;
  month: number;
  is_paid: boolean;
  paid_at?: string;
  amount: number;
  created_at: string;
}

export interface FixedExpenseWithPayment extends FixedExpense {
  isPaid: boolean;
  paymentId?: string;
}

export class FixedExpenseDAO {
  private static instance: FixedExpenseDAO;
  private db: SQLite.SQLiteDatabase | null = null;

  private constructor() {}

  public static getInstance(): FixedExpenseDAO {
    if (!FixedExpenseDAO.instance) {
      FixedExpenseDAO.instance = new FixedExpenseDAO();
    }
    return FixedExpenseDAO.instance;
  }

  private async getDb(): Promise<SQLite.SQLiteDatabase> {
    if (!this.db) {
      this.db = await getDatabase();
    }
    return this.db;
  }

  async create(expense: Omit<FixedExpense, "id" | "created_at" | "updated_at">): Promise<string> {
    const db = await this.getDb();
    const id = Date.now().toString();

    await db.runAsync(
      `INSERT INTO fixed_expenses (id, name, amount, category, due_day, is_active) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        expense.name,
        expense.amount,
        expense.category,
        expense.due_day,
        expense.is_active ? 1 : 0,
      ]
    );

    Events.emit("fixedExpenses:created", { id });
    return id;
  }

  async update(id: string, expense: Partial<FixedExpense>): Promise<void> {
    const db = await this.getDb();

    const fields = [];
    const values = [];

    if (expense.name !== undefined) {
      fields.push("name = ?");
      values.push(expense.name);
    }
    if (expense.amount !== undefined) {
      fields.push("amount = ?");
      values.push(expense.amount);
    }
    if (expense.category !== undefined) {
      fields.push("category = ?");
      values.push(expense.category);
    }
    if (expense.due_day !== undefined) {
      fields.push("due_day = ?");
      values.push(expense.due_day);
    }
    if (expense.is_active !== undefined) {
      fields.push("is_active = ?");
      values.push(expense.is_active ? 1 : 0);
    }

    if (fields.length === 0) return;

    fields.push("updated_at = datetime('now')");
    values.push(id);

    await db.runAsync(`UPDATE fixed_expenses SET ${fields.join(", ")} WHERE id = ?`, values);

    Events.emit("fixedExpenses:updated", { id });
  }

  async delete(id: string): Promise<void> {
    const db = await this.getDb();

    await db.runAsync("DELETE FROM fixed_expenses WHERE id = ?", [id]);
    Events.emit("fixedExpenses:deleted", { id });
  }

  async findAll(): Promise<FixedExpense[]> {
    const db = await this.getDb();

    const result = await db.getAllAsync<FixedExpense>(
      `SELECT * FROM fixed_expenses WHERE is_active = 1 ORDER BY due_day, name`
    );

    return result.map((expense) => ({
      ...expense,
      is_active: Boolean(expense.is_active),
    }));
  }

  async findById(id: string): Promise<FixedExpense | null> {
    const db = await this.getDb();

    const result = await db.getFirstAsync<FixedExpense>(
      "SELECT * FROM fixed_expenses WHERE id = ?",
      [id]
    );

    if (!result) return null;

    return {
      ...result,
      is_active: Boolean(result.is_active),
    };
  }

  // Marcar/desmarcar pagamento de uma despesa fixa
  async togglePayment(fixedExpenseId: string, year: number, month: number): Promise<void> {
    const db = await this.getDb();

    await db.execAsync("BEGIN TRANSACTION");
    try {
      // Buscar pagamento existente
      const existingPayment = await db.getFirstAsync<FixedExpensePayment>(
        `SELECT * FROM fixed_expense_payments 
         WHERE fixed_expense_id = ? AND year = ? AND month = ?`,
        [fixedExpenseId, year, month]
      );

      if (existingPayment) {
        // Alternar status do pagamento
        const newStatus = !existingPayment.is_paid;
        await db.runAsync(
          `UPDATE fixed_expense_payments 
           SET is_paid = ?, paid_at = ? 
           WHERE id = ?`,
          [newStatus ? 1 : 0, newStatus ? new Date().toISOString() : null, existingPayment.id]
        );
      } else {
        // Buscar valor da despesa fixa
        const expense = await this.findById(fixedExpenseId);
        if (!expense) throw new Error("Despesa fixa não encontrada");

        // Criar novo pagamento como pago
        const paymentId = Date.now().toString();
        await db.runAsync(
          `INSERT INTO fixed_expense_payments 
           (id, fixed_expense_id, year, month, is_paid, paid_at, amount) 
           VALUES (?, ?, ?, ?, 1, ?, ?)`,
          [paymentId, fixedExpenseId, year, month, new Date().toISOString(), expense.amount]
        );
      }

      await db.execAsync("COMMIT");
      Events.emit("fixedExpenses:paymentToggled", { fixedExpenseId, year, month });
    } catch (error) {
      await db.execAsync("ROLLBACK");
      throw error;
    }
  }

  // Buscar despesas fixas com status de pagamento para um período
  async findWithPaymentStatus(year: number, month: number): Promise<FixedExpenseWithPayment[]> {
    const db = await this.getDb();

    const result = await db.getAllAsync<any>(
      `SELECT 
         fe.*,
         fep.id as payment_id,
         fep.is_paid
       FROM fixed_expenses fe
       LEFT JOIN fixed_expense_payments fep ON (
         fe.id = fep.fixed_expense_id AND 
         fep.year = ? AND 
         fep.month = ?
       )
       WHERE fe.is_active = 1
       ORDER BY fe.due_day, fe.name`,
      [year, month]
    );

    return result.map((row) => ({
      id: row.id,
      name: row.name,
      amount: row.amount,
      category: row.category,
      due_day: row.due_day,
      is_active: Boolean(row.is_active),
      created_at: row.created_at,
      updated_at: row.updated_at,
      isPaid: Boolean(row.is_paid),
      paymentId: row.payment_id,
    }));
  }

  // Calcular total de despesas fixas para um período
  async getTotalForPeriod(year: number, month: number): Promise<number> {
    const db = await this.getDb();

    const result = await db.getFirstAsync<{ total: number }>(
      `SELECT SUM(amount) as total 
       FROM fixed_expenses 
       WHERE is_active = 1`
    );

    return result?.total || 0;
  }

  // Calcular total pago para um período
  async getTotalPaidForPeriod(year: number, month: number): Promise<number> {
    const db = await this.getDb();

    const result = await db.getFirstAsync<{ total: number }>(
      `SELECT SUM(fep.amount) as total
       FROM fixed_expense_payments fep
       JOIN fixed_expenses fe ON fe.id = fep.fixed_expense_id
       WHERE fep.year = ? AND fep.month = ? AND fep.is_paid = 1 AND fe.is_active = 1`,
      [year, month]
    );

    return result?.total || 0;
  }

  // Estatísticas de pagamento
  async getPaymentStats(
    year: number,
    month: number
  ): Promise<{
    total: number;
    paid: number;
    pending: number;
    percentPaid: number;
  }> {
    const total = await this.getTotalForPeriod(year, month);
    const paid = await this.getTotalPaidForPeriod(year, month);
    const pending = total - paid;
    const percentPaid = total > 0 ? (paid / total) * 100 : 0;

    return { total, paid, pending, percentPaid };
  }
}
