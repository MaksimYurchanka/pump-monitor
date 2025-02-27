// src/services/dexscreener.service.ts

import axios, { AxiosError, AxiosResponse } from 'axios';
import { config } from '../config';
import { logger, logError } from '../utils/logger';
import { Token, DexScreenerResponse, TokenDetails } from '../types/token.types';

/**
 * Service for interacting with the DexScreener API
 * Handles rate limiting, error handling, and data validation
 */
export class DexScreenerService {
  private seenPairs = new Set<string>();
  private lastProcessedTimestamp: number;
  private lastRequestTime: number = 0;
  
  /**
   * Creates a new DexScreenerService instance
   * Initializes the timestamp for initial data load
   */
  constructor() {
    // Initialize with timestamp from config hours ago
    const lookbackHours = config.dexscreener.initialLookbackHours || 24;
    this.lastProcessedTimestamp = Date.now() - (lookbackHours * 60 * 60 * 1000);
    logger.info(`DexScreenerService initialized with lookback of ${lookbackHours} hours`);
  }
  
  /**
   * Throttles API requests to respect rate limits
   * @param url - API endpoint URL to request
   * @returns Promise with the API response
   */
  private async throttledRequest<T>(url: string): Promise<AxiosResponse<T>> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    const minDelay = (60 * 1000) / config.dexscreener.rateLimit; // Minimum delay between requests
    
    if (timeSinceLastRequest < minDelay) {
      const delayTime = minDelay - timeSinceLastRequest;
      logger.debug(`Rate limiting: Waiting ${delayTime}ms before next API request`);
      await new Promise(resolve => setTimeout(resolve, delayTime));
    }
    
    this.lastRequestTime = Date.now();
    logger.debug(`API Request: GET ${url}`);
    
