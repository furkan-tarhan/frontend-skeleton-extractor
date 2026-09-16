export type TransactionType = 'deposit' | 'withdrawal' | 'purchase' | 'sale';
export type TransactionStatus = 'pending' | 'completed' | 'failed';

export interface Transaction {
  _id: string;
  type: TransactionType;
  amount: number;
  balanceAfter?: number;
  status: TransactionStatus;
  listing?: { _id: string; title: string; price: number } | string;
  description?: string;
  payoutAddress?: string;
  payoutNetwork?: string;
  createdAt: string;
}

export interface WalletSummary {
  balance: number;
  currency: string;
  recentTransactions: Transaction[];
}

export const PAYOUT_NETWORKS = ['USDT_TRC20', 'USDT_BEP20', 'USDT_ERC20', 'BTC', 'ETH', 'TON'] as const;
export type PayoutNetwork = (typeof PAYOUT_NETWORKS)[number];
