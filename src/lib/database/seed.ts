import * as SQLite from "expo-sqlite";

export const seedDatabase = async (db: SQLite.SQLiteDatabase) => {
  if (__DEV__) console.log("Starting database seeding...");

  // Verificar se já foi feito o seed
  const existingSettings = await db.getFirstAsync('SELECT id FROM settings WHERE id = "default"');
  if (existingSettings) {
    if (__DEV__) console.log("Database already seeded");
    return;
  }

  // Inserir configurações padrão
  await seedSettings(db);

  // Inserir categorias padrão
  await seedCategories(db);

  // Inserir conta padrão
  await seedAccounts(db);

  // Inserir orçamentos exemplo
  await seedBudgets(db);

  // Inserir recorrências exemplo
  await seedRecurrences(db);

  if (__DEV__) console.log("Database seeding completed");
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

  // Conta de investimento exemplo
  await db.runAsync(`
    INSERT INTO accounts (name, type, initial_balance, current_balance, icon, color)
    VALUES ('Investimentos', 'investment', 5900, 5900, 'trending-up', '#10b981')
  `);
};

const seedBudgets = async (db: SQLite.SQLiteDatabase) => {
  if (__DEV__) console.log("Iniciando seed de orçamentos...");

  // Pegar algumas categorias de exemplo
  const alimentacao = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM categories WHERE name = "Alimentação" AND parent_id IS NULL'
  );
  const transporte = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM categories WHERE name = "Transporte" AND parent_id IS NULL'
  );

  if (__DEV__) console.log("Categorias encontradas:", { alimentacao, transporte });

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 19);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
    .toISOString()
    .slice(0, 19);

  if (__DEV__) console.log("Período:", { startOfMonth, endOfMonth });

  const budgets = [
    {
      name: "Alimentação Mensal",
      category_id: alimentacao?.id || null,
      amount: 1500,
      period_type: "monthly",
      period_start: startOfMonth,
      period_end: endOfMonth,
      alert_percentage: 80,
      is_active: 1,
    },
    {
      name: "Transporte Mensal",
      category_id: transporte?.id || null,
      amount: 600,
      period_type: "monthly",
      period_start: startOfMonth,
      period_end: endOfMonth,
      alert_percentage: 80,
      is_active: 1,
    },
    {
      name: "Gastos Gerais",
      category_id: null,
      amount: 3000,
      period_type: "monthly",
      period_start: startOfMonth,
      period_end: endOfMonth,
      alert_percentage: 85,
      is_active: 1,
    },
  ];

  for (const b of budgets) {
    if (__DEV__) console.log("Inserindo orçamento:", b);
    await db.runAsync(
      `INSERT INTO budgets (name, category_id, amount, period_type, period_start, period_end, alert_percentage, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        b.name,
        b.category_id,
        b.amount,
        b.period_type,
        b.period_start,
        b.period_end,
        b.alert_percentage,
        b.is_active,
      ]
    );
  }

  if (__DEV__) console.log("Seed de orçamentos concluído!");
};

const seedRecurrences = async (db: SQLite.SQLiteDatabase) => {
  if (__DEV__) console.log("Iniciando seed de recorrências...");

  // Pegar contas e categorias para recorrências
  const carteira = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM accounts WHERE name = "Carteira"'
  );
  const contaCorrente = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM accounts WHERE name = "Conta Corrente"'
  );

  const salario = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM categories WHERE name = "Salário" AND type = "income"'
  );
  const moradia = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM categories WHERE name = "Moradia" AND type = "expense"'
  );
  const transporte = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM categories WHERE name = "Transporte" AND type = "expense"'
  );
  const supermercado = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM categories WHERE name = "Supermercado" AND type = "expense"'
  );

  if (__DEV__)
    console.log("IDs encontrados:", {
      carteira,
      contaCorrente,
      salario,
      moradia,
      transporte,
      supermercado,
    });

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const nextYear = new Date(now.getFullYear() + 1, now.getMonth(), 1).toISOString().slice(0, 10);

  const recurrences = [
    {
      name: "Salário",
      description: "Salário mensal",
      type: "income",
      amount: 5000,
      account_id: contaCorrente?.id || carteira?.id || "1",
      category_id: salario?.id || null,
      start_date: startOfMonth,
      end_date: nextYear,
      frequency: "monthly",
      frequency_data: JSON.stringify({ day_of_month: 5 }), // Todo dia 5
      next_occurrence: `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, "0")}-05`,
      is_active: 1,
    },
    {
      name: "Aluguel",
      description: "Aluguel da casa",
      type: "expense",
      amount: 1200,
      account_id: contaCorrente?.id || carteira?.id || "1",
      category_id: moradia?.id || null,
      start_date: startOfMonth,
      end_date: nextYear,
      frequency: "monthly",
      frequency_data: JSON.stringify({ day_of_month: 10 }), // Todo dia 10
      next_occurrence: `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, "0")}-10`,
      is_active: 1,
    },
    {
      name: "Vale Transporte",
      description: "Vale transporte mensal",
      type: "expense",
      amount: 180,
      account_id: carteira?.id || "1",
      category_id: transporte?.id || null,
      start_date: startOfMonth,
      end_date: nextYear,
      frequency: "monthly",
      frequency_data: JSON.stringify({ day_of_month: 1 }), // Todo dia 1
      next_occurrence: `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, "0")}-01`,
      is_active: 1,
    },
    {
      name: "Compras Semanais",
      description: "Supermercado toda semana",
      type: "expense",
      amount: 300,
      account_id: carteira?.id || "1",
      category_id: supermercado?.id || null,
      start_date: startOfMonth,
      end_date: nextYear,
      frequency: "weekly",
      frequency_data: JSON.stringify({ day_of_week: 6 }), // Todo sábado
      next_occurrence: `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, "0")}-02`,
      is_active: 1,
    },
  ];

  for (const r of recurrences) {
    if (__DEV__) console.log("Inserindo recorrência:", r);
    await db.runAsync(
      `INSERT INTO recurrences (name, description, type, amount, account_id, category_id, start_date, end_date, frequency, frequency_data, next_occurrence, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        r.name,
        r.description,
        r.type,
        r.amount,
        r.account_id,
        r.category_id,
        r.start_date,
        r.end_date,
        r.frequency,
        r.frequency_data,
        r.next_occurrence,
        r.is_active,
      ]
    );
  }

  if (__DEV__) console.log("Seed de recorrências concluído!");
};
