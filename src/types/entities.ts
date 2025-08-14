// Tipos base para entidades do banco de dados

export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
}

export interface Settings {
  id: string;
  currency: string;
  theme: "light" | "dark" | "system";
  first_day_of_week: number; // 0 = domingo, 1 = segunda
  date_format: string;
  number_format: string;
  language: string;
  created_at: string;
  updated_at: string;
}

export interface Account extends BaseEntity {
  name: string;
  type: AccountType;
  initial_balance: number;
  current_balance: number;
  color: string;
  icon: string;
  is_archived: boolean;
  description?: string;
}

export type AccountType =
  | "checking" // Conta corrente
  | "savings" // Poupança
  | "credit_card" // Cartão de crédito
  | "cash" // Dinheiro
  | "investment" // Investimento
  | "other"; // Outros

export interface Category extends BaseEntity {
  name: string;
  parent_id?: string;
  type: TransactionType;
  color: string;
  icon: string;
  is_system: boolean; // Categoria do sistema (não pode ser deletada)
  description?: string;
}

export interface Transaction extends BaseEntity {
  type: TransactionType;
  account_id: string;
  destination_account_id?: string; // Para transferências
  category_id?: string;
  amount: number;
  description: string;
  notes?: string;
  occurred_at: string;
  tags?: string[]; // JSON array como string
  attachment_path?: string;
  recurrence_id?: string;
  is_pending: boolean;
}

export type TransactionType = "income" | "expense" | "transfer";

export interface Budget extends BaseEntity {
  name: string;
  category_id?: string; // null = orçamento geral
  amount: number;
  period_type: BudgetPeriodType;
  period_start: string;
  period_end: string;
  alert_percentage: number; // Percentual para alerta (ex: 80)
  is_active: boolean;
}

export type BudgetPeriodType = "monthly" | "quarterly" | "yearly" | "custom";

export interface Goal extends BaseEntity {
  name: string;
  description?: string;
  target_amount: number;
  current_amount: number;
  target_date?: string;
  is_completed: boolean;
  color: string;
  icon: string;
}

export interface Recurrence extends BaseEntity {
  name: string;
  type: TransactionType;
  account_id: string;
  destination_account_id?: string;
  category_id?: string;
  amount: number;
  description: string;
  notes?: string;
  frequency: RecurrenceFrequency;
  interval_count: number; // A cada X dias/semanas/meses
  days_of_week?: number[]; // Para frequência semanal
  day_of_month?: number; // Para frequência mensal
  start_date: string;
  end_date?: string;
  next_occurrence: string;
  is_active: boolean;
  tags?: string[];
}

export type RecurrenceFrequency = "daily" | "weekly" | "monthly" | "yearly";

// Tipos para relatórios e cálculos
export interface BalanceSummary {
  total_balance: number;
  total_income: number;
  total_expenses: number;
  period_start: string;
  period_end: string;
}

export interface CategorySummary {
  category_id: string;
  category_name: string;
  amount: number;
  percentage: number;
  transaction_count: number;
}

export interface MonthlyTrend {
  period: string; // YYYY-MM
  income: number;
  expenses: number;
  balance: number;
}

export interface BudgetProgress {
  budget_id: string;
  budget_name: string;
  budgeted_amount: number;
  spent_amount: number;
  remaining_amount: number;
  percentage_used: number;
  is_over_budget: boolean;
  days_remaining: number;
}

// Tipos para filtros
export interface TransactionFilters {
  account_ids?: string[];
  category_ids?: string[];
  transaction_types?: TransactionType[];
  date_from?: string;
  date_to?: string;
  amount_min?: number;
  amount_max?: number;
  search_text?: string;
  tags?: string[];
  is_pending?: boolean;
}

export interface SavedFilter extends BaseEntity {
  name: string;
  filters: TransactionFilters;
  is_default: boolean;
}

// Tipos para backup
export interface BackupData {
  version: string;
  exported_at: string;
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  goals: Goal[];
  recurrences: Recurrence[];
  settings: Settings;
}

// Tipos para componentes
export interface SelectOption {
  label: string;
  value: string;
  icon?: string;
  color?: string;
}

export interface FormErrors {
  [key: string]: string | undefined;
}

// Tipos para operações CRUD
export interface CreateAccountData {
  name: string;
  type: AccountType;
  initial_balance: number;
  color: string;
  icon?: string;
  is_archived?: boolean;
  description?: string;
}

export interface UpdateAccountData {
  name?: string;
  type?: AccountType;
  color?: string;
  icon?: string;
  is_archived?: boolean;
  description?: string;
}

export interface CreateCategoryData {
  name: string;
  parent_id?: string;
  type: TransactionType;
  color: string;
  icon: string;
  description?: string;
}

export interface UpdateCategoryData {
  name?: string;
  parent_id?: string;
  color?: string;
  icon?: string;
  description?: string;
}

export interface CreateTransactionData {
  type: TransactionType;
  account_id: string;
  destination_account_id?: string;
  category_id?: string;
  amount: number;
  description: string;
  notes?: string;
  occurred_at: string;
  tags?: string[];
  attachment_path?: string;
  recurrence_id?: string;
  is_pending?: boolean;
}

export interface UpdateTransactionData {
  type?: TransactionType;
  account_id?: string;
  destination_account_id?: string;
  category_id?: string;
  amount?: number;
  description?: string;
  notes?: string;
  occurred_at?: string;
  tags?: string[];
  attachment_path?: string;
  is_pending?: boolean;
}
