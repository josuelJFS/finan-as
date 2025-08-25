import * as SQLite from "expo-sqlite";

export default async function addIsFixedToRecurrences(db: SQLite.SQLiteDatabase) {
  // Adiciona a coluna is_fixed se não existir
  await db.execAsync(`ALTER TABLE recurrences ADD COLUMN is_fixed INTEGER DEFAULT 0`);
}
