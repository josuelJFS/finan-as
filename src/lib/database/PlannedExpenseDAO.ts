import * as SQLite from "expo-sqlite";
import { getDatabase } from "./migrations";
import { Events } from "../events";
import {
  PlannedExpense,
  ExpenseProjection,
  CreatePlannedExpenseData,
  MonthlyProjection,
} from "../../types/entities";

export class PlannedExpenseDAO {
  private static instance: PlannedExpenseDAO;
  private db: SQLite.SQLiteDatabase | null = null;

  private constructor() {}

  public static getInstance(): PlannedExpenseDAO {
    if (!PlannedExpenseDAO.instance) {
      PlannedExpenseDAO.instance = new PlannedExpenseDAO();
    }
    return PlannedExpenseDAO.instance;
  }

  private async getDb(): Promise<SQLite.SQLiteDatabase> {
    if (!this.db) {
      this.db = await getDatabase();
    }
    return this.db;
  }

  async create(expense: CreatePlannedExpenseData): Promise<string> {
    const db = await this.getDb();
    const id = Date.now().toString();

    // Calcular end_month baseado nas parcelas
    const startDate = new Date(expense.start_month + "-01");
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + expense.installments - 1);
    const endMonth = `${endDate.getFullYear()}-${(endDate.getMonth() + 1).toString().padStart(2, "0")}`;

