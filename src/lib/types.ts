// Shared domain types used across the API layer and UI.

export interface OutcomeToken {
  index: number;
  label: string; // "Yes" / "No" / candidate name
  tokenId: string; // CLOB ERC-1155 token id
  price: number; // last aggregate price 0..1 from Gamma
}

export interface MarketSummary {
  id: string; // Gamma market id
  conditionId: string;
  question: string;
  shortLabel: string; // groupItemTitle when present (e.g. candidate name), else question
  slug: string;
  icon: string | null;
  description: string; // resolution rules / market context
  active: boolean;
  closed: boolean;
  endDate: string | null;
  volume: number;
  liquidity: number;
  oneDayPriceChange: number; // signed price delta over 24h (0..1 scale)
  outcomes: OutcomeToken[];
}

export interface EventSummary {
  id: string;
  title: string;
  slug: string;
  icon: string | null;
  description: string;
  category: string | null; // primary tag label
  categorySlug: string | null; // primary tag slug
  active: boolean;
  closed: boolean;
  endDate: string | null;
  volume: number;
  liquidity: number;
  markets: MarketSummary[];
}

export interface OrderBookLevel {
  price: number;
  size: number;
}

export interface OrderBook {
  tokenId: string;
  bids: OrderBookLevel[]; // sorted best (highest) first
  asks: OrderBookLevel[]; // sorted best (lowest) first
  bestBid: number | null;
  bestAsk: number | null;
  midpoint: number | null;
}

export interface PricePoint {
  t: number; // unix seconds
  p: number; // price 0..1
}

export interface PublicUser {
  id: string;
  email: string;
  username: string;
  cashBalance: number;
}
