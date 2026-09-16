export type Wear = 'Factory New' | 'Minimal Wear' | 'Field-Tested' | 'Well-Worn' | 'Battle-Scarred';

export interface Skin {
  skinId: string;
  name: string;
  weapon: string;
  category: string;
  rarity: string;
  price: { min: number; max: number; currency: string };
  image: string;
  market_hash_name?: string;
  wear?: number;
  description?: string;
  collection?: string;
}

export interface SkinCategory {
  id: string;
  name: string;
  slug: string;
  count: number;
}
