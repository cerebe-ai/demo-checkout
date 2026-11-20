import { describe, expect, it } from "vitest";
import { totals } from "../src/billing.js";

describe("totals", () => {
  it("sums line items and applies tax in basis points", () => {
    const t = totals(
      [{ sku: "mug", unitPriceCents: 1200, quantity: 2 }, { sku: "pen", unitPriceCents: 350, quantity: 1 }],
      825,
      0,
    );
    expect(t.subtotalCents).toBe(2750);
    expect(t.taxCents).toBe(227);
    expect(t.shippingCents).toBe(0);
    expect(t.totalCents).toBe(2977);
  });

  it("adds a flat shipping fee without taxing it", () => {
    const t = totals(
      [{ sku: "mug", unitPriceCents: 1200, quantity: 2 }, { sku: "pen", unitPriceCents: 350, quantity: 1 }],
      825,
      599,
    );
    expect(t.subtotalCents).toBe(2750);
    expect(t.taxCents).toBe(227);
    expect(t.shippingCents).toBe(599);
    expect(t.totalCents).toBe(3576);
  });

  it("rejects a non-positive quantity", () => {
    expect(() => totals([{ sku: "mug", unitPriceCents: 1200, quantity: 0 }], 825, 599)).toThrow(RangeError);
  });

  it("rejects a negative shipping fee", () => {
    expect(() => totals([{ sku: "mug", unitPriceCents: 1200, quantity: 1 }], 825, -1)).toThrow(RangeError);
  });

  it("rejects a fractional shipping fee", () => {
    expect(() => totals([{ sku: "mug", unitPriceCents: 1200, quantity: 1 }], 825, 5.5)).toThrow(RangeError);
  });
});
