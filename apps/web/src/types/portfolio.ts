export interface PortfolioHistoryPoint {
  date: string; // 'YYYY-MM-DD'
  totalValue: number;
  itemCount: number;
}

export interface PortfolioChange {
  abs: number;
  pct: number;
}

export interface PortfolioHistoryData {
  history: PortfolioHistoryPoint[];
  today: { totalValue: number; itemCount: number };
  change: PortfolioChange | null;
}
