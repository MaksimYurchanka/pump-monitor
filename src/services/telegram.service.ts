// src/services/telegram.service.ts

import TelegramBot from 'node-telegram-bot-api';
import { config } from '../config';
import { logger, logError } from '../utils/logger';
import { Token, TokenDetails } from '../types';

/**
 * Service for interacting with the Telegram Bot API
 * Handles message formatting, queuing, and command processing
 */
export class TelegramService {
  private bot!: TelegramBot;
  private messageQueue: Promise<void> = Promise.resolve();
  private isInitialized = false;
  
  /**
   * Creates a new TelegramService instance
   */
  constructor() {}
  
  /**
   * Initializes the Telegram bot
   * @throws Error if initialization fails
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn('TelegramService is already initialized');
      return;
    }
    
    logger.info('Initializing Telegram bot...');
    
    try {
      this.bot = new TelegramBot(config.telegram.token, { 
        polling: config.telegram.pollingEnabled 
      });
      
      this.setupCommandHandlers();
      this.setupErrorHandling();
      
      // Verify we can connect to the API
      const botInfo = await this.bot.getMe();
      logger.info(`Telegram bot initialized: @${botInfo.username}`);
      this.isInitialized = true;
    } catch (error) {
      logError('Failed to initialize Telegram bot:', error as Error);
      throw new Error('Telegram initialization failed');
    }
  }
  
  /**
   * Sets up command handlers for bot interactions
   */
  private setupCommandHandlers(): void {
    this.bot.onText(/\/start/, async (msg) => {
      await this.sendMessage(msg.chat.id.toString(), `
🚀 *Pump.fun Monitor Bot*

I monitor Solana token listings on Raydium DEX in real-time.
You'll receive alerts for:
- New token listings 
- Market cap achievements (1.1x to 100x)
- Developer wallet analysis

Use /help to see available commands.
      `);
    });
    
    this.bot.onText(/\/help/, async (msg) => {
      await this.sendMessage(msg.chat.id.toString(), `
*Available Commands:*

/start - Start the bot
/status - Check bot status
/help - Show this help message
/settings - Adjust notification settings
/stats - Show monitoring statistics
      `);
    });
    
    this.bot.onText(/\/status/, async (msg) => {
      const stats = {
        monitoringSince: new Date().toLocaleString(),
        detectedTokens: 0,
        achievementsTracked: 0,
      };
      
      await this.sendMessage(msg.chat.id.toString(), `
🤖 *Bot Status:* Running

👀 *Monitoring:* Raydium DEX
⏱ *Refresh Rate:* ${config.monitoring.scanInterval / 1000}s
💧 *Min Liquidity:* $${config.monitoring.minLiquidityUsd.toLocaleString()}
🕒 *Running since:* ${stats.monitoringSince}
🔍 *Tokens detected:* ${stats.detectedTokens}
🏆 *Achievements:* ${stats.achievementsTracked}
      `);
    });
  }
  
  /**
   * Sets up error handlers for the bot
   */
  private setupErrorHandling(): void {
    this.bot.on('error', (error) => {
      logError('Telegram bot error:', error);
    });
    
    this.bot.on('polling_error', (error) => {
      // Don't log ETIMEDOUT or EHOSTUNREACH as it's common and not critical
      if ((error as any).code !== 'ETIMEDOUT' && (error as any).code !== 'EHOSTUNREACH') {
        logError('Telegram polling error:', error);
      }
    });
    
    this.bot.on('webhook_error', (error) => {
      logError('Telegram webhook error:', error);
    });
  }
  
