/**
 * Utilitários padronizados para o backend ProcessFlow
 * 
 * Este arquivo contém funções de validação, resposta, sanitização
 * e outras utilidades comuns usadas em todo o backend.
 */

// ==================== VALIDAÇÃO ====================

/**
 * Valida dados de entrada contra um schema
 * @param {Object} schema - Schema de validação
 * @param {Object} data - Dados a serem validados
 * @returns {Object} Resultado da validação
 */
function validateRequest(schema, data) {
  const errors = [];
  const missingFields = [];
  const warnings = [];
  
  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];
    
    // Campo obrigatório
    if (rules.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
      missingFields.push(field);
      continue;
    }
    
    // Se campo não é obrigatório e está vazio, aplicar default se existir
    if (!value && !rules.required) {
      if (rules.default !== undefined) {
        data[field] = rules.default;
      }
      continue;
    }
    
    // Validação de tipo
    if (rules.type && typeof value !== rules.type) {
      errors.push(`${field} deve ser do tipo ${rules.type}`);
      continue;
    }
    
    // Validação de string
    if (rules.type === 'string' && typeof value === 'string') {
      if (rules.minLength && value.length < rules.minLength) {
        errors.push(`${field} deve ter pelo menos ${rules.minLength} caracteres`);
      }
      if (rules.maxLength && value.length > rules.maxLength) {
        errors.push(`${field} deve ter no máximo ${rules.maxLength} caracteres`);
      }
      if (rules.pattern && !new RegExp(rules.pattern).test(value)) {
        errors.push(`${field} não atende ao padrão exigido`);
      }
    }
    
    // Validação de número
    if (rules.type === 'number' && typeof value === 'number') {
      if (rules.min !== undefined && value < rules.min) {
        errors.push(`${field} deve ser pelo menos ${rules.min}`);
      }
      if (rules.max !== undefined && value > rules.max) {
        errors.push(`${field} deve ser no máximo ${rules.max}`);
      }
    }
    
    // Validação de array
    if (rules.type === 'array' && Array.isArray(value)) {
      if (rules.minItems && value.length < rules.minItems) {
        errors.push(`${field} deve ter pelo menos ${rules.minItems} itens`);
      }
      if (rules.maxItems && value.length > rules.maxItems) {
        errors.push(`${field} deve ter no máximo ${rules.maxItems} itens`);
      }
    }
    
    // Validação de enum
    if (rules.enum && !rules.enum.includes(value)) {
      errors.push(`${field} deve ser um dos valores: ${rules.enum.join(', ')}`);
    }
    
    // Validação de email
    if (rules.format === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        errors.push(`${field} deve ser um email válido`);
      }
    }
    
    // Validação de URL
    if (rules.format === 'url') {
      try {
        new URL(value);
      } catch {
        errors.push(`${field} deve ser uma URL válida`);
      }
    }
    
    // Validação de data
    if (rules.format === 'date') {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        errors.push(`${field} deve ser uma data válida`);
      }
    }
    
    // Validação customizada
    if (rules.custom && typeof rules.custom === 'function') {
      const customResult = rules.custom(value, data);
      if (customResult !== true) {
        errors.push(customResult || `${field} não passou na validação customizada`);
      }
    }
    
    // Warnings para campos depreciados
    if (rules.deprecated) {
      warnings.push(`${field} está depreciado: ${rules.deprecated}`);
    }
  }
  
  return {
    isValid: missingFields.length === 0 && errors.length === 0,
    missingFields,
    errors,
    warnings,
    data // Dados possivelmente modificados (defaults aplicados)
  };
}

/**
 * Schemas de validação comuns
 */
const commonSchemas = {
  id: {
    type: 'string',
    required: true,
    pattern: '^[0-9a-fA-F]{24}$' // ObjectId MongoDB
  },
  
  pagination: {
    page: {
      type: 'number',
      required: false,
      min: 1,
      default: 1
    },
    limit: {
      type: 'number',
      required: false,
      min: 1,
      max: 100,
      default: 10
    }
  },
  
  search: {
    q: {
      type: 'string',
      required: false,
      minLength: 2,
      maxLength: 100
    }
  },
  
  user: {
    username: {
      type: 'string',
      required: true,
      minLength: 3,
      maxLength: 30,
      pattern: '^[a-zA-Z0-9_]+$'
    },
    email: {
      type: 'string',
      required: true,
      format: 'email',
      maxLength: 100
    },
    password: {
      type: 'string',
      required: true,
      minLength: 8,
      pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)[a-zA-Z\\d@$!%*?&]{8,}$'
    },
    name: {
      type: 'string',
      required: true,
      minLength: 2,
      maxLength: 100
    },
    role: {
      type: 'string',
      enum: ['admin', 'manager', 'user'],
      default: 'user'
    }
  }
};

