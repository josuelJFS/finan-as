import type { TransactionFilters } from "../../types/entities";

// Conta quantos grupos de filtros estão ativos (para badge/resumo)
export function countActiveFilters(f: TransactionFilters): number {
  if (!f) return 0;
  let c = 0;
  if (f.transaction_types && f.transaction_types.length) c++;
  if (f.account_ids && f.account_ids.length) c++;
  if (f.category_ids && f.category_ids.length) c++;
  if (f.date_from || f.date_to) c++;
  if (f.amount_min !== undefined || f.amount_max !== undefined) c++;
  if (f.search_text) c++;
  if (f.tags && f.tags.length) c++;
  if (f.is_pending !== undefined) c++;
  if (f.include_transfers === false) c++;
  return c;
}

// Gera uma descrição acessível resumida dos filtros ativos para uso em accessibilityLabel
export function buildFiltersAccessibilityLabel(f: TransactionFilters): string {
  const parts: string[] = [];
  if (f.transaction_types?.length) {
    const map: Record<string, string> = {
      income: "receitas",
      expense: "despesas",
      transfer: "transferências",
    };
    parts.push(`Tipos: ${f.transaction_types.map((t) => map[t] || t).join(", ")}`);
  }
  if (f.account_ids?.length) parts.push(`${f.account_ids.length} contas`);
  if (f.category_ids?.length) parts.push(`${f.category_ids.length} categorias`);
  if (f.date_from || f.date_to) parts.push("intervalo de datas aplicado");
  if (f.amount_min !== undefined || f.amount_max !== undefined) {
    parts.push("faixa de valores");
  }
  if (f.search_text) parts.push("busca por texto");
  if (f.tags?.length)
    parts.push(`tags (${f.tags.length}) modo ${f.tags_mode === "ALL" ? "todas" : "qualquer"}`);
  if (f.is_pending !== undefined) parts.push(f.is_pending ? "somente pendentes" : "não pendentes");
  if (f.include_transfers === false) parts.push("transferências excluídas");
  if (parts.length === 0) return "Nenhum filtro avançado ativo";
  return `Filtros ativos: ${parts.join("; ")}`;
}
