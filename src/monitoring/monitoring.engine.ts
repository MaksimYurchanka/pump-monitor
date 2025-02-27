// src/monitoring/monitoring.engine.ts

import { DexScreenerService } from '../services/dexscreener.service';
import { TelegramService } from '../services/telegram.service';
import { SupabaseService } from '../services/supabase.service';
import { config } from '../config';
import { logger, logError } from '../utils/logger';
import { 
  Token, 
  TokenData, 
  TokenDetails, 
  TokenQueryOptions,
  DevWalletData,
  ACHIEVEMENT_MULTIPLIERS
} from '../types';

/**
 * Main monitoring engine that orchestrates the services
 * and implements the monitoring logic
 */
export class MonitoringEngine {
  // State indicators
  private isRunning: boolean = false;
  private isInitialized: boolean = false;
  
  // Interval references
  private tokenScanInterval: NodeJS.Timeout | null = null;
  private achievementCheckInterval: NodeJS.Timeout | null = null;
  private devWalletCheckInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  
  // Stats tracking
  private stats = {
    startTime: new Date(),
    tokensDetected: 0,
    achievementsUnlocked: 0,
    devWalletsAnalyzed: 0,
    errors: 0
  };
  
  /**
   * Creates a new MonitoringEngine instance
   * @param dexScreenerService - Service for DexScreener API interaction
   * @param telegramService - Service for Telegram notifications
   * @param supabaseService - Service for database operations
   */
  constructor(
    private dexScreenerService: DexScreenerService,
    private telegramService: TelegramService,
    private supabaseService: SupabaseService
  ) {}
  
  /**
   * Initializes the monitoring engine and all services
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn('MonitoringEngine is already initialized');
      return;
    }
    
    logger.info('Initializing MonitoringEngine...');
    
    try {
      // Initialize services
      await this.telegramService.initialize();
      await this.supabaseService.validateConnection();
      
      this.isInitialized = true;
      logger.info('MonitoringEngine initialized successfully');
    } catch (error) {
      logError('Failed to initialize MonitoringEngine:', error as Error);
      throw new Error('MonitoringEngine initialization failed');
    }
  }
  
  /**
   * Starts the monitoring process
   */
  public async start(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    if (this.isRunning) {
      logger.warn('MonitoringEngine is already running');
      return;
    }
    
    this.isRunning = true;
    logger.info('Starting token monitoring...');
    
    try {
      // Load initial data
      await this.loadInitialData();
      
      // Start monitoring intervals
      this.startMonitoringIntervals();
      
      logger.info(`Monitoring started successfully, checking for new tokens every ${config.monitoring.scanInterval}ms`);
    } catch (error) {
      this.isRunning = false;
      logError('Failed to start monitoring:', error as Error);
      throw new Error('Failed to start monitoring: ' + (error as Error).message);
    }
  }
  
  /**
   * Starts all monitoring intervals
   */
  private startMonitoringIntervals(): void {
    // Clear any existing intervals
    this.stopMonitoringIntervals();
    
    // Set up new token scanning interval
    this.tokenScanInterval = setInterval(
      () => this.scanForNewTokens().catch(this.handleIntervalError('token scan')),
      config.monitoring.scanInterval
    );
    
    // Set up achievement checking interval
    this.achievementCheckInterval = setInterval(
      () => this.checkTokenAchievements().catch(this.handleIntervalError('achievement check')),
      config.monitoring.achievementCheckInterval
    );
    
    // Set up developer wallet analysis interval
    this.devWalletCheckInterval = setInterval(
      () => this.analyzeDevWallets().catch(this.handleIntervalError('dev wallet check')),
      config.monitoring.devWalletCheckInterval
    );
    
    // Set up cleanup interval
    this.cleanupInterval = setInterval(
      () => this.performCleanup().catch(this.handleIntervalError('cleanup')),
      config.monitoring.cleanupInterval
    );
  }
  
  /**
   * Creates an error handler for interval tasks
   * @param taskName - Name of the task for logging
   * @returns Error handler function
   */
  private handleIntervalError(taskName: string): (error: Error) => void {
    return (error: Error) => {
      this.stats.errors++;
      logError(`Error in ${taskName} interval:`, error);
    };
  }
  
