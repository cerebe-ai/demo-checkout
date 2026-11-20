const giftCards = new Map<string, number>([
  ["GIFT10", 1_000],
  ["GIFT25", 2_500],
]);

export function giftCardBalance(code: string): number | undefined {
  return giftCards.get(code);
}
