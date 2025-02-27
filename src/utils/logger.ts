// src/utils/logger.ts

import winston from 'winston';
import path from 'path';
import fs from 'fs';

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
try {
  if (!fs.existsSync(logsDir)){
    fs.mkdirSync(logsDir, { recursive: true });
  }
} catch (error) {
  console.error('Error creating logs directory:', error);
}

// Custom format for console output with colors and context
const consoleFormat = winston.format.printf(({ level, message, timestamp, ...context }) => {
  let msg = `${timestamp} [${level}] ${message}`;
  
  // Add context if present and not empty
  if (context && Object.keys(context).filter(key => key !== 'splat').length > 0) {
    const filteredContext = Object.entries(context)
      .filter(([key]) => key !== 'splat')
      .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});
      
    msg += `\n${JSON.stringify(filteredContext, null, 2)}`;
  }
  
  return msg;
});

// Define log levels with custom colors
const customLevels = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
  },
  colors: {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    debug: 'blue'
  }
};

// Add custom colors
winston.addColors(customLevels.colors);

// Create the logger instance
export const logger = winston.createLogger({
  levels: customLevels.levels,
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'pump-monitor' },
  transports: [
    // Console transport with formatting
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss'
        }),
        consoleFormat
      )
    }),
    // File transport for all logs
    new winston.transports.File({
      filename: path.join(logsDir, 'pump-monitor.log'),
      format: winston.format.combine(
        winston.format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.json()
      ),
      maxsize: 10 * 1024 * 1024, // 10 MB
      maxFiles: 5,
      tailable: true
    }),
    // Separate file for errors
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.json()
      ),
      maxsize: 10 * 1024 * 1024, // 10 MB
      maxFiles: 5,
      tailable: true
    })
  ]
});

// Add shutdown handler
process.on('beforeExit', () => {
  logger.end();
});

/**
 * Helper function to safely stringify objects for logging
 * @param obj - Object to stringify
 * @returns Stringified object or error message
 */
export const safeStringify = (obj: any): string => {
  try {
    return JSON.stringify(obj, null, 2);
  } catch (error) {
    return `[Error stringifying object: ${error}]`;
  }
};

/**
 * Helper function to mask sensitive information in objects
 * @param obj - Object containing sensitive data
 * @param keysToMask - Keys to mask in the object
 * @returns Masked object
 */
export const maskSensitiveData = (obj: Record<string, any>, keysToMask: string[] = []): Record<string, any> => {
  const maskedObj = { ...obj };
  
  // Default sensitive keys if not provided
  const sensitiveKeys = keysToMask.length > 0 ? 
    keysToMask : 
    ['password', 'token', 'key', 'secret', 'auth', 'credentials'];
  
  for (const key of Object.keys(maskedObj)) {
    // Check if key contains any of the sensitive key patterns
    if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive.toLowerCase()))) {
      maskedObj[key] = '***REDACTED***';
    } else if (typeof maskedObj[key] === 'object' && maskedObj[key] !== null) {
      // Recursively mask nested objects
      maskedObj[key] = maskSensitiveData(maskedObj[key], sensitiveKeys);
    }
  }
  
  return maskedObj;
};

/**
 * Enhanced error logging with context
 * @param message - Error message
 * @param error - Error object
 * @param context - Additional context
 */
export const logError = (message: string, error: any, context: Record<string, any> = {}): void => {
  const errorObj = error instanceof Error ? error : new Error(String(error));
  
  logger.error(message, {
    error: errorObj.message,
    stack: errorObj.stack,
    ...context,
    ...(error.response && {
      response: {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      }
    })
  });
};

/**
 * Log API request details
 * @param method - HTTP method
 * @param url - API endpoint URL
 * @param params - Request parameters
 */
export const logApiRequest = (method: string, url: string, params?: any): void => {
  logger.debug(`API Request: ${method} ${url}`, { 
    method, 
    url, 
    params: params ? maskSensitiveData(params) : undefined
  });
};

/**
 * Log API response details
 * @param method - HTTP method
 * @param url - API endpoint URL
 * @param status - Response status code
 * @param data - Response data
 */
export const logApiResponse = (method: string, url: string, status: number, data?: any): void => {
  // Truncate data if it's too large
  const truncatedData = data ? 
    (safeStringify(data).length > 1000 ? 
      safeStringify(data).substring(0, 1000) + '...' : data) : 
    undefined;
  
  logger.debug(`API Response: ${method} ${url}`, { 
    method, 
    url, 
    status, 
    data: truncatedData 
  });
};

// Export as default and named export
export default logger;
