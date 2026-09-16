export type DepositStatus = 'pending' | 'accepted' | 'declined' | 'canceled' | 'expired';
export type DeliveryStatus = 'pending' | 'accepted' | 'declined' | 'canceled' | 'expired' | 'escrow';

export interface DepositTradeItem {
  listingId: string;
  title: string;
  depositStatus: DepositStatus;
  tradeOfferUrl?: string;
}

export interface DeliveryTradeItem {
  transactionId: string;
  listingTitle: string;
  deliveryStatus: DeliveryStatus;
  tradeOfferUrl?: string;
  amount: number;
  createdAt: string;
}

export interface MyTradesData {
  deposits: DepositTradeItem[];
  deliveries: DeliveryTradeItem[];
}