    try {
      const response = await axios.get<T>(url);
      logger.debug(`API Response: GET ${url} - Status: ${response.status}`);
      return response;
    } catch (error) {
      this.handleApiError(url, error as Error);
      throw error;
    }
  }
  
  /**
   * Handles and logs API errors
   * @param url - API endpoint URL
   * @param error - Error object
   */
  private handleApiError(url: string, error: Error): void {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      logError(`DexScreener API error for ${url}`, {
        message: axiosError.message,
        status: axiosError.response?.status,
        statusText: axiosError.response?.statusText,
        data: axiosError.response?.data,
      });
    } else {
      logError(`Non-Axios error for ${url}`, error);
    }
  }
  
  /**
   * Validates a token pair data
   * @param pair - Token pair to validate
   * @returns Whether the token pair is valid
   */
  private isValidPair(pair: Token): boolean {
    if (!pair) return false;
    
    // Check required fields
    if (!pair.pairAddress || !pair.baseToken || !pair.quoteToken) {
      logger.debug(`Invalid pair: Missing required fields`, { 
        pairAddress: !!pair.pairAddress,
        baseToken: !!pair.baseToken,
        quoteToken: !!pair.quoteToken
      });
      return false;
    }
    
    // Check base token data
    if (!pair.baseToken.address || !pair.baseToken.symbol) {
      logger.debug(`Invalid pair: Missing base token fields`, { 
        address: !!pair.baseToken.address,
        symbol: !!pair.baseToken.symbol
      });
      return false;
    }
    
    // Check required numeric fields
    if (!pair.pairCreatedAt || isNaN(pair.pairCreatedAt)) {
      logger.debug(`Invalid pair: Invalid creation timestamp`, {
        pairCreatedAt: pair.pairCreatedAt
      });
      return false;
    }
    
    // Validate liquidity exceeds minimum threshold
    const liquidity = pair.liquidity?.usd || 0;
    if (liquidity < config.monitoring.minLiquidityUsd) {
      logger.debug(`Pair below minimum liquidity threshold: $${liquidity} < $${config.monitoring.minLiquidityUsd}`);
      return false;
    }
    
    return true;
  }
  
  /**
   * Fetches initial token pairs from the last N hours
   * @returns Promise with array of valid token pairs
   */
  public async getInitialPairs(): Promise<Token[]> {
    try {
      logger.info('Fetching initial pairs from DexScreener API...');
      const response = await this.throttledRequest<DexScreenerResponse>(
        `${config.dexscreener.apiUrl}/search?q=raydium`
      );
      
      if (!response.data.pairs) {
        logger.warn('Invalid response format from DexScreener API: No pairs property');
        return [];
      }
      
      const allPairs = response.data.pairs;
      logger.debug(`Total pairs received: ${allPairs.length}`);
      
      const lookbackTime = this.lastProcessedTimestamp;
      
      // Filter and validate pairs
      const validPairs = allPairs.filter(pair => {
        if (!this.isValidPair(pair)) {
          return false;
        }
        
        const isRecent = pair.pairCreatedAt >= lookbackTime;
        
        if (isRecent) {
          // Add to seen pairs to avoid duplicate processing
          this.seenPairs.add(pair.pairAddress);
          logger.debug(`Added to seen pairs: ${pair.baseToken.symbol} (${pair.pairAddress})`);
          return true;
        }
        
        return false;
      });
      
      logger.info(`Found ${validPairs.length} valid pairs from last ${config.dexscreener.initialLookbackHours}h`);
      
      return validPairs;
    } catch (error) {
      logError('Failed to fetch initial pairs:', error as Error);
      return [];
    }
  }
  
  /**
   * Checks for new pairs since the last processed timestamp
   * @returns Promise with array of new token pairs
   */
  public async getNewPairs(): Promise<Token[]> {
    try {
      const response = await this.throttledRequest<DexScreenerResponse>(
        `${config.dexscreener.apiUrl}/search?q=raydium`
      );
      
      if (!response.data.pairs) {
        logger.warn('Invalid response format while checking new pairs: No pairs property');
        return [];
      }
      
      // Filter for new pairs
      const newPairs = response.data.pairs.filter(pair => {
        // Skip invalid or already seen pairs
        if (!this.isValidPair(pair) || this.seenPairs.has(pair.pairAddress)) {
          return false;
        }
        
        // Check if pair is newer than our last check
        const isNew = pair.pairCreatedAt > this.lastProcessedTimestamp;
        
        if (isNew) {
          // Add to seen pairs
          this.seenPairs.add(pair.pairAddress);
          logger.debug(`New pair detected: ${pair.baseToken.symbol} (${pair.pairAddress})`);
          return true;
        }
        
        return false;
      });
      
      if (newPairs.length > 0) {
        // Update timestamp to current time to mark our latest check
        this.lastProcessedTimestamp = Date.now();
        logger.info(`Found ${newPairs.length} new pairs`);
        
        // Log details for each new pair
        newPairs.forEach(pair => {
          logger.debug(`New pair details:`, {
            symbol: pair.baseToken.symbol,
            name: pair.baseToken.name,
            address: pair.baseToken.address,
            price: pair.priceUsd,
            liquidity: pair.liquidity?.usd,
            created: new Date(pair.pairCreatedAt).toISOString()
          });
        });
      }
      
      return newPairs;
    } catch (error) {
      logError('Error fetching new pairs:', error as Error);
      return [];
    }
  }
  
  /**
   * Gets detailed information for a specific token
   * @param address - Token address to fetch
   * @param retryCount - Current retry attempt (used internally)
   * @returns Promise with token details or null if not found
   */
  public async getTokenDetails(address: string, retryCount = 0): Promise<TokenDetails | null> {
    try {
      logger.debug(`Fetching token details for: ${address}`);
      
      const response = await this.throttledRequest<DexScreenerResponse>(
        `${config.dexscreener.apiUrl}/tokens/${address}`
      );
      
      const pairs = response.data.pairs;
      
      if (!pairs || pairs.length === 0) {
        logger.debug(`No data found for token: ${address}`);
        return null;
      }
      
      // Find the pair with the highest liquidity
      const mainPair = pairs.reduce((highest, current) => {
        const highestLiq = highest.liquidity?.usd || 0;
        const currentLiq = current.liquidity?.usd || 0;
        return currentLiq > highestLiq ? current : highest;
      });
      
      // Extract and format token details
      const details: TokenDetails = {
        address: mainPair.baseToken.address,
        name: mainPair.baseToken.name,
        symbol: mainPair.baseToken.symbol,
        price: parseFloat(mainPair.priceUsd),
        marketCap: mainPair.marketCap || mainPair.fdv || 0,
        liquidity: mainPair.liquidity?.usd || 0,
        volume24h: mainPair.volume?.h24 || 0,
        pairAddress: mainPair.pairAddress,
        createdAt: mainPair.pairCreatedAt,
        url: mainPair.url
      };
      
      logger.debug(`Token details retrieved for ${details.symbol}`, {
        price: details.price,
        marketCap: details.marketCap,
        liquidity: details.liquidity
      });
      
      return details;
    } catch (error) {
      // Implement retry logic
      if (retryCount < config.dexscreener.maxRetries) {
        logger.warn(`Retrying token details for ${address} (${retryCount + 1}/${config.dexscreener.maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, config.dexscreener.retryDelay));
        return this.getTokenDetails(address, retryCount + 1);
      }
      
      logError(`Failed to get token details for ${address} after ${retryCount} retries:`, error as Error);
      return null;
    }
  }
  
  /**
   * Clears the cache of seen pairs
   */
  public clearCache(): void {
    this.seenPairs.clear();
    logger.info('DexScreener cache cleared');
  }
  
  /**
   * Resets the last processed timestamp to a specific time
   * @param timestamp - Optional timestamp to reset to (defaults to 24h ago)
   */
  public resetLastProcessedTimestamp(timestamp?: number): void {
    if (timestamp) {
      this.lastProcessedTimestamp = timestamp;
    } else {
      const lookbackHours = config.dexscreener.initialLookbackHours || 24;
      this.lastProcessedTimestamp = Date.now() - (lookbackHours * 60 * 60 * 1000);
    }
    
    logger.info(`Reset lastProcessedTimestamp to ${new Date(this.lastProcessedTimestamp).toISOString()}`);
  }
}