  /**
   * Sends a notification for a new token
   * @param token - Token data to send notification for
   */
  public async sendNewTokenAlert(token: Token): Promise<void> {
    const marketCap = token.marketCap || token.fdv || 0;
    const liquidity = token.liquidity?.usd || 0;
    const volume = token.volume?.h24 || 0;
    
    const message = `
🆕 *New Token Detected!* 🆕

*${token.baseToken.name}* (${token.baseToken.symbol})
💰 *Initial Price:* $${parseFloat(token.priceUsd).toFixed(12)}
💵 *Market Cap:* $${marketCap.toLocaleString()}
💧 *Liquidity:* $${liquidity.toLocaleString()}
📊 *24h Volume:* $${volume.toLocaleString()}
🔊 *Created:* ${new Date(token.pairCreatedAt).toLocaleString()}

▶️ *Token Address:*
\`${token.baseToken.address}\`

[View Chart](${token.url})
`;
    
    await this.sendMessage(config.telegram.chatId, message);
  }
  
  /**
   * Sends a notification about an achievement (milestone)
   * @param token - Token details
   * @param multiplier - Achievement multiplier
   * @param initialMarketCap - Initial market cap for reference
   */
  public async sendAchievementAlert(
    token: TokenDetails,
    multiplier: number,
    initialMarketCap: number
  ): Promise<void> {
    const emoji = this.getMultiplierEmoji(multiplier);
    
    const message = `
🏆 *Achievement Unlocked: ${multiplier}X!* ${emoji}

*${token.name}* (${token.symbol}) reached *${multiplier}X* from initial market cap!

💵 *Initial MC:* $${Math.floor(initialMarketCap).toLocaleString()}
💰 *Current MC:* $${Math.floor(token.marketCap).toLocaleString()}
📈 *Current Price:* $${token.price.toFixed(12)}
📊 *24h Volume:* $${token.volume24h.toLocaleString()}
⏱ *Time to achieve:* ${this.getTimeSinceCreation(token.createdAt)}

▶️ *Token Address:*
\`${token.address}\`

[View Chart](${token.url})
`;
    
    await this.sendMessage(config.telegram.chatId, message);
  }
  
  /**
   * Sends a summary of multiple tokens
   * @param tokens - Array of tokens to summarize
   */
  public async sendTokensSummary(tokens: Token[]): Promise<void> {
    if (tokens.length === 0) {
      await this.sendMessage(config.telegram.chatId, '📊 No tokens to display');
      return;
    }
    
    const summary = `
📊 *Found ${tokens.length} tokens*

${tokens.map((token, index) => this.formatTokenSummary(token, index + 1)).join('\n\n')}
`;
    
    // Split message if too long
    const chunks = this.splitMessage(summary);
    for (const chunk of chunks) {
      await this.sendMessage(config.telegram.chatId, chunk);
    }
  }
  
  /**
   * Sends a notification about developer wallet activity
   * @param address - Wallet address
   * @param tokenCount - Number of tokens created
   * @param newToken - Latest token created
   */
  public async sendDevWalletAlert(
    address: string,
    tokenCount: number,
    newToken: TokenDetails
  ): Promise<void> {
    const message = `
👨‍💻 *Developer Wallet Alert* ${tokenCount > 5 ? '⚠️' : ''}

This developer has created *${tokenCount} tokens*:
▶️ \`${address}\`

*Latest token:* ${newToken.name} (${newToken.symbol})
💰 *Price:* $${newToken.price.toFixed(12)}
💵 *Market Cap:* $${newToken.marketCap.toLocaleString()}
⏱ *Created:* ${new Date(newToken.createdAt).toLocaleString()}

${tokenCount > 5 ? '⚠️ *Use caution when trading tokens from this developer.*' : ''}

[View Token](${newToken.url})
`;
    
    await this.sendMessage(config.telegram.chatId, message);
  }
  
  /**
   * Formats a token for summary display
   * @param token - Token to format
   * @param index - Index for listing
   * @returns Formatted string
   */
  private formatTokenSummary(token: Token, index: number): string {
    const marketCap = token.marketCap || token.fdv || 0;
    const liquidity = token.liquidity?.usd || 0;
    
    return `${index}. *${token.baseToken.symbol}* - ${token.baseToken.name}
💰 MC: $${marketCap.toLocaleString()}
💧 Liq: $${liquidity.toLocaleString()}
📅 Listed: ${new Date(token.pairCreatedAt).toLocaleString()}`;
  }
  