  /**
   * Loads initial token data from the last 24 hours
   */
  private async loadInitialData(): Promise<void> {
    logger.info('Loading initial token data...');
    
    try {
      const initialTokens = await this.dexScreenerService.getInitialPairs();
      
      if (initialTokens.length > 0) {
        logger.info(`Found ${initialTokens.length} tokens in initial scan, storing in database...`);
        
        // Store tokens in database
        await this.supabaseService.bulkInsertTokens(initialTokens);
        
        // Send summary notification
        await this.telegramService.sendTokensSummary(initialTokens);
        
        this.stats.tokensDetected += initialTokens.length;
        logger.info('Initial data load complete');
      } else {
        logger.info('No tokens found in initial scan');
        await this.telegramService.sendMessage(
          config.telegram.chatId, 
          '📊 Initial scan complete - No tokens found in the last 24 hours'
        );
      }
    } catch (error) {
      logError('Error during initial data load:', error as Error);
      throw error;
    }
  }
  
  /**
   * Scans for new token listings
   */
  private async scanForNewTokens(): Promise<void> {
    if (!this.isRunning) return;
    
    try {
      const newTokens = await this.dexScreenerService.getNewPairs();
      
      if (newTokens.length > 0) {
        logger.info(`Found ${newTokens.length} new tokens, processing...`);
        
        // Process each new token
        for (const token of newTokens) {
          try {
            // Store token in database
            const storedToken = await this.supabaseService.insertToken(token);
            
            // Send notification
            await this.telegramService.sendNewTokenAlert(token);
            
            // Process developer wallet if available
            if (token.baseToken.ownerAddress) {
              await this.processDevWallet(token.baseToken.ownerAddress, token.baseToken.address);
            }
            
            this.stats.tokensDetected++;
            logger.info(`Successfully processed new token: ${token.baseToken.symbol}`);
          } catch (error) {
            logError(`Error processing token ${token.baseToken.symbol}:`, error as Error);
          }
        }
      }
    } catch (error) {
      logError('Error scanning for new tokens:', error as Error);
      throw error;
    }
  }
  
  /**
   * Processes a developer wallet for a new token
   * @param walletAddress - Developer wallet address
   * @param tokenAddress - Token address
   */
  private async processDevWallet(walletAddress: string, tokenAddress: string): Promise<void> {
    try {
      // Add token to developer wallet
      const wallet = await this.supabaseService.addTokenToDevWallet(walletAddress, tokenAddress);
      
      // Check if developer has created multiple tokens
      if (wallet.tokens_created.length > 3) {
        // Get details of the latest token
        const tokenDetails = await this.dexScreenerService.getTokenDetails(tokenAddress);
        
        if (tokenDetails) {
          // Send alert about developer wallet activity
          await this.telegramService.sendDevWalletAlert(
            walletAddress,
            wallet.tokens_created.length,
            tokenDetails
          );
        }
      }
      
      this.stats.devWalletsAnalyzed++;
    } catch (error) {
      logError(`Error processing developer wallet ${walletAddress}:`, error as Error);
    }
  }
  
  /**
   * Checks tokens for achievement milestones
   */
  private async checkTokenAchievements(): Promise<void> {
    if (!this.isRunning) return;
    
    try {
      // Get tokens to check
      const tokens = await this.supabaseService.getTokensForAchievementCheck({
        maxAge: 168, // 7 days
        limit: 100
      });
      
      if (tokens.length === 0) {
        return;
      }
      
      logger.debug(`Checking achievements for ${tokens.length} tokens`);
      
      for (const token of tokens) {
        try {
          // Skip tokens with complete achievements
          if (token.achievements.includes(ACHIEVEMENT_MULTIPLIERS[ACHIEVEMENT_MULTIPLIERS.length - 1])) {
            continue;
          }
          
          // Get current token details
          const tokenDetails = await this.dexScreenerService.getTokenDetails(token.address);
          
          if (!tokenDetails) {
            logger.debug(`No current details found for ${token.symbol}, skipping...`);
            continue;
          }
          
          // Calculate current multiplier
          const multiplier = tokenDetails.marketCap / token.initial_market_cap;
          
          logger.debug(`${token.symbol} - Initial MC: ${token.initial_market_cap.toLocaleString()}, Current MC: ${tokenDetails.marketCap.toLocaleString()}, Multiplier: ${multiplier.toFixed(2)}x`);
          
          // Check for new achievements
          const newAchievements: number[] = [];
          
          for (const targetMultiplier of ACHIEVEMENT_MULTIPLIERS) {
            if (multiplier >= targetMultiplier && !token.achievements.includes(targetMultiplier)) {
              newAchievements.push(targetMultiplier);
              
              // Record individual achievement
              await this.supabaseService.recordAchievement({
                token_address: token.address,
                multiplier: targetMultiplier,
                price_at_achievement: tokenDetails.price,
                market_cap_at_achievement: tokenDetails.marketCap
              });
              
              logger.info(`${token.symbol} achieved ${targetMultiplier}x milestone!`);
            }
          }
          
          // If new achievements, update database and send notifications
          if (newAchievements.length > 0) {
            const updatedAchievements = [...token.achievements, ...newAchievements].sort((a, b) => a - b);
            
            // Update token in database
            await this.supabaseService.updateTokenAchievements(
              token.address,
              updatedAchievements,
              tokenDetails.price,
              tokenDetails.marketCap
            );
            
            // Send notification for highest new achievement
            const highestAchievement = Math.max(...newAchievements);
            await this.telegramService.sendAchievementAlert(
              tokenDetails,
              highestAchievement,
              token.initial_market_cap
            );
            
            this.stats.achievementsUnlocked += newAchievements.length;
          }
        } catch (error) {
          logError(`Error checking achievements for ${token.symbol}:`, error as Error);
        }
      }
    } catch (error) {
      logError('Error checking token achievements:', error as Error);
      throw error;
    }
  }
  
