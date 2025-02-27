// src/services/supabase.service.ts

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config';
import { logger, logError } from '../utils/logger';
import { 
  Token, 
  TokenData, 
  DevWalletData, 
  AchievementRecord,
  TokenQueryOptions, 
  Database 
} from '../types';

/**
 * Service for interacting with Supabase database
 * Handles data persistence, retrieval, and maintenance
 */
export class SupabaseService {
  private supabase: SupabaseClient<Database>;
  
  /**
   * Creates a new SupabaseService instance
   */
  constructor() {
    this.supabase = createClient<Database>(
      config.supabase.url,
      config.supabase.key,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      }
    );
    
    logger.info('SupabaseService initialized');
  }
  
  /**
   * Validates connection to Supabase
   * @throws Error if connection fails
   */
  public async validateConnection(): Promise<void> {
    try {
      const { count, error } = await this.supabase
        .from('monitored_tokens')
        .select('*', { count: 'exact', head: true });
        
      if (error) throw error;
      
      logger.info(`Successfully connected to Supabase (${count} monitored tokens)`);
    } catch (error) {
      logError('Failed to connect to Supabase:', error as Error);
      throw new Error('Supabase connection failed: ' + (error as Error).message);
    }
  }
  
  /**
   * Converts a token pair to database format
   * @param token - Token pair from DexScreener
   * @returns Formatted token data for database
   */
  private convertToTokenData(token: Token): TokenData {
    return {
      address: token.baseToken.address,
      pair_address: token.pairAddress,
      symbol: token.baseToken.symbol,
      name: token.baseToken.name || token.baseToken.symbol,
      initial_price: parseFloat(token.priceUsd),
      initial_market_cap: token.marketCap || token.fdv || 0,
      dev_wallet: token.baseToken.ownerAddress || 'unknown',
      achievements: [],
      last_price: parseFloat(token.priceUsd),
      last_market_cap: token.marketCap || token.fdv || 0,
      created_at: new Date(token.pairCreatedAt).toISOString(),
      last_updated: new Date().toISOString()
    };
  }
  
  /**
   * Inserts a batch of tokens into the database
   * @param tokens - Array of token pairs to insert
   */
  public async bulkInsertTokens(tokens: Token[]): Promise<void> {
    if (tokens.length === 0) {
      logger.debug('No tokens to insert');
      return;
    }
    
    const batchSize = config.monitoring.batchSize || 50;
    const batches = [];
    
    // Convert and prepare batches
    for (let i = 0; i < tokens.length; i += batchSize) {
      const batch = tokens.slice(i, i + batchSize).map(this.convertToTokenData);
      batches.push(batch);
    }
    
    logger.info(`Processing ${tokens.length} tokens in ${batches.length} batches`);
    
    // Process each batch
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      try {
        const { error } = await this.supabase
          .from('monitored_tokens')
          .upsert(batch, { 
            onConflict: 'address',
            ignoreDuplicates: true 
          });
          
        if (error) {
          logError(`Error inserting batch ${i + 1}:`, error);
          throw error;
        }
        
        logger.debug(`Successfully processed batch ${i + 1} of ${batches.length}`);
      } catch (error) {
        logError(`Failed to process batch ${i + 1}:`, error as Error);
        throw error;
      }
    }
    
    logger.info(`Successfully stored ${tokens.length} tokens in database`);
  }
  
  /**
   * Inserts a single token into the database
   * @param token - Token pair to insert
   * @returns The inserted token data
   */
  public async insertToken(token: Token): Promise<TokenData> {
    try {
      const tokenData = this.convertToTokenData(token);
      
      const { data, error } = await this.supabase
        .from('monitored_tokens')
        .upsert(tokenData, { 
          onConflict: 'address',
          ignoreDuplicates: false 
        })
        .select()
        .single();
        
      if (error) {
        logError('Error inserting token:', error);
        throw error;
      }
      
      logger.debug(`Successfully stored token: ${token.baseToken.symbol}`);
      return data as TokenData;
    } catch (error) {
      logError(`Failed to store token ${token.baseToken.symbol}:`, error as Error);
      throw error;
    }
  }
  
  /**
   * Gets a token by its address
   * @param address - Token address
   * @returns Token data or null if not found
   */
  public async getToken(address: string): Promise<TokenData | null> {
    try {
      const { data, error } = await this.supabase
        .from('monitored_tokens')
        .select('*')
        .eq('address', address)
        .single();
        
      if (error) {
        if (error.code === 'PGRST116') { // No rows returned
          return null;
        }
        throw error;
      }
      
      return data as TokenData;
    } catch (error) {
      logError(`Error fetching token ${address}:`, error as Error);
      return null;
    }
  }
  
  /**
   * Updates token achievements and price data
   * @param address - Token address
   * @param achievements - Updated achievements array
   * @param lastPrice - Current price
   * @param lastMarketCap - Current market cap
   */
  public async updateTokenAchievements(
    address: string,
    achievements: number[],
    lastPrice: number,
    lastMarketCap: number
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('monitored_tokens')
        .update({
          achievements,
          last_price: lastPrice,
          last_market_cap: lastMarketCap,
          last_updated: new Date().toISOString()
        })
        .eq('address', address);
        
      if (error) {
        logError(`Error updating achievements for ${address}:`, error);
        throw error;
      }
      
      logger.debug(`Updated achievements for ${address}: [${achievements.join(', ')}]`);
    } catch (error) {
      logError(`Failed to update achievements for ${address}:`, error as Error);
      throw error;
    }
  }
  
  /**
   * Records a specific achievement milestone
   * @param achievement - Achievement record to store
   */
  public async recordAchievement(achievement: AchievementRecord): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('token_achievements')
        .insert({
          ...achievement,
          achieved_at: achievement.achieved_at || new Date().toISOString()
        });
        
      if (error) {
        logError(`Error recording achievement:`, error);
        throw error;
      }
      
      logger.debug(`Recorded ${achievement.multiplier}x achievement for ${achievement.token_address}`);
    } catch (error) {
      logError(`Failed to record achievement:`, error as Error);
      throw error;
    }
  }
  
  /**
   * Gets tokens that need achievement checking
   * @param options - Query options
   * @returns Array of tokens to check
   */
  public async getTokensForAchievementCheck(options: TokenQueryOptions = {}): Promise<TokenData[]> {
    try {
      // Calculate time thresholds
      const now = new Date();
      let query = this.supabase
        .from('monitored_tokens')
        .select('*');
      
      // Apply filters
      if (options.minMarketCap) {
        query = query.gte('initial_market_cap', options.minMarketCap);
      }
      
      if (options.maxMarketCap) {
        query = query.lte('initial_market_cap', options.maxMarketCap);
      }
      
      if (options.minAge) {
        const minAgeDate = new Date(now.getTime() - options.minAge * 60 * 60 * 1000);
        query = query.lte('created_at', minAgeDate.toISOString());
      }
      
      if (options.maxAge) {
        const maxAgeDate = new Date(now.getTime() - options.maxAge * 60 * 60 * 1000);
        query = query.gte('created_at', maxAgeDate.toISOString());
      }
      
      if (options.devWallet) {
        query = query.eq('dev_wallet', options.devWallet);
      }
      
      // Apply limit
      if (options.limit) {
        query = query.limit(options.limit);
      }
      
      // Execute query
      const { data, error } = await query.order('created_at', { ascending: false });
        
      if (error) {
        throw error;
      }
      
      return data as TokenData[];
    } catch (error) {
      logError('Failed to fetch tokens for achievement check:', error as Error);
      return [];
    }
  }
  
  /**
   * Gets or creates a developer wallet record
   * @param address - Wallet address
   * @returns Developer wallet data
   */
  public async getOrCreateDevWallet(address: string): Promise<DevWalletData> {
    try {
      // First try to get existing wallet
      const { data, error } = await this.supabase
        .from('dev_wallets')
        .select('*')
        .eq('address', address)
        .single();
        
      if (!error && data) {
        return data as DevWalletData;
      }
      
      // If not found or error, create new wallet
      if (error && error.code !== 'PGRST116') { // Not just "not found"
        throw error;
      }
      
      // Create new wallet record
      const newWallet: DevWalletData = {
        address,
        tokens_created: [],
        last_token_time: new Date().toISOString(),
        total_tokens: 0,
        is_blacklisted: false,
        first_seen_at: new Date().toISOString(),
        reputation_score: 50 // Neutral starting score
      };
      
      const { data: insertedData, error: insertError } = await this.supabase
        .from('dev_wallets')
        .insert(newWallet)
        .select()
        .single();
        
      if (insertError) {
        throw insertError;
      }
      
      logger.info(`Created new developer wallet record: ${address}`);
      return insertedData as DevWalletData;
    } catch (error) {
      logError(`Failed to get/create developer wallet ${address}:`, error as Error);
      // Return basic wallet data even on error
      return {
        address,
        tokens_created: [],
        last_token_time: new Date().toISOString(),
        total_tokens: 0,
        is_blacklisted: false
      };
    }
  }
  
  /**
   * Updates a developer wallet record
   * @param wallet - Updated wallet data
   */
  public async updateDevWallet(wallet: DevWalletData): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('dev_wallets')
        .update({
          tokens_created: wallet.tokens_created,
          last_token_time: wallet.last_token_time,
          total_tokens: wallet.total_tokens,
          is_blacklisted: wallet.is_blacklisted,
          reputation_score: wallet.reputation_score
        })
        .eq('address', wallet.address);
        
      if (error) {
        throw error;
      }
      
      logger.debug(`Updated developer wallet: ${wallet.address} (${wallet.tokens_created.length} tokens)`);
    } catch (error) {
      logError(`Failed to update developer wallet ${wallet.address}:`, error as Error);
      throw error;
    }
  }
  
  /**
   * Adds a token to a developer wallet's created tokens
   * @param walletAddress - Developer wallet address
   * @param tokenAddress - Token address to add
   * @returns Updated wallet data
   */
  public async addTokenToDevWallet(walletAddress: string, tokenAddress: string): Promise<DevWalletData> {
    try {
      // Get current wallet data
      const wallet = await this.getOrCreateDevWallet(walletAddress);
      
      // Check if token is already tracked
      if (wallet.tokens_created.includes(tokenAddress)) {
        return wallet;
      }
      
      // Add token to wallet
      wallet.tokens_created.push(tokenAddress);
      wallet.total_tokens = wallet.tokens_created.length;
      wallet.last_token_time = new Date().toISOString();
      
      // Update wallet in database
      await this.updateDevWallet(wallet);
      
      // Calculate and update reputation score based on tokens count
      if (wallet.tokens_created.length > 10) {
        wallet.reputation_score = Math.max(0, 50 - (wallet.tokens_created.length - 10) * 5);
      }
      
      return wallet;
    } catch (error) {
      logError(`Failed to add token ${tokenAddress} to wallet ${walletAddress}:`, error as Error);
      throw error;
    }
  }
  
  /**
   * Gets developer wallets with the most tokens created
   * @param limit - Maximum number of wallets to return
   * @returns Array of developer wallets
   */
  public async getTopDevWallets(limit: number = 10): Promise<DevWalletData[]> {
    try {
      const { data, error } = await this.supabase
        .from('dev_wallets')
        .select('*')
        .order('total_tokens', { ascending: false })
        .limit(limit);
        
      if (error) {
        throw error;
      }
      
      return data as DevWalletData[];
    } catch (error) {
      logError('Failed to fetch top developer wallets:', error as Error);
      return [];
    }
  }
  
  /**
   * Gets blacklisted developer wallets
   * @returns Array of blacklisted wallets
   */
  public async getBlacklistedWallets(): Promise<DevWalletData[]> {
    try {
      const { data, error } = await this.supabase
        .from('dev_wallets')
        .select('*')
        .eq('is_blacklisted', true);
        
      if (error) {
        throw error;
      }
      
      return data as DevWalletData[];
    } catch (error) {
      logError('Failed to fetch blacklisted wallets:', error as Error);
      return [];
    }
  }
  
  /**
   * Cleans up old data from the database
   * @param daysToKeep - Number of days of data to keep
   */
  public async cleanup(daysToKeep: number = 30): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      
      // Remove old tokens without achievements
      const { error } = await this.supabase
        .from('monitored_tokens')
        .delete()
        .lt('created_at', cutoffDate.toISOString())
        .eq('achievements', '{}');
        
      if (error) {
        throw error;
      }
      
      logger.info(`Successfully cleaned up tokens older than ${daysToKeep} days`);
    } catch (error) {
      logError('Failed to cleanup old tokens:', error as Error);
      throw error;
    }
  }
}
