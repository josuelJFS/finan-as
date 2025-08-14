import * as SQLite from "expo-sqlite";
import { getDatabase } from "./migrations";
import { TransactionDAO } from "./TransactionDAO";
import type { Recurrence, RecurrenceFrequency, TransactionType } from "../../types/entities";

export interface CreateRecurrenceInput {
  name: string;
  type: TransactionType;
  account_id: string;
  destination_account_id?: string;
  category_id?: string;
  amount: number;
  description: string;
  notes?: string;
  frequency: RecurrenceFrequency;
  interval_count?: number; // default 1
  days_of_week?: number[]; // weekly
  day_of_month?: number; // monthly
  start_date: string; // YYYY-MM-DD
  end_date?: string; // YYYY-MM-DD
  is_active?: boolean;
  tags?: string[];
}

export class RecurrenceDAO {
  private static instance: RecurrenceDAO;
  private db: SQLite.SQLiteDatabase | null = null;

  private constructor() {}

  public static getInstance(): RecurrenceDAO {
    if (!RecurrenceDAO.instance) RecurrenceDAO.instance = new RecurrenceDAO();
    return RecurrenceDAO.instance;
  }

  private async getDb(): Promise<SQLite.SQLiteDatabase> {
    if (!this.db) this.db = await getDatabase();
    return this.db;
  }

  async create(input: CreateRecurrenceInput): Promise<string> {
    const db = await this.getDb();
    const interval = input.interval_count ?? 1;
    const nextOccurrence = input.start_date; // primeira ocorrência é a data de início
    const result = await db.runAsync(
      `INSERT INTO recurrences (
        name,type,account_id,destination_account_id,category_id,amount,description,notes,
        frequency,interval_count,days_of_week,day_of_month,start_date,end_date,next_occurrence,is_active,tags
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        input.name,
        input.type,
        input.account_id,
        input.destination_account_id || null,
        input.category_id || null,
        input.amount,
        input.description,
        input.notes || null,
        input.frequency,
        interval,
        input.days_of_week ? JSON.stringify(input.days_of_week) : null,
        input.day_of_month || null,
        input.start_date,
        input.end_date || null,
        nextOccurrence,
        input.is_active === false ? 0 : 1,
        input.tags ? JSON.stringify(input.tags) : null,
      ]
    );
    return result.lastInsertRowId?.toString() || "";
  }

  async listAll(activeOnly = false): Promise<Recurrence[]> {
    const db = await this.getDb();
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM recurrences ${activeOnly ? "WHERE is_active = 1" : ""} ORDER BY created_at DESC`
    );
    return rows.map(this.mapRow);
  }

