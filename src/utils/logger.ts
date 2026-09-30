// src/utils/logger.ts - Structured logging

import * as pino from 'pino';

export class AnosLogger {
  private logger: any;

  constructor(context: string = 'ANOS') {
    this.logger = pino.pino({
      level: process.env.LOG_LEVEL || 'info',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname'
        }
      }
    });
  }

  info(message: string, metadata?: any): void {
    this.logger.info(metadata || {}, message);
  }

  error(message: string, error?: Error, metadata?: any): void {
    this.logger.error({ error, ...metadata }, message);
  }

  warn(message: string, metadata?: any): void {
    this.logger.warn(metadata || {}, message);
  }

  debug(message: string, metadata?: any): void {
    this.logger.debug(metadata || {}, message);
  }
}
