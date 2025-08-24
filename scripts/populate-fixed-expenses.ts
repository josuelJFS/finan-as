// Script para popular as despesas fixas com dados do Excel
import { FixedExpenseDAO } from "../src/lib/database/FixedExpenseDAO";

async function populateFixedExpenses() {
  try {
    console.log("🔧 Populando despesas fixas...");

    const dao = FixedExpenseDAO.getInstance();

    // Dados baseados no Excel do usuário
    const expenses = [
      { name: "Prime HBO", amount: 359, category: "Entretenimento", due_day: 15 },
      { name: "Internet", amount: 50, category: "Essencial", due_day: 10 },
      { name: "Plano de Saúde", amount: 757.81, category: "Saúde", due_day: 5 },
      { name: "Caixa", amount: 1100, category: "Financiamento", due_day: 8 },
      { name: "Cartão", amount: 3000, category: "Financiamento", due_day: 25 },
      { name: "Condomínio + Água", amount: 380, category: "Moradia", due_day: 10 },
      { name: "Feira + Gatos", amount: 1200, category: "Alimentação", due_day: 30 },
      { name: "Energia", amount: 350, category: "Essencial", due_day: 15 },
    ];

    for (const expense of expenses) {
      await dao.create({
        ...expense,
        is_active: true,
      });
      console.log(`✅ Adicionado: ${expense.name}`);
    }

    console.log("🎉 Despesas fixas populadas com sucesso!");

    // Mostrar estatísticas
    const now = new Date();
    const stats = await dao.getPaymentStats(now.getFullYear(), now.getMonth() + 1);
    console.log(`💰 Total mensal: R$ ${stats.total.toFixed(2)}`);
    console.log(`📈 Total de despesas: ${expenses.length}`);
  } catch (error) {
    console.error("❌ Erro ao popular despesas fixas:", error);
  }
}

// Evita execução automática ao importar; descomente para rodar diretamente
// populateFixedExpenses();

console.log("✅ Script de populate despesas fixas pronto");
