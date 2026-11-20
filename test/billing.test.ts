import { describe, expect, it } from "vitest";
import { checkoutQuote, totals } from "../src/billing.js";

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

describe("checkoutQuote", () => {
  it("redeems a gift card after tax and caps it at the order total", () => {
    const q = checkoutQuote([{ sku: "mug", unitPriceCents: 1200, quantity: 1 }], 825, 1000);
    expect(q.subtotalCents).toBe(1200);
    expect(q.taxCents).toBe(99);
    expect(q.totalCents).toBe(1299);
    expect(q.giftCardCents).toBe(1000);
    expect(q.amountDueCents).toBe(299);

    const capped = checkoutQuote([{ sku: "mug", unitPriceCents: 1200, quantity: 1 }], 825, 2500);
    expect(capped.giftCardCents).toBe(1299);
    expect(capped.amountDueCents).toBe(0);
  });

  it("applies a balance that includes leftover cents", () => {
    const q = checkoutQuote([{ sku: "mug", unitPriceCents: 3000, quantity: 1 }], 0, 1999);
    expect(q.totalCents).toBe(3000);
    expect(q.giftCardCents).toBe(1998);
    expect(q.amountDueCents).toBe(1002);
  });
});
