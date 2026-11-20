export interface LineItem {
  sku: string;
  unitPriceCents: number;
  quantity: number;
}

export interface Totals {
  subtotalCents: number;
  taxCents: number;
  shippingCents: number;
  totalCents: number;
}

export function totals(items: LineItem[], taxRateBasisPoints: number, shippingCents: number): Totals {
  if (!Number.isInteger(taxRateBasisPoints) || taxRateBasisPoints < 0) {
    throw new RangeError("taxRateBasisPoints must be a non-negative integer");
  }
  if (!Number.isInteger(shippingCents) || shippingCents < 0) {
    throw new RangeError("shippingCents must be a non-negative integer");
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
  // Tax applies to merchandise only. Shipping is a flat fee in whole cents.
  const taxCents = Math.round((subtotalCents * taxRateBasisPoints) / 10_000);
  return { subtotalCents, taxCents, shippingCents, totalCents: subtotalCents + taxCents + shippingCents };
}
