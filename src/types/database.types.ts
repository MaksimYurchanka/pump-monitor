// src/types/database.types.ts

/**
 * Developer wallet data stored in database
 */
export interface DevWalletData {
  id?: string; // UUID assigned by database
  address: string;
  tokens_created: string[];
  last_token_time: string;
  total_tokens: number;
  is_blacklisted: boolean;
  first_seen_at?: string;
  reputation_score?: number;
}

/**
 * Token achievement record stored in database
 */
export interface AchievementRecord {
  id?: string; // UUID assigned by database
  token_address: string;
  multiplier: number;
  achieved_at: string; // ISO date string
  price_at_achievement: number;
  market_cap_at_achievement: number;
}

/**
 * Filter options for querying tokens
 */
export interface TokenQueryOptions {
  limit?: number;
  minAchievements?: number;
  minMarketCap?: number;
  maxMarketCap?: number;
  minAge?: number; // in hours
  maxAge?: number; // in hours
  devWallet?: string;
  excludeBlacklisted?: boolean;
}

/**
 * Database schema definition (using Supabase format)
 */
export interface Database {
  public: {
    Tables: {
      monitored_tokens: {
        Row: {
          id: string;
          address: string;
          pair_address: string;
          symbol: string;
          name: string;
          initial_price: number;
          initial_market_cap: number;
          created_at: string;
          dev_wallet: string;
          achievements: number[];
          last_price: number;
          last_market_cap: number;
          last_updated: string;
        };
        Insert: {
          address: string;
          pair_address: string;
          symbol: string;
          name: string;
          initial_price: number;
          initial_market_cap: number;
          dev_wallet: string;
          achievements?: number[];
          last_price: number;
          last_market_cap: number;
        };
        Update: {
          achievements?: number[];
          last_price?: number;
          last_market_cap?: number;
          last_updated?: string;
        };
      };
      dev_wallets: {
        Row: {
          id: string;
          address: string;
          tokens_created: string[];
          last_token_time: string;
          total_tokens: number;
          is_blacklisted: boolean;
          first_seen_at: string;
          reputation_score: number;
        };
        Insert: {
          address: string;
          tokens_created?: string[];
          is_blacklisted?: boolean;
          first_seen_at?: string;
          reputation_score?: number;
        };
        Update: {
          tokens_created?: string[];
          last_token_time?: string;
          total_tokens?: number;
          is_blacklisted?: boolean;
          reputation_score?: number;
        };
      };
      token_achievements: {
        Row: {
          id: string;
          token_address: string;
          multiplier: number;
          achieved_at: string;
          price_at_achievement: number;
          market_cap_at_achievement: number;
        };
        Insert: {
          token_address: string;
          multiplier: number;
          achieved_at?: string;
          price_at_achievement: number;
          market_cap_at_achievement: number;
        };
      };
    };
  };
}
