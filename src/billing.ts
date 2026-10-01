export interface LineItem {
  sku: string;
  unitPriceCents: number;
  quantity: number;
}

export interface Totals {
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
}

export function totals(items: LineItem[], taxRateBasisPoints: number): Totals {
  if (!Number.isInteger(taxRateBasisPoints) || taxRateBasisPoints < 0) {
    throw new RangeError("taxRateBasisPoints must be a non-negative integer");
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
  const taxCents = Math.round((subtotalCents * taxRateBasisPoints) / 10_000);
  return { subtotalCents, taxCents, totalCents: subtotalCents + taxCents };
}