// ==================== RESPOSTAS PADRONIZADAS ====================

/**
 * Códigos de status HTTP padronizados
 */
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
};

/**
 * Envia resposta padronizada
 * @param {Object} res - Objeto response do Express
 * @param {number} statusCode - Código de status HTTP
 * @param {*} data - Dados a serem enviados
 * @param {string} message - Mensagem personalizada
 * @param {string} error - Mensagem de erro
 * @param {Object} meta - Metadados adicionais
 * @returns {Object} Response
 */
function sendResponse(res, statusCode, data = null, message = '', error = null, meta = {}) {
  const response = {
    success: statusCode < 400,
    timestamp: new Date().toISOString(),
    requestId: res.locals.requestId || generateRequestId()
  };
  
  if (response.success) {
    response.data = data;
    response.message = message || 'Operação realizada com sucesso';
    
    if (Object.keys(meta).length > 0) {
      response.meta = meta;
    }
  } else {
    response.error = error || 'Erro na operação';
    response.code = getErrorCode(statusCode);
    
    if (data) {
      response.details = data;
    }
  }
  
  return res.status(statusCode).json(response);
}

/**
 * Gera código de erro baseado no status HTTP
 * @param {number} statusCode 
 * @returns {string}
 */
function getErrorCode(statusCode) {
  const codes = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    422: 'VALIDATION_ERROR',
    429: 'RATE_LIMIT_EXCEEDED',
    500: 'INTERNAL_ERROR',
    503: 'SERVICE_UNAVAILABLE'
  };
  
  return codes[statusCode] || 'UNKNOWN_ERROR';
}

/**
 * Gera ID único para requisição
 * @returns {string}
 */
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ==================== SANITIZAÇÃO ====================

/**
 * Remove tags HTML e caracteres perigosos
 * @param {string} input 
 * @returns {string}
 */
function sanitizeHtml(input) {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .trim();
}

/**
 * Sanitiza input para prevenir injection
 * @param {*} input 
 * @returns {*}
 */
function sanitizeInput(input) {
  if (typeof input === 'string') {
    return sanitizeHtml(input);
  }
  
  if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  }
  
  if (input && typeof input === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  
  return input;
}

/**
 * Remove campos sensíveis de um objeto
 * @param {Object} obj 
 * @param {Array} sensitiveFields 
 * @returns {Object}
 */
function removeSensitiveFields(obj, sensitiveFields = ['password', 'token', 'secret']) {
  if (!obj || typeof obj !== 'object') return obj;
  
  const cleaned = { ...obj };
  
  for (const field of sensitiveFields) {
    delete cleaned[field];
  }
  
  return cleaned;
}

// ==================== PAGINAÇÃO ====================

/**
 * Cria objeto de paginação padronizado
 * @param {number} page 
 * @param {number} limit 
 * @param {number} total 
 * @returns {Object}
 */
function createPagination(page, limit, total) {
  const totalPages = Math.ceil(total / limit);
  
  return {
    currentPage: page,
    totalPages,
    totalItems: total,
    itemsPerPage: limit,
    hasNext: page < totalPages,
    hasPrev: page > 1,
    nextPage: page < totalPages ? page + 1 : null,
    prevPage: page > 1 ? page - 1 : null
  };
}

/**
 * Extrai parâmetros de paginação da query
 * @param {Object} query 
 * @returns {Object}
 */
function extractPagination(query) {
  const page = parseInt(query.page) || 1;
  const limit = Math.min(parseInt(query.limit) || 10, 100); // Máximo 100 itens
  const skip = (page - 1) * limit;
  
  return { page, limit, skip };
}

// ==================== LOGGING ====================

/**
 * Logger estruturado
 */
const logger = {
  info: (message, data = null) => {
    console.log(`ℹ️  [INFO] ${new Date().toISOString()} - ${message}`, 
      data ? JSON.stringify(data, null, 2) : '');
  },
  
  error: (message, error = null) => {
    console.error(`❌ [ERROR] ${new Date().toISOString()} - ${message}`, 
      error ? (error.stack || error) : '');
  },
  
  warn: (message, data = null) => {
    console.warn(`⚠️  [WARN] ${new Date().toISOString()} - ${message}`, 
      data ? JSON.stringify(data, null, 2) : '');
  },
  
  debug: (message, data = null) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`🔍 [DEBUG] ${new Date().toISOString()} - ${message}`, 
        data ? JSON.stringify(data, null, 2) : '');
    }
  },
  
  http: (req, res, duration) => {
    const statusEmoji = res.statusCode >= 400 ? '❌' : '✅';
    const method = req.method;
    const url = req.originalUrl || req.url;
    const status = res.statusCode;
    const ip = req.ip || req.connection.remoteAddress;
    
    console.log(`${statusEmoji} [HTTP] ${method} ${url} - ${status} - ${duration}ms - ${ip}`);
  }
};

