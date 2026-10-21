import { describe, expect, it } from "vitest";
import { promoDiscountBasisPoints, totals } from "../src/billing.js";

describe("totals", () => {
  it("sums line items and applies tax in basis points", () => {
    const t = totals([{ sku: "mug", unitPriceCents: 1200, quantity: 2 }, { sku: "pen", unitPriceCents: 350, quantity: 1 }], 825);
    expect(t.subtotalCents).toBe(2750);
    expect(t.discountCents).toBe(0);
    expect(t.taxCents).toBe(227);
    expect(t.totalCents).toBe(2977);
  });

  it("takes the discount off the subtotal before tax", () => {
    const t = totals([{ sku: "mug", unitPriceCents: 1200, quantity: 2 }, { sku: "pen", unitPriceCents: 350, quantity: 1 }], 825, 1000);
    expect(t.subtotalCents).toBe(2750);
    expect(t.discountCents).toBe(275);
    expect(t.taxCents).toBe(204);
    expect(t.totalCents).toBe(2679);
  });

  it("rounds the discount to whole cents", () => {
    const t = totals([{ sku: "mug", unitPriceCents: 1299, quantity: 1 }], 825, 1000);
    expect(t.discountCents).toBe(130);
    expect(t.taxCents).toBe(96);
    expect(t.totalCents).toBe(1265);
  });

  it("rejects a discount outside 0 to 10000 basis points", () => {
    const items = [{ sku: "mug", unitPriceCents: 1200, quantity: 1 }];
    expect(() => totals(items, 825, -1)).toThrow(RangeError);
    expect(() => totals(items, 825, 10_001)).toThrow(RangeError);
    expect(() => totals(items, 825, 12.5)).toThrow(RangeError);
  });

  it("rejects a non-positive quantity", () => {
    expect(() => totals([{ sku: "mug", unitPriceCents: 1200, quantity: 0 }], 825)).toThrow(RangeError);
  });
});

describe("promoDiscountBasisPoints", () => {
  it("knows SAVE10 as 10% off", () => {
    expect(promoDiscountBasisPoints("SAVE10")).toBe(1000);
  });

  it("does not know other codes, including object prototype keys", () => {
    for (const code of ["BOGUS", "save10", "", "toString", "__proto__", "constructor"]) {
      expect(promoDiscountBasisPoints(code)).toBeUndefined();
    }
  });
});
