// src/index.ts

import { DexScreenerService } from './services/dexscreener.service';
import { TelegramService } from './services/telegram.service';
import { SupabaseService } from './services/supabase.service';
import { MonitoringEngine } from './monitoring/monitoring.engine';
import { config } from './config';
import { logger, logError } from './utils/logger';

// Print application banner
console.log(`
██████╗ ██╗   ██╗███╗   ███╗██████╗    ███╗   ███╗ ██████╗ ███╗   ██╗██╗████████╗ ██████╗ ██████╗ 
██╔══██╗██║   ██║████╗ ████║██╔══██╗   ████╗ ████║██╔═══██╗████╗  ██║██║╚══██╔══╝██╔═══██╗██╔══██╗
██████╔╝██║   ██║██╔████╔██║██████╔╝   ██╔████╔██║██║   ██║██╔██╗ ██║██║   ██║   ██║   ██║██████╔╝
██╔═══╝ ██║   ██║██║╚██╔╝██║██╔═══╝    ██║╚██╔╝██║██║   ██║██║╚██╗██║██║   ██║   ██║   ██║██╔══██╗
██║     ╚██████╔╝██║ ╚═╝ ██║██║        ██║ ╚═╝ ██║╚██████╔╝██║ ╚████║██║   ██║   ╚██████╔╝██║  ██║
╚═╝      ╚═════╝ ╚═╝     ╚═╝╚═╝        ╚═╝     ╚═╝ ╚═════╝ ╚═╝  ╚═══╝╚═╝   ╚═╝    ╚═════╝ ╚═╝  ╚═╝
`);
console.log(`Pump.fun Monitor Bot v${config.version} - Environment: ${config.environment}\n`);

// Global monitoring engine instance
let monitoringEngine: MonitoringEngine | null = null;

/**
 * Creates and initializes all services
 * @returns Initialized monitoring engine
 */
async function initializeServices(): Promise<MonitoringEngine> {
  try {
    logger.info('Initializing services...');
    
    // Create service instances
    const dexScreenerService = new DexScreenerService();
    const telegramService = new TelegramService();
    const supabaseService = new SupabaseService();
    
    // Create and initialize monitoring engine
    const engine = new MonitoringEngine(
      dexScreenerService,
      telegramService,
      supabaseService
    );
    
    await engine.initialize();
    logger.info('All services initialized successfully');
    
    return engine;
  } catch (error) {
    logError('Failed to initialize services:', error as Error);
    throw error;
  }
}

/**
 * Gracefully shuts down the application
 * @param exitCode - Exit code to use
 */
async function shutdown(exitCode: number = 0): Promise<void> {
  logger.info('Shutting down application...');
  
  try {
    if (monitoringEngine) {
      await monitoringEngine.stop();
      monitoringEngine = null;
    }
    
    logger.info('Shutdown complete');
    process.exit(exitCode);
  } catch (error) {
    logError('Error during shutdown:', error as Error);
    process.exit(1);
  }
}

/**
 * Main application entry point
 */
async function main(): Promise<void> {
  try {
    // Initialize services
    monitoringEngine = await initializeServices();
    
    // Start monitoring
    await monitoringEngine.start();
    
    logger.info('Pump.fun Monitor Bot is running');
    
    // Display instructions in development mode
    if (config.environment === 'development') {
      console.log('\n--- Development Mode Instructions ---');
      console.log('- Press Ctrl+C to stop the application');
      console.log('- Check logs in the logs/ directory');
      console.log('------------------------------------\n');
    }
  } catch (error) {
    logError('Failed to start application:', error as Error);
    await shutdown(1);
  }
}

// Handle process events for graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Received SIGINT signal');
  await shutdown();
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM signal');
  await shutdown();
});

process.on('uncaughtException', async (error) => {
  logError('Uncaught exception:', error);
  await shutdown(1);
});

process.on('unhandledRejection', async (reason) => {
  logError('Unhandled rejection:', reason as Error);
  await shutdown(1);
});

// Start the application
main().catch(async (error) => {
  logError('Fatal error in main process:', error);
  await shutdown(1);
});