  /**
   * Gets an appropriate emoji for achievement multiplier
   * @param multiplier - Achievement multiplier
   * @returns Emoji string
   */
  private getMultiplierEmoji(multiplier: number): string {
    if (multiplier >= 100) return '🏆';
    if (multiplier >= 50) return '👑';
    if (multiplier >= 20) return '🌟';
    if (multiplier >= 10) return '🔥';
    if (multiplier >= 5) return '💫';
    if (multiplier >= 2) return '✌️';
    return '⭐️';
  }
  
  /**
   * Gets formatted time since token creation
   * @param createdAt - Creation timestamp
   * @returns Formatted time string
   */
  private getTimeSinceCreation(createdAt: number): string {
    const now = Date.now();
    const diffMs = now - createdAt;
    
    const minutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    
    return `${minutes}m`;
  }
  
  /**
   * Splits a message into chunks if it exceeds maximum length
   * @param text - Original message text
   * @param maxLength - Maximum message length
   * @returns Array of message chunks
   */
  private splitMessage(text: string, maxLength: number = config.telegram.maxMessageLength): string[] {
    if (text.length <= maxLength) {
      return [text];
    }
    
    const chunks: string[] = [];
    let current = '';
    const lines = text.split('\n');
    
    for (const line of lines) {
      if ((current + line + '\n').length > maxLength) {
        if (current) {
          chunks.push(current.trim());
        }
        current = line + '\n';
      } else {
        current += line + '\n';
      }
    }
    
    if (current.trim()) {
      chunks.push(current.trim());
    }
    
    logger.debug(`Split message into ${chunks.length} chunks`);
    return chunks;
  }
  
  /**
   * Sends a message with queuing to maintain order and respect rate limits
   * @param chatId - Chat ID to send message to
   * @param message - Message text
   */
  public async sendMessage(chatId: string, message: string): Promise<void> {
    if (!this.isInitialized) {
      logger.warn('Attempted to send message before TelegramService initialization');
      await this.initialize();
    }
    
    // Queue messages to maintain order
    this.messageQueue = this.messageQueue.then(async () => {
      try {
        await this.bot.sendMessage(chatId, message, {
          parse_mode: 'Markdown',
          disable_web_page_preview: false
        });
        
        // Small delay between messages to respect rate limits
        await new Promise(resolve => setTimeout(resolve, config.telegram.messageDelay));
      } catch (error) {
        // Special handling for long message errors
        if ((error as Error).message?.includes('message is too long')) {
          const chunks = this.splitMessage(message, 2000); // Use smaller chunks
          for (const chunk of chunks) {
            try {
              await this.bot.sendMessage(chatId, chunk, {
                parse_mode: 'Markdown',
                disable_web_page_preview: false
              });
              await new Promise(resolve => setTimeout(resolve, config.telegram.messageDelay));
            } catch (chunkError) {
              logError('Failed to send message chunk:', chunkError as Error);
            }
          }
        } else {
          logError('Error sending Telegram message:', error as Error);
        }
      }
    });
  }
  
  /**
   * Sends a photo with caption
   * @param chatId - Chat ID to send photo to
   * @param photoUrl - URL of photo
   * @param caption - Caption text
   */
  public async sendPhoto(chatId: string, photoUrl: string, caption: string): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    this.messageQueue = this.messageQueue.then(async () => {
      try {
        await this.bot.sendPhoto(chatId, photoUrl, {
          caption,
          parse_mode: 'Markdown'
        });
        
        await new Promise(resolve => setTimeout(resolve, config.telegram.messageDelay));
      } catch (error) {
        logError('Error sending photo:', error as Error);
      }
    });
  }
  
  /**
   * Stops the Telegram bot polling
   */
  public async shutdown(): Promise<void> {
    if (this.bot && config.telegram.pollingEnabled) {
      logger.info('Stopping Telegram bot polling...');
      await this.bot.stopPolling();
    }
    
    this.isInitialized = false;
    logger.info('Telegram service shutdown complete');
  }
}
