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
