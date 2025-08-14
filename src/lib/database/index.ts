// Database exports
export { getDatabase, DB_VERSION, DB_NAME } from "./migrations";
export { seedDatabase } from "./seed";

// DAOs
export { AccountDAO } from "./AccountDAO";
export { BudgetDAO } from "./BudgetDAO";
export { CategoryDAO, type CategoryHierarchy, type CategoryUsageStats } from "./CategoryDAO";
export { TransactionDAO, type MonthlyTrend, type CategorySummary } from "./TransactionDAO";

// Database initialization helper
export const initializeDatabase = async (): Promise<void> => {
  const { getDatabase } = await import("./migrations");
  const { seedDatabase } = await import("./seed");

  const db = await getDatabase();
  await seedDatabase(db);
};