    await db.runAsync(
      `INSERT INTO planned_expenses (id, name, amount, category_id, start_month, end_month, installments, current_installment, is_active, notes) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        expense.name,
        expense.amount,
        expense.category_id || null,
        expense.start_month,
        endMonth,
        expense.installments,
        1,
        1,
        expense.notes || null,
      ]
    );

    Events.emit("plannedExpenses:created", { id });
    return id;
  }

  async update(id: string, expense: Partial<PlannedExpense>): Promise<void> {
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
    if (expense.category_id !== undefined) {
      fields.push("category_id = ?");
      values.push(expense.category_id);
    }
    if (expense.installments !== undefined) {
      fields.push("installments = ?");
      values.push(expense.installments);
    }
    if (expense.current_installment !== undefined) {
      fields.push("current_installment = ?");
      values.push(expense.current_installment);
    }
    if (expense.is_active !== undefined) {
      fields.push("is_active = ?");
      values.push(expense.is_active ? 1 : 0);
    }
    if (expense.notes !== undefined) {
      fields.push("notes = ?");
      values.push(expense.notes);
    }

    if (fields.length === 0) return;

    fields.push("updated_at = datetime('now')");
    values.push(id);

    await db.runAsync(`UPDATE planned_expenses SET ${fields.join(", ")} WHERE id = ?`, values);

    Events.emit("plannedExpenses:updated", { id });
  }

  async delete(id: string): Promise<void> {
    const db = await this.getDb();
    await db.runAsync("DELETE FROM planned_expenses WHERE id = ?", [id]);
    Events.emit("plannedExpenses:deleted", { id });
  }

  async findAll(): Promise<PlannedExpense[]> {
    const db = await this.getDb();

    const result = await db.getAllAsync<PlannedExpense>(
      `SELECT * FROM planned_expenses WHERE is_active = 1 ORDER BY start_month, name`
    );

    return result.map((expense) => ({
      ...expense,
      is_active: Boolean(expense.is_active),
    }));
  }

  async findById(id: string): Promise<PlannedExpense | null> {
    const db = await this.getDb();

    const result = await db.getFirstAsync<PlannedExpense>(
      "SELECT * FROM planned_expenses WHERE id = ?",
      [id]
    );

    if (!result) return null;

    return {
      ...result,
      is_active: Boolean(result.is_active),
    };
  }

  // Buscar projeções de despesas para um período específico
  async getProjectionsForPeriod(
    startMonth: string,
    endMonth: string
  ): Promise<ExpenseProjection[]> {
    const db = await this.getDb();

    const projections: ExpenseProjection[] = [];
    const expenses = await this.findAll();

    for (const expense of expenses) {
      const currentDate = new Date(expense.start_month + "-01");
      let installmentNumber = 1;

      while (installmentNumber <= expense.installments) {
        const monthStr = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, "0")}`;

        if (monthStr >= startMonth && monthStr <= endMonth) {
          projections.push({
            planned_expense_id: expense.id,
            month: monthStr,
            installment_number: installmentNumber,
            amount: expense.amount,
            description: `${expense.name} (${installmentNumber}/${expense.installments})`,
          });
        }

        currentDate.setMonth(currentDate.getMonth() + 1);
        installmentNumber++;
      }
    }

    return projections.sort((a, b) => a.month.localeCompare(b.month));
  }

  // Calcular total de despesas planejadas para um mês específico
  async getTotalForMonth(month: string): Promise<number> {
    const projections = await this.getProjectionsForPeriod(month, month);
    return projections.reduce((total, projection) => total + projection.amount, 0);
  }

  // Buscar projeções mensais para um período (para visualização tipo fatura)
  async getMonthlyProjections(
    startMonth: string,
    endMonth: string,
    estimatedIncome: number = 0
  ): Promise<MonthlyProjection[]> {
    const { FixedExpenseDAO } = await import("./FixedExpenseDAO");
    const { TransactionDAO } = await import("./TransactionDAO");

    const fixedExpenseDAO = FixedExpenseDAO.getInstance();
    const transactionDAO = TransactionDAO.getInstance();

    const projections: MonthlyProjection[] = [];
    const currentDate = new Date(startMonth + "-01");
    const endDate = new Date(endMonth + "-01");

    while (currentDate <= endDate) {
      const monthStr = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, "0")}`;

      // Despesas fixas
      const fixedExpensesTotal = await fixedExpenseDAO.getTotalForPeriod(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1
      );

      // Despesas planejadas
      const plannedExpensesTotal = await this.getTotalForMonth(monthStr);

      // Despesas variáveis (histórico dos últimos 3 meses como estimativa)
      const trends = await transactionDAO.getTrends("month", 3);
      const averageVariableExpenses =
        trends.length > 0
          ? trends.reduce((sum, t) => sum + t.expenses, 0) / trends.length - fixedExpensesTotal
          : 0;

      const totalIncome = estimatedIncome || 0;
      const remainingBudget =
        totalIncome - fixedExpensesTotal - plannedExpensesTotal - averageVariableExpenses;

      let status: "positive" | "warning" | "negative" = "positive";
      if (remainingBudget < 0) status = "negative";
      else if (remainingBudget < totalIncome * 0.1) status = "warning"; // Menos de 10% da renda

      projections.push({
        month: monthStr,
        total_income: totalIncome,
        fixed_expenses: fixedExpensesTotal,
        planned_expenses: plannedExpensesTotal,
        variable_expenses: averageVariableExpenses,
        remaining_budget: remainingBudget,
        status,
      });

      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    return projections;
  }

  // Simular impacto de uma nova despesa planejada
  async simulateNewExpense(
    newExpense: CreatePlannedExpenseData,
    currentProjections: MonthlyProjection[]
  ): Promise<MonthlyProjection[]> {
    const simulatedProjections = [...currentProjections];

    const startDate = new Date(newExpense.start_month + "-01");
    let installmentNumber = 1;

    while (installmentNumber <= newExpense.installments) {
      const monthStr = `${startDate.getFullYear()}-${(startDate.getMonth() + 1).toString().padStart(2, "0")}`;

      const projectionIndex = simulatedProjections.findIndex((p) => p.month === monthStr);
      if (projectionIndex >= 0) {
        const projection = simulatedProjections[projectionIndex];
        const newPlannedExpenses = projection.planned_expenses + newExpense.amount;
        const newRemainingBudget =
          projection.total_income -
          projection.fixed_expenses -
          newPlannedExpenses -
          projection.variable_expenses;

        let newStatus: "positive" | "warning" | "negative" = "positive";
        if (newRemainingBudget < 0) newStatus = "negative";
        else if (newRemainingBudget < projection.total_income * 0.1) newStatus = "warning";

        simulatedProjections[projectionIndex] = {
          ...projection,
          planned_expenses: newPlannedExpenses,
          remaining_budget: newRemainingBudget,
          status: newStatus,
        };
      }

      startDate.setMonth(startDate.getMonth() + 1);
      installmentNumber++;
    }

    return simulatedProjections;
  }
}
