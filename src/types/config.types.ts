// src/types/config.types.ts

/**
 * Telegram configuration options
 */
export interface TelegramConfig {
  token: string;
  chatId: string;
  adminChatId?: string;
  pollingEnabled: boolean;
  maxMessageLength: number;
  messageDelay: number; // Delay between consecutive messages in ms
}

/**
 * DexScreener API configuration
 */
export interface DexScreenerConfig {
  apiUrl: string;
  rateLimit: number; // Requests per minute
  maxRetries: number;
  retryDelay: number; // ms
  initialLookbackHours: number;
}

/**
 * Supabase configuration
 */
export interface SupabaseConfig {
  url: string;
  key: string;
  schema: string;
}

/**
 * Monitoring configuration
 */
export interface MonitoringConfig {
  minLiquidityUsd: number;
  batchSize: number;
  scanInterval: number; // ms
  achievementCheckInterval: number; // ms
  cleanupInterval: number; // ms
  devWalletCheckInterval: number; // ms
}

/**
 * Logging configuration
 */
export interface LoggingConfig {
  level: 'error' | 'warn' | 'info' | 'debug';
  filePath: string;
  consoleEnabled: boolean;
  fileEnabled: boolean;
  maxFileSize: number; // bytes
  maxFiles: number;
}

/**
 * Complete application configuration
 */
export interface AppConfig {
  telegram: TelegramConfig;
  dexscreener: DexScreenerConfig;
  supabase: SupabaseConfig;
  monitoring: MonitoringConfig;
  logging: LoggingConfig;
  environment: 'development' | 'production' | 'test';
  version: string;
}
