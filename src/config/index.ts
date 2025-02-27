// src/config/index.ts

import dotenv from 'dotenv';
import { AppConfig } from '../types';
import { logger } from '../utils/logger';

// Load environment variables
dotenv.config();

// Check for required environment variables
const requiredEnvVars = [
  'TELEGRAM_BOT_TOKEN',
  'TELEGRAM_CHAT_ID',
  'SUPABASE_URL',
  'SUPABASE_KEY'
];

// Validate required environment variables
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
}

/**
 * Parse numeric environment variable with fallback
 * @param varName - Environment variable name
 * @param defaultValue - Default value if not present or invalid
 * @returns Parsed numeric value
 */
function parseNumericEnv(varName: string, defaultValue: number): number {
  const value = process.env[varName];
  if (!value) return defaultValue;
  
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Parse boolean environment variable with fallback
 * @param varName - Environment variable name
 * @param defaultValue - Default value if not present
 * @returns Parsed boolean value
 */
function parseBooleanEnv(varName: string, defaultValue: boolean): boolean {
  const value = process.env[varName];
  if (!value) return defaultValue;
  
  return value.toLowerCase() === 'true';
}

// Create configuration object
export const config: AppConfig = {
  telegram: {
    token: process.env.TELEGRAM_BOT_TOKEN!,
    chatId: process.env.TELEGRAM_CHAT_ID!,
    adminChatId: process.env.TELEGRAM_ADMIN_CHAT_ID,
    pollingEnabled: parseBooleanEnv('TELEGRAM_POLLING_ENABLED', true),
    maxMessageLength: parseNumericEnv('TELEGRAM_MAX_MESSAGE_LENGTH', 4096),
    messageDelay: parseNumericEnv('TELEGRAM_MESSAGE_DELAY', 50)
  },
  dexscreener: {
    apiUrl: process.env.DEXSCREENER_API_URL || 'https://api.dexscreener.com/latest/dex',
    rateLimit: parseNumericEnv('DEXSCREENER_RATE_LIMIT', 300),
    maxRetries: parseNumericEnv('DEXSCREENER_MAX_RETRIES', 3),
    retryDelay: parseNumericEnv('DEXSCREENER_RETRY_DELAY', 2000),
    initialLookbackHours: parseNumericEnv('DEXSCREENER_INITIAL_LOOKBACK_HOURS', 24)
  },
  supabase: {
    url: process.env.SUPABASE_URL!,
    key: process.env.SUPABASE_KEY!,
    schema: process.env.SUPABASE_SCHEMA || 'public'
  },
  monitoring: {
    minLiquidityUsd: parseNumericEnv('MIN_LIQUIDITY_USD', 1000),
    batchSize: parseNumericEnv('BATCH_SIZE', 50),
    scanInterval: parseNumericEnv('SCAN_INTERVAL', 5000),
    achievementCheckInterval: parseNumericEnv('ACHIEVEMENT_CHECK_INTERVAL', 60000),
    cleanupInterval: parseNumericEnv('CLEANUP_INTERVAL', 86400000), // 24 hours
    devWalletCheckInterval: parseNumericEnv('DEV_WALLET_CHECK_INTERVAL', 300000) // 5 minutes
  },
  logging: {
    level: (process.env.LOG_LEVEL as 'error' | 'warn' | 'info' | 'debug') || 'info',
    filePath: process.env.LOG_FILE_PATH || './logs/pump-monitor.log',
    consoleEnabled: parseBooleanEnv('LOG_CONSOLE_ENABLED', true),
    fileEnabled: parseBooleanEnv('LOG_FILE_ENABLED', true),
    maxFileSize: parseNumericEnv('LOG_MAX_FILE_SIZE', 10 * 1024 * 1024), // 10 MB
    maxFiles: parseNumericEnv('LOG_MAX_FILES', 5)
  },
  environment: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
  version: '1.0.0'
};

// Log configuration on startup in development mode
if (config.environment === 'development') {
  // Safely log config without sensitive values
  const safeConfig = {
    ...config,
    telegram: {
      ...config.telegram,
      token: '***REDACTED***',
    },
    supabase: {
      ...config.supabase,
      key: '***REDACTED***',
      url: '***REDACTED***'
    }
  };
  
  logger.debug('Loaded configuration:', safeConfig);
}

export default config;
