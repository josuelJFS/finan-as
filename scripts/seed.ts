import * as SQLite from "expo-sqlite";
import { seedDatabase as seedImpl } from "../src/lib/database/seed";

async function runSeed() {
  try {
    console.log("🌱 Iniciando seed do banco...");
    const db = await SQLite.openDatabaseAsync("appfinanca.db");
    await seedImpl(db);
    console.log("✅ Seed concluído.");
  } catch (e) {
    console.error("❌ Erro no seed:", e);
  }
}

// runSeed();
console.log("✅ Script de seed pronto");
