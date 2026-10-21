export interface LineItem {
  sku: string;
  unitPriceCents: number;
  quantity: number;
}

export interface Totals {
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  totalCents: number;
}

// Promo code → discount off the subtotal, in basis points.
const promoDiscounts = new Map<string, number>([["SAVE10", 1_000]]);

export function promoDiscountBasisPoints(code: string): number | undefined {
  return promoDiscounts.get(code);
}

export function totals(items: LineItem[], taxRateBasisPoints: number, discountBasisPoints = 0): Totals {
  if (!Number.isInteger(taxRateBasisPoints) || taxRateBasisPoints < 0) {
    throw new RangeError("taxRateBasisPoints must be a non-negative integer");
  }
  if (!Number.isInteger(discountBasisPoints) || discountBasisPoints < 0 || discountBasisPoints > 10_000) {
    throw new RangeError("discountBasisPoints must be an integer from 0 to 10000");
  }
  let subtotalCents = 0;
  for (const item of items) {
    if (!Number.isInteger(item.unitPriceCents) || item.unitPriceCents < 0) {
      throw new RangeError(`unitPriceCents must be a non-negative integer (${item.sku})`);
    }
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw new RangeError(`quantity must be a positive integer (${item.sku})`);
    }
    subtotalCents += item.unitPriceCents * item.quantity;
  }
  const discountCents = Math.round((subtotalCents * discountBasisPoints) / 10_000);
  const taxableCents = subtotalCents - discountCents;
  const taxCents = Math.round((taxableCents * taxRateBasisPoints) / 10_000);
  return { subtotalCents, discountCents, taxCents, totalCents: taxableCents + taxCents };
}