  /**
   * Analyzes developer wallet activities
   */
  private async analyzeDevWallets(): Promise<void> {
    if (!this.isRunning) return;
    
    try {
      // Get top developer wallets
      const topWallets = await this.supabaseService.getTopDevWallets(5);
      
      // Get tokens for each wallet
      for (const wallet of topWallets) {
        if (wallet.tokens_created.length < 2) continue;
        
        try {
          // Get most recent token
          const latestTokenAddress = wallet.tokens_created[wallet.tokens_created.length - 1];
          const tokenDetails = await this.dexScreenerService.getTokenDetails(latestTokenAddress);
          
          if (tokenDetails) {
            // Calculate wallet reputation score
            let reputationScore = 50; // Neutral starting point
            
            // Reduce score for excessive token creation
            if (wallet.tokens_created.length > 10) {
              reputationScore -= (wallet.tokens_created.length - 10) * 2;
            }
            
            // Update wallet with reputation score
            if (wallet.reputation_score !== reputationScore) {
              wallet.reputation_score = reputationScore;
              await this.supabaseService.updateDevWallet(wallet);
              
              // If reputation drops too low, blacklist the wallet
              if (reputationScore < 20 && !wallet.is_blacklisted) {
                wallet.is_blacklisted = true;
                await this.supabaseService.updateDevWallet(wallet);
                
                // Alert about blacklisted wallet
                await this.telegramService.sendMessage(
                  config.telegram.chatId, 
                  `⚠️ *Developer Wallet Blacklisted*\n\nWallet \`${wallet.address}\` has been blacklisted due to suspicious activity.\nTotal tokens created: ${wallet.tokens_created.length}`
                );
              }
            }
          }
        } catch (error) {
          logError(`Error analyzing wallet ${wallet.address}:`, error as Error);
        }
      }
    } catch (error) {
      logError('Error analyzing developer wallets:', error as Error);
      throw error;
    }
  }
  
  /**
   * Performs database cleanup
   */
  private async performCleanup(): Promise<void> {
    if (!this.isRunning) return;
    
    try {
      await this.supabaseService.cleanup(30); // Keep 30 days of data
      logger.info('Database cleanup completed');
    } catch (error) {
      logError('Error during database cleanup:', error as Error);
      throw error;
    }
  }
  
  /**
   * Gets current monitoring statistics
   * @returns Statistics object
   */
  public getStats(): any {
    const uptime = Math.floor((Date.now() - this.stats.startTime.getTime()) / 1000 / 60); // Minutes
    
    return {
      ...this.stats,
      uptime,
      isRunning: this.isRunning,
      startTime: this.stats.startTime.toISOString()
    };
  }
  
  /**
   * Stops all monitoring intervals
   */
  private stopMonitoringIntervals(): void {
    // Clear token scan interval
    if (this.tokenScanInterval) {
      clearInterval(this.tokenScanInterval);
      this.tokenScanInterval = null;
    }
    
    // Clear achievement check interval
    if (this.achievementCheckInterval) {
      clearInterval(this.achievementCheckInterval);
      this.achievementCheckInterval = null;
    }
    
    // Clear developer wallet check interval
    if (this.devWalletCheckInterval) {
      clearInterval(this.devWalletCheckInterval);
      this.devWalletCheckInterval = null;
    }
    
    // Clear cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
  
  /**
   * Stops the monitoring process
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) {
      logger.warn('MonitoringEngine is not running');
      return;
    }
    
    logger.info('Stopping monitoring...');
    
    // Stop all intervals
    this.stopMonitoringIntervals();
    
    // Shutdown services
    await this.telegramService.shutdown();
    
    this.isRunning = false;
    logger.info('Monitoring stopped');
  }
}
