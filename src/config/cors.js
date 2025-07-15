// src/config/cors.js

const { logger } = require('../utils/logger');

/**
 * Configuração CORS para diferentes ambientes
 */
const corsConfig = {
  // Origens permitidas por ambiente
  allowedOrigins: {
    development: [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001'
    ],
    staging: [
      'https://staging-frontend.vercel.app',
      'https://capacitar-frontend-staging.vercel.app'
    ],
    production: [
      'https://capacitar-frontend.vercel.app',
      'https://processflow.company.com',
      'https://app.processflow.com'
    ]
  },

  // Headers permitidos
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers',
    'X-API-Version'
  ],

  // Métodos permitidos
  allowedMethods: [
    'GET',
    'POST',
    'PUT',
    'PATCH',
    'DELETE',
    'OPTIONS'
  ],

  // Headers expostos para o cliente
  exposedHeaders: [
    'X-Total-Count',
    'X-Total-Pages',
    'X-Current-Page',
    'X-Per-Page'
  ]
};

/**
 * Configuração dinâmica do CORS baseada no ambiente
 */
const getCorsOptions = () => {
  const env = process.env.NODE_ENV || 'development';
  const allowedOrigins = corsConfig.allowedOrigins[env] || corsConfig.allowedOrigins.development;

  return {
    origin: (origin, callback) => {
      // Permitir requests sem origin (mobile apps, Postman, etc.)
      if (!origin) {
        return callback(null, true);
      }

      // Verificar se a origin está na lista permitida
      if (allowedOrigins.includes(origin)) {
        logger.debug('CORS: Origin permitida', { origin, env });
        callback(null, true);
      } else {
        logger.warn('CORS: Origin bloqueada', { origin, env, allowedOrigins });
        callback(new Error(`Origin ${origin} não permitida pelo CORS`));
      }
    },

    credentials: true, // Permitir cookies e headers de auth
    
    methods: corsConfig.allowedMethods,
    
    allowedHeaders: corsConfig.allowedHeaders,
    
    exposedHeaders: corsConfig.exposedHeaders,
    
    // Cache preflight por 24 horas
    maxAge: 86400,
    
    // Permitir headers preflight
    preflightContinue: false,
    
    // Responder com 204 para OPTIONS
    optionsSuccessStatus: 204
  };
};

/**
 * Middleware customizado para logging CORS
 */
const corsLogger = (req, res, next) => {
  const origin = req.get('Origin');
  const method = req.method;
  
  if (method === 'OPTIONS') {
    logger.debug('CORS Preflight', {
      origin,
      method,
      headers: req.get('Access-Control-Request-Headers'),
      requestMethod: req.get('Access-Control-Request-Method')
    });
  } else if (origin) {
    logger.debug('CORS Request', {
      origin,
      method,
      url: req.url
    });
  }
  
  next();
};

/**
 * Headers de segurança adicionais
 */
const securityHeaders = (req, res, next) => {
  // Prevenir clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevenir MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // XSS Protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Content Security Policy básico
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  
  next();
};

/**
 * Middleware para tratar erros CORS
 */
const corsErrorHandler = (err, req, res, next) => {
  if (err.message && err.message.includes('CORS')) {
    logger.warn('Erro CORS', {
      error: err.message,
      origin: req.get('Origin'),
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent')
    });
    
    return res.status(403).json({
      success: false,
      error: 'CORS: Origin não permitida',
      code: 'CORS_ERROR'
    });
  }
  
  next(err);
};

/**
 * Validar configurações CORS
 */
const validateConfig = () => {
  const env = process.env.NODE_ENV || 'development';
  const origins = corsConfig.allowedOrigins[env];
  
  if (!origins || origins.length === 0) {
    logger.warn('CORS: Nenhuma origin configurada', { env });
    return false;
  }
  
  logger.info('CORS configurado', {
    env,
    origins: origins.length,
    methods: corsConfig.allowedMethods.length,
    headers: corsConfig.allowedHeaders.length
  });
  
  return true;
};

module.exports = {
  getCorsOptions,
  corsLogger,
  securityHeaders,
  corsErrorHandler,
  validateConfig,
  corsConfig
};
