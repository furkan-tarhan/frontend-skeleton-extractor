import type { BadgeTone } from '@/components/ui/Badge';

// Backend rarity strings (Skin/Listing.rarity) — see design/DESIGN_SYSTEM.md
// for why these map onto CS2's real rarity color ramp instead of the brand
// palette. 'Contraband' is CS2's top tier (gold knives/gloves).
const RARITY_TONE: Record<string, BadgeTone> = {
  Consumer: 'rarity-consumer',
  Industrial: 'rarity-industrial',
  'Mil-Spec': 'rarity-milspec',
  Restricted: 'rarity-restricted',
  Classified: 'rarity-classified',
  Covert: 'rarity-covert',
  Contraband: 'rarity-gold',
};

export function rarityTone(rarity: string): BadgeTone {
  return RARITY_TONE[rarity] ?? 'neutral';
}

export const RARITY_OPTIONS = Object.keys(RARITY_TONE);

export function formatPrice(price: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(price);
}