// ==================== UTILITÁRIOS GERAIS ====================

/**
 * Aguarda por um período determinado
 * @param {number} ms 
 * @returns {Promise}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Gera slug amigável para URLs
 * @param {string} text 
 * @returns {string}
 */
function generateSlug(text) {
  if (!text) return '';
  
  return text
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^\w\s-]/g, '') // Remove caracteres especiais
    .replace(/[\s_-]+/g, '-') // Substitui espaços por hífens
    .replace(/^-+|-+$/g, ''); // Remove hífens no início e fim
}

/**
 * Capitaliza primeira letra de cada palavra
 * @param {string} text 
 * @returns {string}
 */
function capitalizeWords(text) {
  if (!text) return '';
  
  return text
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Formata número como moeda brasileira
 * @param {number} value 
 * @returns {string}
 */
function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

/**
 * Formata data para padrão brasileiro
 * @param {Date|string} date 
 * @returns {string}
 */
function formatDate(date) {
  if (!date) return '';
  
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(new Date(date));
}

/**
 * Formata data e hora para padrão brasileiro
 * @param {Date|string} date 
 * @returns {string}
 */
function formatDateTime(date) {
  if (!date) return '';
  
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(date));
}

/**
 * Verifica se um valor é um ObjectId válido do MongoDB
 * @param {string} id 
 * @returns {boolean}
 */
function isValidObjectId(id) {
  if (!id || typeof id !== 'string') return false;
  return /^[0-9a-fA-F]{24}$/.test(id);
}

/**
 * Gera senha aleatória segura
 * @param {number} length 
 * @returns {string}
 */
function generateSecurePassword(length = 12) {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@$!%*?&';
  let password = '';
  
  // Garantir pelo menos um de cada tipo
  password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]; // minúscula
  password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]; // maiúscula
  password += '0123456789'[Math.floor(Math.random() * 10)]; // número
  password += '@$!%*?&'[Math.floor(Math.random() * 7)]; // especial
  
  // Completar o restante
  for (let i = password.length; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)];
  }
  
  // Embaralhar
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * Debounce function para limitar execuções
 * @param {Function} func 
 * @param {number} wait 
 * @returns {Function}
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// ==================== MIDDLEWARE HELPERS ====================

/**
 * Middleware para adicionar request ID
 */
function requestIdMiddleware(req, res, next) {
  res.locals.requestId = generateRequestId();
  req.requestId = res.locals.requestId;
  next();
}

/**
 * Middleware para logging de requests
 */
function requestLoggingMiddleware(req, res, next) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.http(req, res, duration);
  });
  
  next();
}

/**
 * Middleware para sanitizar body da requisição
 */
function sanitizeBodyMiddleware(req, res, next) {
  if (req.body) {
    req.body = sanitizeInput(req.body);
  }
  next();
}

// ==================== EXPORTS ====================

module.exports = {
  // Validação
  validateRequest,
  commonSchemas,
  
  // Respostas
  sendResponse,
  HTTP_STATUS,
  getErrorCode,
  generateRequestId,
  
  // Sanitização
  sanitizeHtml,
  sanitizeInput,
  removeSensitiveFields,
  
  // Paginação
  createPagination,
  extractPagination,
  
  // Logging
  logger,
  
  // Utilitários gerais
  sleep,
  generateSlug,
  capitalizeWords,
  formatCurrency,
  formatDate,
  formatDateTime,
  isValidObjectId,
  generateSecurePassword,
  debounce,
  
  // Middlewares
  requestIdMiddleware,
  requestLoggingMiddleware,
  sanitizeBodyMiddleware
};

// ==================== EXEMPLO DE USO ====================

/*
const { validateRequest, sendResponse, HTTP_STATUS, logger, commonSchemas } = require('./utils/standardUtils');

// Validação
const userSchema = {
  ...commonSchemas.user,
  department: {
    type: 'string',
    required: false,
    maxLength: 50,
    default: 'Geral'
  }
};

const validation = validateRequest(userSchema, req.body);
if (!validation.isValid) {
  return sendResponse(res, HTTP_STATUS.BAD_REQUEST, {
    missingFields: validation.missingFields,
    errors: validation.errors
  }, '', 'Erro de validação');
}

// Resposta de sucesso
return sendResponse(res, HTTP_STATUS.CREATED, user, 'Usuário criado com sucesso');

// Logging
logger.info('Usuário criado', { userId: user._id, username: user.username });
*/
