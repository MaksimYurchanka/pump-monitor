// src/types/token.types.ts

/**
 * Represents a token/pair from DexScreener API
 */
export interface Token {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: {
    address: string;
    name: string;
    symbol: string;
    ownerAddress?: string;
  };
  quoteToken: {
    address: string;
    name: string;
    symbol: string;
  };
  priceUsd: string;
  priceNative?: string;
  liquidity?: {
    usd: number;
    base?: number;
    quote?: number;
  };
  volume?: {
    h24?: number;
    h6?: number;
    h1?: number;
  };
  priceChange?: {
    h24?: number;
    h6?: number;
    h1?: number;
  };
  txns?: {
    h24?: {
      buys: number;
      sells: number;
    };
  };
  marketCap?: number;
  fdv?: number; // Fully Diluted Valuation
  pairCreatedAt: number; // Timestamp in milliseconds
}

/**
 * Simplified token details extracted from API response
 */
export interface TokenDetails {
  address: string;
  name: string;
  symbol: string;
  price: number;
  marketCap: number;
  liquidity: number;
  volume24h: number;
  pairAddress: string;
  createdAt: number;
  url: string;
}

/**
 * Response from DexScreener API endpoints
 */
export interface DexScreenerResponse {
  schemaVersion: string;
  pairs: Token[] | null;
}

/**
 * Token data stored in database
 */
export interface TokenData {
  address: string;
  pair_address: string;
  symbol: string;
  name: string;
  initial_price: number;
  initial_market_cap: number;
  dev_wallet: string;
  achievements: number[];
  last_price: number;
  last_market_cap: number;
  created_at: string;
  last_updated: string;
}

/**
 * Achievement definition for a token
 */
export interface Achievement {
  multiplier: number;
  timestamp: number;
  price: number;
  marketCap: number;
}

/**
 * Achievement multipliers to track
 */
export const ACHIEVEMENT_MULTIPLIERS = [
  1.1, 1.2, 1.3, 1.4, 1.5, 1.75, 2, 2.5, 3, 4, 5, 7.5, 10, 15, 20, 30, 50, 75, 100
];
