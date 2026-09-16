import type { Wear, Skin } from './skin';

export interface ListingParty {
  _id: string;
  username: string;
}

export interface Listing {
  _id: string;
  seller: ListingParty;
  skin: Skin;
  skinId: string;
  weapon: string;
  rarity: string;
  title: string;
  price: number;
  currency: string;
  steamTradeUrl: string;
  status: 'pending_deposit' | 'active' | 'sold' | 'cancelled';
  buyer?: ListingParty;
  soldAt?: string;
  wear?: Wear;
  floatValue?: number;
  isStatTrak: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ListingSort = 'newest' | 'oldest' | 'price-asc' | 'price-desc';

export interface ListingsQuery {
  page?: number;
  limit?: number;
  sort?: ListingSort;
  weapon?: string;
  rarity?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  wear?: Wear;
  statTrak?: boolean;
  minFloat?: number;
  maxFloat?: number;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}
