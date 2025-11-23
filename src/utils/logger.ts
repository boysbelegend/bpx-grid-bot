/**
 * Logger Utility
 * Enhanced logging with support for multiple transports
 */

import pino, { Logger } from 'pino';
import { getEnv } from './helpers';

/**
 * Create logger instance
 */
export function createLogger(options?: {
  level?: string;
  name?: string;
  file?: string;
}): Logger {
  const level = options?.level || getEnv('LOG_LEVEL', 'info');
  const name = options?.name || 'GridBot';
  const file = options?.file;

  const targets: any[] = [
    {
      level,
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    },
  ];

  // Add file transport if specified
  if (file) {
    targets.push({
      level,
      target: 'pino/file',
      options: {
        destination: file,
      },
    });
  }

  const transport = pino.transport({ targets });

  return pino(
    {
      level,
      name,
      base: undefined,
      serializers: {
        req: pino.stdSerializers.req,
        res: pino.stdSerializers.res,
        err: pino.stdSerializers.err,
      },
    },
    transport
  );
}

/**
 * Default logger instance
 */
export const logger = createLogger();

/**
 * Create child logger with additional context
 */
export function createChildLogger(
  parent: Logger,
  context: Record<string, any>
): Logger {
  return parent.child(context);
}

/**
 * Log levels
 */
export enum LogLevel {
  TRACE = 'trace',
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal',
}

/**
 * Structured logging helpers
 */
export const log = {
  /**
   * Log trading event
   */
  trade: (event: string, data: any) => {
    logger.info({ event, ...data }, `[TRADE] ${event}`);
  },

  /**
   * Log order event
   */
  order: (action: string, data: any) => {
    logger.info({ action, ...data }, `[ORDER] ${action}`);
  },

  /**
   * Log risk event
   */
  risk: (type: 'warning' | 'violation', message: string, data?: any) => {
    const logFn = type === 'violation' ? logger.error : logger.warn;
    logFn({ type, ...data }, `[RISK] ${message}`);
  },

  /**
   * Log performance metrics
   */
  metrics: (data: any) => {
    logger.info({ ...data }, '[METRICS]');
  },

  /**
   * Log error with context
   */
  error: (error: Error, context?: string) => {
    logger.error({ err: error, context }, error.message);
  },

  /**
   * Log debug information
   */
  debug: (message: string, data?: any) => {
    logger.debug(data, message);
  },

  /**
   * Log info message
   */
  info: (message: string, data?: any) => {
    logger.info(data, message);
  },

  /**
   * Log warning
   */
  warn: (message: string, data?: any) => {
    logger.warn(data, message);
  },
};

export default logger;
