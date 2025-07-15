// src/utils/logger.js

/**
 * Sistema de logging padronizado
 */

const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN', 
  INFO: 'INFO',
  SUCCESS: 'SUCCESS',
  DEBUG: 'DEBUG',
  HTTP: 'HTTP'
};

const LOG_COLORS = {
  ERROR: '❌',
  WARN: '⚠️',
  INFO: 'ℹ️',
  SUCCESS: '✅',
  DEBUG: '🔍',
  HTTP: '🌐'
};

class Logger {
  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  /**
   * Formata a mensagem de log
   */
  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const emoji = LOG_COLORS[level] || '';
    
    const baseMessage = `${emoji} [${timestamp}] ${level}: ${message}`;
    
    if (Object.keys(meta).length > 0) {
      return `${baseMessage}\n${JSON.stringify(meta, null, 2)}`;
    }
    
    return baseMessage;
  }

  /**
   * Log de erro
   */
  error(message, meta = {}) {
    const formattedMessage = this.formatMessage(LOG_LEVELS.ERROR, message, meta);
    console.error(formattedMessage);
    
    // Em produção, aqui você pode enviar para serviços como Sentry, Winston, etc.
    if (this.isProduction) {
      // Implementar integração com serviço de logging externo
    }
  }

  /**
   * Log de warning
   */
  warn(message, meta = {}) {
    const formattedMessage = this.formatMessage(LOG_LEVELS.WARN, message, meta);
    console.warn(formattedMessage);
  }

  /**
   * Log de informação
   */
  info(message, meta = {}) {
    const formattedMessage = this.formatMessage(LOG_LEVELS.INFO, message, meta);
    console.log(formattedMessage);
  }

  /**
   * Log de sucesso
   */
  success(message, meta = {}) {
    const formattedMessage = this.formatMessage(LOG_LEVELS.SUCCESS, message, meta);
    console.log(formattedMessage);
  }

  /**
   * Log de debug (apenas em desenvolvimento)
   */
  debug(message, meta = {}) {
    if (this.isDevelopment) {
      const formattedMessage = this.formatMessage(LOG_LEVELS.DEBUG, message, meta);
      console.log(formattedMessage);
    }
  }

  /**
   * Log de requisições HTTP
   */
  http(req, res, duration) {
    const { method, url, ip } = req;
    const { statusCode } = res;
    const userAgent = req.get('User-Agent') || '';
    const user = req.user?.username || 'anonymous';
    
    const message = `${method} ${url} - ${statusCode} - ${duration}ms`;
    const meta = {
      method,
      url,
      statusCode,
      duration,
      ip,
      user,
      userAgent: this.isDevelopment ? userAgent : undefined
    };

    const formattedMessage = this.formatMessage(LOG_LEVELS.HTTP, message, meta);
    console.log(formattedMessage);
  }

  /**
   * Log de autenticação
   */
  auth(action, user, success = true, details = {}) {
    const level = success ? LOG_LEVELS.SUCCESS : LOG_LEVELS.WARN;
    const message = `Auth ${action}: ${user} - ${success ? 'SUCCESS' : 'FAILED'}`;
    
    this[success ? 'success' : 'warn'](message, {
      action,
      user,
      success,
      ...details
    });
  }

  /**
   * Log de operações no banco de dados
   */
  db(operation, collection, success = true, details = {}) {
    const level = success ? LOG_LEVELS.INFO : LOG_LEVELS.ERROR;
    const message = `DB ${operation} on ${collection} - ${success ? 'SUCCESS' : 'FAILED'}`;
    
    this[success ? 'info' : 'error'](message, {
      operation,
      collection,
      success,
      ...details
    });
  }

  /**
   * Log de validação
   */
  validation(field, value, success = true, errors = []) {
    const level = success ? LOG_LEVELS.DEBUG : LOG_LEVELS.WARN;
    const message = `Validation ${field} - ${success ? 'PASSED' : 'FAILED'}`;
    
    if (success) {
      this.debug(message, { field, value });
    } else {
      this.warn(message, { field, value, errors });
    }
  }

  /**
   * Log de performance
   */
  performance(operation, duration, threshold = 1000) {
    const isSlow = duration > threshold;
    const level = isSlow ? LOG_LEVELS.WARN : LOG_LEVELS.INFO;
    const message = `Performance ${operation}: ${duration}ms ${isSlow ? '(SLOW)' : ''}`;
    
    this[isSlow ? 'warn' : 'info'](message, {
      operation,
      duration,
      threshold,
      isSlow: isSlow
    });
  }

  /**
   * Log de sistema
   */
  system(event, details = {}) {
    this.info(`System: ${event}`, details);
  }
}

// Instância singleton
const logger = new Logger();

// Middleware de logging para Express
const httpLogger = (req, res, next) => {
  const startTime = Date.now();

  // Override res.end to capture response time
  const originalEnd = res.end;
  res.end = function(...args) {
    const duration = Date.now() - startTime;
    logger.http(req, res, duration);
    originalEnd.apply(this, args);
  };

  next();
};

module.exports = {
  logger,
  httpLogger,
  LOG_LEVELS,
  LOG_COLORS
};
