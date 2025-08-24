// Script para testar consultas de relatórios
import { TransactionDAO } from "../src/lib/database/TransactionDAO";

async function testReports() {
  try {
    console.log("🧪 Testando consultas de relatórios...");

    const dao = TransactionDAO.getInstance();

    // Testar getTrends
    console.log("📊 getTrends (últimos 6 meses)...");
    const trends = await dao.getTrends("month", 6);
    console.log(`✅ Trends: ${trends.length} períodos`);

    // Testar getCategorySummary
    console.log("📈 getCategorySummary (6 meses)...");
    const dateFrom = new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    const dateTo = new Date().toISOString().split("T")[0];

    const expenseCategories = await dao.getCategorySummary(dateFrom, dateTo, "expense");
    console.log(`✅ Despesas por categoria: ${expenseCategories.length}`);

    const incomeCategories = await dao.getCategorySummary(dateFrom, dateTo, "income");
    console.log(`✅ Receitas por categoria: ${incomeCategories.length}`);

    console.log("🎉 Testes concluídos.");
  } catch (error) {
    console.error("❌ Erro nos testes:", error);
  }
}

// testReports();
console.log("✅ Script de testes de relatórios pronto");
