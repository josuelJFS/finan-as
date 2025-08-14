import { countActiveFilters } from "../filtersUtil";
import type { TransactionFilters } from "../../../types/entities";
// Importações explícitas porque não habilitamos globals no vitest.config
import { describe, it, expect } from "vitest";

describe("filtersUtil extra", () => {
  it("countActiveFilters include_transfers false conta +1", () => {
    const f: TransactionFilters = { include_transfers: false } as any;
    expect(countActiveFilters(f)).toBe(1);
  });
});
