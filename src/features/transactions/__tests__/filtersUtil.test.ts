import { describe, it, expect } from "vitest";
import { countActiveFilters, buildFiltersAccessibilityLabel } from "../filtersUtil";
import type { TransactionFilters } from "../../../types/entities";

describe("filtersUtil", () => {
  it("countActiveFilters empty", () => {
    expect(countActiveFilters({})).toBe(0);
  });

  it("countActiveFilters counts distinct groups", () => {
    const f: TransactionFilters = {
      transaction_types: ["income"],
      account_ids: ["a1"],
      amount_min: 10,
      include_transfers: false,
    };
    expect(countActiveFilters(f)).toBe(4);
  });

  it("build accessibility label empty", () => {
    expect(buildFiltersAccessibilityLabel({})).toBe("Nenhum filtro avançado ativo");
  });

  it("build accessibility label complex", () => {
    const f: TransactionFilters = {
      transaction_types: ["expense", "transfer"],
      tags: ["food", "work"],
      tags_mode: "ALL",
      include_transfers: false,
    };
    const label = buildFiltersAccessibilityLabel(f);
    expect(label).toContain("Tipos: despesas, transferências");
    expect(label).toContain("tags (2) modo todas");
    expect(label).toContain("transferências excluídas");
  });
});
