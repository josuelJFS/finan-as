// Database exports
export { getDatabase, DB_VERSION, DB_NAME } from "./migrations";
export { seedDatabase } from "./seed";

// DAOs
export { AccountDAO } from "./AccountDAO";
export { BudgetDAO } from "./BudgetDAO";
export { CategoryDAO, type CategoryHierarchy, type CategoryUsageStats } from "./CategoryDAO";
export { TransactionDAO, type MonthlyTrend, type CategorySummary } from "./TransactionDAO";
export { RecurrenceDAO, materializeDueRecurrences, computeNextOccurrence } from "./RecurrenceDAO";
export { FixedExpenseDAO } from "./FixedExpenseDAO";
export { PlannedExpenseDAO } from "./PlannedExpenseDAO";
// Backup utilities (export centralizado)
export { exportBackupToFile, shareBackup, importBackup } from "../backup";

// Database initialization helper
export const initializeDatabase = async (): Promise<void> => {
  const { getDatabase } = await import("./migrations");
  const { seedDatabase } = await import("./seed");

  const db = await getDatabase();
  await seedDatabase(db);
};
