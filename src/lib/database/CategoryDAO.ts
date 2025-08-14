import * as SQLite from "expo-sqlite";
import { getDatabase } from "./migrations";
import type { Category, TransactionType } from "../../types/entities";

export class CategoryDAO {
  private static instance: CategoryDAO;
  private db: SQLite.SQLiteDatabase | null = null;

  private constructor() {}

  public static getInstance(): CategoryDAO {
    if (!CategoryDAO.instance) {
      CategoryDAO.instance = new CategoryDAO();
    }
    return CategoryDAO.instance;
  }

  private async getDb(): Promise<SQLite.SQLiteDatabase> {
    if (!this.db) {
      this.db = await getDatabase();
    }
    return this.db;
  }

  async create(
    category: Omit<Category, "id" | "created_at" | "updated_at">
  ): Promise<string> {
    const db = await this.getDb();

    const result = await db.runAsync(
      `
      INSERT INTO categories (name, parent_id, type, color, icon, is_system, description)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
      [
        category.name,
        category.parent_id || null,
        category.type,
        category.color,
        category.icon,
        category.is_system ? 1 : 0,
        category.description || null,
      ]
    );

    return result.lastInsertRowId?.toString() || "";
  }

  async findAll(type?: TransactionType): Promise<Category[]> {
    const db = await this.getDb();

    let query = "SELECT * FROM categories";
    const params: any[] = [];

    if (type && type !== "transfer") {
      query += " WHERE type = ?";
      params.push(type);
    }

    query += " ORDER BY parent_id IS NULL DESC, name ASC";

    const rows = await db.getAllAsync<any>(query, params);

    return rows.map(this.mapRowToCategory);
  }

  async findById(id: string): Promise<Category | null> {
    const db = await this.getDb();

    const row = await db.getFirstAsync<any>("SELECT * FROM categories WHERE id = ?", [
      id,
    ]);

    return row ? this.mapRowToCategory(row) : null;
  }

  async findByParent(parentId: string | null): Promise<Category[]> {
    const db = await this.getDb();

    const query = parentId
      ? "SELECT * FROM categories WHERE parent_id = ? ORDER BY name ASC"
      : "SELECT * FROM categories WHERE parent_id IS NULL ORDER BY name ASC";

    const params = parentId ? [parentId] : [];
    const rows = await db.getAllAsync<any>(query, params);

    return rows.map(this.mapRowToCategory);
  }

  async findParentCategories(type?: TransactionType): Promise<Category[]> {
    const db = await this.getDb();

    let query = "SELECT * FROM categories WHERE parent_id IS NULL";
    const params: any[] = [];

    if (type && type !== "transfer") {
      query += " AND type = ?";
      params.push(type);
    }

    query += " ORDER BY name ASC";

    const rows = await db.getAllAsync<any>(query, params);

    return rows.map(this.mapRowToCategory);
  }

  async findSubcategories(parentId: string): Promise<Category[]> {
    const db = await this.getDb();

    const rows = await db.getAllAsync<any>(
      "SELECT * FROM categories WHERE parent_id = ? ORDER BY name ASC",
      [parentId]
    );

    return rows.map(this.mapRowToCategory);
  }

  async getHierarchy(type?: TransactionType): Promise<CategoryHierarchy[]> {
    const parents = await this.findParentCategories(type);
    const hierarchy: CategoryHierarchy[] = [];

    for (const parent of parents) {
      const children = await this.findSubcategories(parent.id);
      hierarchy.push({
        ...parent,
        children,
      });
    }

    return hierarchy;
  }

  async update(
    id: string,
    updates: Partial<Omit<Category, "id" | "created_at" | "updated_at">>
  ): Promise<void> {
    const db = await this.getDb();

    // Verificar se é categoria do sistema e se está tentando alterar campos protegidos
    const existing = await this.findById(id);
    if (
      existing?.is_system &&
      (updates.name !== undefined || updates.type !== undefined)
    ) {
      throw new Error("Não é possível alterar nome ou tipo de categorias do sistema");
    }

    const setClause = [];
    const values = [];

    if (updates.name !== undefined) {
      setClause.push("name = ?");
      values.push(updates.name);
    }

    if (updates.parent_id !== undefined) {
      setClause.push("parent_id = ?");
      values.push(updates.parent_id);
    }

    if (updates.type !== undefined) {
      setClause.push("type = ?");
      values.push(updates.type);
    }

    if (updates.color !== undefined) {
      setClause.push("color = ?");
      values.push(updates.color);
    }

    if (updates.icon !== undefined) {
      setClause.push("icon = ?");
      values.push(updates.icon);
    }

    if (updates.description !== undefined) {
      setClause.push("description = ?");
      values.push(updates.description);
    }

    if (setClause.length === 0) {
      return;
    }

    values.push(id);

    await db.runAsync(
      `UPDATE categories SET ${setClause.join(", ")} WHERE id = ?`,
      values
    );
  }

  async delete(id: string): Promise<void> {
    const db = await this.getDb();

    // Verificar se é categoria do sistema
    const category = await this.findById(id);
    if (category?.is_system) {
      throw new Error("Não é possível excluir categorias do sistema");
    }

    // Verificar se existem transações associadas
    const transactionCount = await db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM transactions WHERE category_id = ?",
      [id]
    );

    if (transactionCount && transactionCount.count > 0) {
      throw new Error("Não é possível excluir categoria com transações associadas");
    }

    // Verificar se existem subcategorias
    const subcategoryCount = await db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM categories WHERE parent_id = ?",
      [id]
    );

    if (subcategoryCount && subcategoryCount.count > 0) {
      throw new Error("Não é possível excluir categoria com subcategorias");
    }

    await db.runAsync("DELETE FROM categories WHERE id = ?", [id]);
  }

  async getCategoryUsageStats(): Promise<CategoryUsageStats[]> {
    const db = await this.getDb();

    const rows = await db.getAllAsync<any>(`
      SELECT 
        c.id,
        c.name,
        c.type,
        c.color,
        c.icon,
        COUNT(t.id) as transaction_count,
        COALESCE(SUM(t.amount), 0) as total_amount,
        MAX(t.occurred_at) as last_used
      FROM categories c
      LEFT JOIN transactions t ON c.id = t.category_id
      GROUP BY c.id, c.name, c.type, c.color, c.icon
      ORDER BY transaction_count DESC, c.name ASC
    `);

    return rows.map((row) => ({
      category_id: row.id,
      category_name: row.name,
      category_type: row.type,
      category_color: row.color,
      category_icon: row.icon,
      transaction_count: row.transaction_count,
      total_amount: row.total_amount,
      last_used: row.last_used,
    }));
  }

  private mapRowToCategory(row: any): Category {
    return {
      id: row.id,
      name: row.name,
      parent_id: row.parent_id,
      type: row.type as TransactionType,
      color: row.color,
      icon: row.icon,
      is_system: Boolean(row.is_system),
      description: row.description,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}

export interface CategoryHierarchy extends Category {
  children: Category[];
}

export interface CategoryUsageStats {
  category_id: string;
  category_name: string;
  category_type: TransactionType;
  category_color: string;
  category_icon: string;
  transaction_count: number;
  total_amount: number;
  last_used: string | null;
}
