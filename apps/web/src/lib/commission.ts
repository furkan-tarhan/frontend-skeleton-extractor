// Backend'deki config.commission.rate (LoopSkins backend, src/config.ts) ile aynı değer — bu
// sadece görüntüleme amaçlı, hassas bir veri olmadığı ve nadiren değiştiği için ayrı bir uçtan
// çekmek yerine burada da sabit tutuluyor.
export const COMMISSION_RATE = 0.02;

export function commissionBreakdown(price: number) {
  const commission = Math.round(price * COMMISSION_RATE * 100) / 100;
  const sellerNet = Math.round((price - commission) * 100) / 100;
  return { price, commission, sellerNet };
}
