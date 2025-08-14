import * as SQLite from "expo-sqlite";

export const seedDatabase = async (db: SQLite.SQLiteDatabase) => {
  console.log("Starting database seeding...");

  // Verificar se já foi feito o seed
  const existingSettings = await db.getFirstAsync(
    'SELECT id FROM settings WHERE id = "default"'
  );
  if (existingSettings) {
    console.log("Database already seeded");
    return;
  }

  // Inserir configurações padrão
  await seedSettings(db);

  // Inserir categorias padrão
  await seedCategories(db);

  // Inserir conta padrão
  await seedAccounts(db);

  console.log("Database seeding completed");
};

const seedSettings = async (db: SQLite.SQLiteDatabase) => {
  await db.runAsync(`
    INSERT INTO settings (id, currency, theme, first_day_of_week, date_format, number_format, language)
    VALUES ('default', 'BRL', 'system', 1, 'DD/MM/YYYY', 'pt-BR', 'pt-BR')
  `);
};

const seedCategories = async (db: SQLite.SQLiteDatabase) => {
  // Categorias de despesa
  const expenseCategories = [
    { name: "Alimentação", icon: "restaurant", color: "#ef4444" },
    { name: "Transporte", icon: "car", color: "#3b82f6" },
    { name: "Moradia", icon: "home", color: "#8b5cf6" },
    { name: "Saúde", icon: "medical", color: "#10b981" },
    { name: "Educação", icon: "school", color: "#f59e0b" },
    { name: "Lazer", icon: "game-controller", color: "#ec4899" },
    { name: "Roupas", icon: "shirt", color: "#06b6d4" },
    { name: "Beleza", icon: "cut", color: "#f97316" },
    { name: "Presentes", icon: "gift", color: "#84cc16" },
    { name: "Outros", icon: "ellipsis-horizontal", color: "#6b7280" },
  ];

  // Categorias de receita
  const incomeCategories = [
    { name: "Salário", icon: "cash", color: "#10b981" },
    { name: "Freelance", icon: "briefcase", color: "#3b82f6" },
    { name: "Investimentos", icon: "trending-up", color: "#8b5cf6" },
    { name: "Vendas", icon: "storefront", color: "#f59e0b" },
    { name: "Presentes Recebidos", icon: "gift", color: "#ec4899" },
    { name: "Outros", icon: "ellipsis-horizontal", color: "#6b7280" },
  ];

  // Inserir categorias de despesa
  for (const category of expenseCategories) {
    await db.runAsync(
      `
      INSERT INTO categories (name, type, icon, color, is_system)
      VALUES (?, 'expense', ?, ?, 1)
    `,
      [category.name, category.icon, category.color]
    );
  }

  // Inserir categorias de receita
  for (const category of incomeCategories) {
    await db.runAsync(
      `
      INSERT INTO categories (name, type, icon, color, is_system)
      VALUES (?, 'income', ?, ?, 1)
    `,
      [category.name, category.icon, category.color]
    );
  }

  // Subcategorias para Alimentação
  const alimentacaoId = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM categories WHERE name = "Alimentação" AND type = "expense"'
  );

  if (alimentacaoId) {
    const subcategorias = [
      { name: "Supermercado", icon: "storefront", color: "#ef4444" },
      { name: "Restaurantes", icon: "restaurant", color: "#ef4444" },
      { name: "Delivery", icon: "bicycle", color: "#ef4444" },
      { name: "Lanchonete", icon: "fast-food", color: "#ef4444" },
    ];

    for (const sub of subcategorias) {
      await db.runAsync(
        `
        INSERT INTO categories (name, parent_id, type, icon, color, is_system)
        VALUES (?, ?, 'expense', ?, ?, 1)
      `,
        [sub.name, alimentacaoId.id, sub.icon, sub.color]
      );
    }
  }

  // Subcategorias para Transporte
  const transporteId = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM categories WHERE name = "Transporte" AND type = "expense"'
  );

  if (transporteId) {
    const subcategorias = [
      { name: "Combustível", icon: "car", color: "#3b82f6" },
      { name: "Transporte Público", icon: "bus", color: "#3b82f6" },
      { name: "Manutenção", icon: "construct", color: "#3b82f6" },
      { name: "Estacionamento", icon: "car-sport", color: "#3b82f6" },
      { name: "Uber/Taxi", icon: "car", color: "#3b82f6" },
    ];

    for (const sub of subcategorias) {
      await db.runAsync(
        `
        INSERT INTO categories (name, parent_id, type, icon, color, is_system)
        VALUES (?, ?, 'expense', ?, ?, 1)
      `,
        [sub.name, transporteId.id, sub.icon, sub.color]
      );
    }
  }
};

const seedAccounts = async (db: SQLite.SQLiteDatabase) => {
  // Conta padrão
  await db.runAsync(`
    INSERT INTO accounts (name, type, initial_balance, current_balance, icon, color)
    VALUES ('Carteira', 'cash', 0, 0, 'wallet', '#10b981')
  `);

  // Conta bancária exemplo
  await db.runAsync(`
    INSERT INTO accounts (name, type, initial_balance, current_balance, icon, color)
    VALUES ('Conta Corrente', 'checking', 0, 0, 'card', '#3b82f6')
  `);
};
