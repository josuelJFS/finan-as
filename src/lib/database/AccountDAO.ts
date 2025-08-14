import * as SQLite from "expo-sqlite";
import { getDatabase } from "./migrations";
import type { Account, AccountType } from "../../types/entities";

export class AccountDAO {
  private static instance: AccountDAO;
  private db: SQLite.SQLiteDatabase | null = null;

  private constructor() {}

  public static getInstance(): AccountDAO {
    if (!AccountDAO.instance) {
      AccountDAO.instance = new AccountDAO();
    }
    return AccountDAO.instance;
  }

  private async getDb(): Promise<SQLite.SQLiteDatabase> {
    if (!this.db) {
      this.db = await getDatabase();
    }
    return this.db;
  }

  async create(
    account: Omit<Account, "id" | "created_at" | "updated_at" | "current_balance">
  ): Promise<string> {
    const db = await this.getDb();

    const result = await db.runAsync(
      `
      INSERT INTO accounts (name, type, initial_balance, current_balance, color, icon, is_archived, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        account.name,
        account.type,
        account.initial_balance,
        account.initial_balance, // current_balance igual ao initial_balance
        account.color,
        account.icon || "wallet",
        account.is_archived ? 1 : 0,
        account.description || null,
      ]
    );

    return result.lastInsertRowId?.toString() || "";
  }

  async findAll(includeArchived = false): Promise<Account[]> {
    const db = await this.getDb();

    const query = includeArchived
      ? "SELECT * FROM accounts ORDER BY is_archived ASC, name ASC"
      : "SELECT * FROM accounts WHERE is_archived = 0 ORDER BY name ASC";

    const rows = await db.getAllAsync<any>(query);

    return rows.map(this.mapRowToAccount);
  }

  async findById(id: string): Promise<Account | null> {
    const db = await this.getDb();

    const row = await db.getFirstAsync<any>("SELECT * FROM accounts WHERE id = ?", [id]);

    return row ? this.mapRowToAccount(row) : null;
  }

  async update(
    id: string,
    updates: Partial<Omit<Account, "id" | "created_at" | "updated_at">>
  ): Promise<void> {
    const db = await this.getDb();

    const setClause = [];
    const values = [];

    if (updates.name !== undefined) {
      setClause.push("name = ?");
      values.push(updates.name);
    }

    if (updates.type !== undefined) {
      setClause.push("type = ?");
      values.push(updates.type);
    }

    if (updates.initial_balance !== undefined) {
      setClause.push("initial_balance = ?");
      values.push(updates.initial_balance);
    }

    if (updates.current_balance !== undefined) {
      setClause.push("current_balance = ?");
      values.push(updates.current_balance);
    }

    if (updates.color !== undefined) {
      setClause.push("color = ?");
      values.push(updates.color);
    }

    if (updates.icon !== undefined) {
      setClause.push("icon = ?");
      values.push(updates.icon);
    }

    if (updates.is_archived !== undefined) {
      setClause.push("is_archived = ?");
      values.push(updates.is_archived ? 1 : 0);
    }

    if (updates.description !== undefined) {
      setClause.push("description = ?");
      values.push(updates.description);
    }

    if (setClause.length === 0) {
      return;
    }

    values.push(id);

    await db.runAsync(`UPDATE accounts SET ${setClause.join(", ")} WHERE id = ?`, values);
  }

  async delete(id: string): Promise<void> {
    const db = await this.getDb();

    // Verificar se existem transações associadas
    const transactionCount = await db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM transactions WHERE account_id = ? OR destination_account_id = ?",
      [id, id]
    );

    if (transactionCount && transactionCount.count > 0) {
      throw new Error("Não é possível excluir conta com transações associadas");
    }

    await db.runAsync("DELETE FROM accounts WHERE id = ?", [id]);
  }

  async updateBalance(accountId: string, newBalance: number): Promise<void> {
    const db = await this.getDb();

    await db.runAsync("UPDATE accounts SET current_balance = ? WHERE id = ?", [
      newBalance,
      accountId,
    ]);
  }

  async getBalanceSummary(): Promise<{
    total: number;
    byType: Record<AccountType, number>;
  }> {
    const db = await this.getDb();

    const rows = await db.getAllAsync<{ type: AccountType; total: number }>(
      "SELECT type, SUM(current_balance) as total FROM accounts WHERE is_archived = 0 GROUP BY type"
    );

    const byType: Record<AccountType, number> = {
      checking: 0,
      savings: 0,
      credit_card: 0,
      cash: 0,
      investment: 0,
      other: 0,
    };

    let total = 0;

    for (const row of rows) {
      byType[row.type] = row.total;
      total += row.total;
    }

    return { total, byType };
  }

  private mapRowToAccount(row: any): Account {
    return {
      id: row.id,
      name: row.name,
      type: row.type as AccountType,
      initial_balance: row.initial_balance,
      current_balance: row.current_balance,
      color: row.color,
      icon: row.icon,
      is_archived: Boolean(row.is_archived),
      description: row.description,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}
