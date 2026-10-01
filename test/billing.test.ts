import { describe, expect, it } from "vitest";
import { totals } from "../src/billing.js";

describe("totals", () => {
  it("sums line items and applies tax in basis points", () => {
    const t = totals([{ sku: "mug", unitPriceCents: 1200, quantity: 2 }, { sku: "pen", unitPriceCents: 350, quantity: 1 }], 825);
    expect(t.subtotalCents).toBe(2750);
    expect(t.taxCents).toBe(227);
    expect(t.totalCents).toBe(2977);
  });

  it("rejects a non-positive quantity", () => {
    expect(() => totals([{ sku: "mug", unitPriceCents: 1200, quantity: 0 }], 825)).toThrow(RangeError);
  });
});