  async findDue(nowISO: string): Promise<Recurrence[]> {
    const db = await this.getDb();
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM recurrences 
       WHERE is_active = 1 
         AND next_occurrence <= ?
         AND (end_date IS NULL OR next_occurrence <= end_date)`,
      [nowISO]
    );
    return rows.map(this.mapRow);
  }

  async updateNextOccurrence(id: string, next: string): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(
      `UPDATE recurrences SET next_occurrence = ?, updated_at = datetime('now') WHERE id = ?`,
      [next, id]
    );
  }

  async deactivate(id: string): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(
      `UPDATE recurrences SET is_active = 0, updated_at = datetime('now') WHERE id = ?`,
      [id]
    );
  }

  private mapRow(row: any): Recurrence {
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      account_id: row.account_id,
      destination_account_id: row.destination_account_id || undefined,
      category_id: row.category_id || undefined,
      amount: row.amount,
      description: row.description,
      notes: row.notes || undefined,
      frequency: row.frequency,
      interval_count: row.interval_count,
      days_of_week: row.days_of_week ? JSON.parse(row.days_of_week) : undefined,
      day_of_month: row.day_of_month || undefined,
      start_date: row.start_date,
      end_date: row.end_date || undefined,
      next_occurrence: row.next_occurrence,
      is_active: row.is_active === 1,
      tags: row.tags ? JSON.parse(row.tags) : undefined,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}

// ===== Utilidades de cálculo de próxima ocorrência =====
export function computeNextOccurrence(r: Recurrence, fromDateISO?: string): string | null {
  const base = fromDateISO ? new Date(fromDateISO) : new Date(r.next_occurrence);
  if (isNaN(base.getTime())) return null;

  const freq = r.frequency;
  const interval = r.interval_count || 1;

  function toISO(d: Date) {
    return d.toISOString().substring(0, 10); // YYYY-MM-DD
  }

  if (freq === "daily") {
    const d = new Date(base);
    d.setDate(d.getDate() + interval);
    return toISO(d);
  }

  if (freq === "weekly") {
    const days = (
      r.days_of_week && r.days_of_week.length ? r.days_of_week : [base.getDay()]
    ).sort();
    const currentDow = base.getDay();
    // Próximo dia dentro do mesmo ciclo semanal
    for (const d of days) {
      if (d > currentDow) {
        const next = new Date(base);
        next.setDate(next.getDate() + (d - currentDow));
        return toISO(next);
      }
    }
    // Nenhum restante nesta semana: avançar (interval-1) semanas + primeira do array
    const weeksToAdd = interval - 1 + 1; // fecha esta semana + (interval-1)
    const next = new Date(base);
    next.setDate(next.getDate() + weeksToAdd * 7);
    // alinhar para o primeiro dia definido
    const first = days[0];
    const delta = first - next.getDay();
    next.setDate(next.getDate() + (delta >= 0 ? delta : delta + 7));
    return toISO(next);
  }

  if (freq === "monthly") {
    const d = new Date(base);
    const dom = r.day_of_month || d.getDate();
    // adicionar interval meses
    d.setMonth(d.getMonth() + interval);
    // Ajustar para último dia do mês se necessário
    const year = d.getFullYear();
    const month = d.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();
    d.setDate(Math.min(dom, lastDay));
    return toISO(d);
  }

  if (freq === "yearly") {
    const d = new Date(base);
    d.setFullYear(d.getFullYear() + interval);
    return toISO(d);
  }

  return null;
}

// ===== Engine de materialização =====
export async function materializeDueRecurrences(): Promise<number> {
  const recurrenceDAO = RecurrenceDAO.getInstance();
  const transactionDAO = TransactionDAO.getInstance();
  const nowISO = new Date().toISOString().substring(0, 10); // usar somente data
  const due = await recurrenceDAO.findDue(nowISO);
  let created = 0;

  for (const rec of due) {
    // Loop para materializar múltiplas ocorrências atrasadas (ex: app ficou dias fechado)
    let safety = 0;
    let nextDate = rec.next_occurrence;
    while (nextDate <= nowISO && safety < 100) {
      // Criar transação baseada na recorrência
      await transactionDAO.create({
        type: rec.type,
        account_id: rec.account_id,
        destination_account_id: rec.destination_account_id,
        category_id: rec.category_id,
        amount: rec.amount,
        description: rec.description,
        notes: rec.notes,
        occurred_at: nextDate,
        tags: rec.tags,
        attachment_path: undefined,
        recurrence_id: rec.id,
        is_pending: false,
      });
      created++;
      safety++;
      // Calcular próxima
      const newNext = computeNextOccurrence(rec, nextDate);
      if (!newNext || newNext === nextDate) break; // evita loop infinito
      nextDate = newNext;
      // Atualizar estrutura local para manter cálculo em cascata
      (rec as any).next_occurrence = newNext;
    }
    if (rec.next_occurrence !== nextDate) {
      await recurrenceDAO.updateNextOccurrence(rec.id, nextDate);
    }
  }

  if (created > 0) {
    // Eventos já disparados pelo TransactionDAO
    console.log(`[Recurrences] Materializadas ${created} transações recorrentes.`);
  }
  return created;
}
