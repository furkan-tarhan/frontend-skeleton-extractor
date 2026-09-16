import { getToken } from './token';
import type { UserWithStats } from '@/types/user';
import type { Listing, ListingsQuery, Pagination } from '@/types/listing';
import type { Skin, SkinCategory } from '@/types/skin';
import type { PortfolioHistoryData } from '@/types/portfolio';
import type { Transaction, WalletSummary, PayoutNetwork } from '@/types/wallet';
import type { MyTradesData } from '@/types/trade';

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

interface ApiFetchOptions extends RequestInit {
  /** Attach the Bearer token if one is stored. Default true. */
  auth?: boolean;
}

// The backend's response envelope is inconsistent (some routes return
// { success, data }, others bare { message } / { message, ...fields }) — see
// design/DESIGN_SYSTEM.md-adjacent notes. We don't assume a shape here:
// callers type the resolved JSON themselves, this just handles transport +
// error normalization (any non-2xx becomes an ApiError with the best
// available message field).
export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { auth = true, headers, ...rest } = options;
  const token = auth ? getToken() : null;

  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const body = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    const message =
      (body && (body.message || body.error)) || `İstek başarısız oldu (${res.status})`;
    throw new ApiError(message, res.status);
  }

  return body as T;
}

// ---- Auth ---------------------------------------------------------------

export function registerUser(input: { username: string; email: string; password: string }) {
  return apiFetch<{ message: string }>('/api/users', {
    method: 'POST',
    body: JSON.stringify(input),
    auth: false,
  });
}

export function loginUser(input: { email: string; password: string }) {
  return apiFetch<{ message: string; token: string }>('/api/users/login', {
    method: 'POST',
    body: JSON.stringify(input),
    auth: false,
  });
}

export function fetchMe() {
  return apiFetch<{ success: true; data: UserWithStats }>('/api/users/me');
}

export function steamLoginUrl(): string {
  return `${API_URL}/api/auth/steam`;
}

// Zaten giriş yapmış (email/şifre) bir kullanıcının hesabına Steam bağlaması için:
// session'a linkUserId işaretler, ardından açılan Steam popup'ı yeni hesap yerine bu hesaba bağlanır.
export function linkSteamAccount() {
  // credentials: 'include' gerekli — backend bu isteğin session cookie'sine linkUserId yazıyor,
  // ardından açılan Steam popup'ı aynı session'ı okuyup mevcut hesaba bağlıyor.
  return apiFetch<{ message: string }>('/api/users/steam-link-init', {
    method: 'POST',
    credentials: 'include',
  });
}

export function fetchPortfolioHistory() {
  return apiFetch<{ success: true; data: PortfolioHistoryData }>('/api/portfolio/history');
}

// ---- Listings -------------------------------------------------------------

export interface ListingsResult {
  success: true;
  data: Listing[];
  pagination: Pagination;
}

function buildQueryString<T extends object>(query: T): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function fetchListings(query: ListingsQuery): Promise<ListingsResult> {
  return apiFetch<ListingsResult>(`/api/listings${buildQueryString(query)}`, { auth: false });
}

export function fetchListing(id: string) {
  return apiFetch<{ success: true; data: Listing }>(`/api/listings/${id}`, { auth: false });
}

// ---- Skins ----------------------------------------------------------------

export function fetchPopularSkins() {
  return apiFetch<{ success: true; data: Skin[] }>('/api/skins/popular', { auth: false });
}

export function fetchSkinCategories() {
  return apiFetch<{ success: true; data: SkinCategory[] }>('/api/skins/categories', { auth: false });
}

// ---- Wallet -----------------------------------------------------------------

export function fetchWallet() {
  return apiFetch<{ success: true; data: WalletSummary }>('/api/wallet');
}

export function fetchTransactions(page: number, limit: number) {
  return apiFetch<{ success: true; data: Transaction[]; pagination: Pagination }>(
    `/api/wallet/transactions${buildQueryString({ page, limit })}`
  );
}

export function depositFunds(amount: number) {
  return apiFetch<{ success: true; data: { paymentPageUrl: string } }>('/api/wallet/deposit', {
    method: 'POST',
    body: JSON.stringify({ amount }),
  });
}

export function withdrawFunds(input: { amount: number; walletAddress: string; network: PayoutNetwork }) {
  return apiFetch<{ success: true; message: string; data: { balance: number; transaction: Transaction } }>(
    '/api/wallet/withdraw',
    { method: 'POST', body: JSON.stringify(input) }
  );
}

export function confirmDelivery(transactionId: string) {
  return apiFetch<{ success: true; message: string }>(`/api/wallet/transactions/${transactionId}/confirm-delivery`, {
    method: 'POST',
  });
}

// ---- Purchase -----------------------------------------------------------------

export function fetchMyTrades() {
  return apiFetch<{ success: true; data: MyTradesData }>('/api/listings/my/trades');
}

export function buyListing(id: string, steamTradeUrl?: string) {
  return apiFetch<{
    success: true;
    message: string;
    data: { listing: Listing; balance: number };
    deliveryTradeOfferUrl?: string;
  }>(`/api/listings/${id}/buy`, {
    method: 'POST',
    body: JSON.stringify(steamTradeUrl ? { steamTradeUrl } : {}),
  });
}
