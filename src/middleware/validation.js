// src/middleware/validation.js

const { validationResult } = require('express-validator');
const ApiResponse = require('../utils/responses');
const { logger } = require('../utils/logger');

/**
 * Middleware principal para processar resultados de validação
 */
const validateRequest = (req, res, next) => {
  const startTime = Date.now();
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorDetails = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value,
      location: error.location
    }));

    logger.warn('Validação falhou', {
      url: req.url,
      method: req.method,
      user: req.user?.username,
      errors: errorDetails,
      body: process.env.NODE_ENV === 'development' ? req.body : undefined
    });

    return ApiResponse.validationError(
      res, 
      errorDetails, 
      'Dados inválidos'
    );
  }

  const duration = Date.now() - startTime;
  logger.debug('Validação passou', {
    url: req.url,
    method: req.method,
    user: req.user?.username,
    duration
  });

  next();
};

/**
 * Middleware para validar parâmetros de paginação
 */
const validatePagination = (req, res, next) => {
  const { page = 1, limit = 10 } = req.query;
  
  // Converter para números e validar
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  
  if (isNaN(pageNum) || pageNum < 1) {
    return ApiResponse.validationError(
      res,
      [{ field: 'page', message: 'Página deve ser um número maior que 0' }]
    );
  }
  
  if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
    return ApiResponse.validationError(
      res,
      [{ field: 'limit', message: 'Limite deve ser um número entre 1 e 100' }]
    );
  }
  
  // Adicionar valores validados ao req
  req.pagination = {
    page: pageNum,
    limit: limitNum
  };
  
  next();
};

/**
 * Middleware para validar ObjectId MongoDB
 */
const validateObjectId = (paramName = 'id') => {
  return (req, res, next) => {
    const id = req.params[paramName];
    
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      logger.warn('ID inválido fornecido', {
        paramName,
        id,
        url: req.url,
        user: req.user?.username
      });
      
      return ApiResponse.validationError(
        res,
        [{ field: paramName, message: 'ID deve ser um ObjectId válido' }]
      );
    }
    
    next();
  };
};

/**
 * Middleware para sanitizar strings de entrada
 */
const sanitizeStrings = (req, res, next) => {
  const sanitizeValue = (value) => {
    if (typeof value === 'string') {
      return value.trim();
    }
    if (Array.isArray(value)) {
      return value.map(sanitizeValue);
    }
    if (value && typeof value === 'object') {
      const sanitized = {};
      for (const [key, val] of Object.entries(value)) {
        sanitized[key] = sanitizeValue(val);
      }
      return sanitized;
    }
    return value;
  };

  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeValue(req.body);
  }

  next();
};

/**
 * Middleware para validar Content-Type em requisições POST/PUT
 */
const validateContentType = (req, res, next) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.get('Content-Type');
    
    if (!contentType || !contentType.includes('application/json')) {
      return ApiResponse.validationError(
        res,
        [{ field: 'Content-Type', message: 'Content-Type deve ser application/json' }]
      );
    }
  }
  
  next();
};

/**
 * Middleware para validar tamanho do body
 */
const validateBodySize = (maxSizeKB = 1024) => {
  return (req, res, next) => {
    const bodySize = JSON.stringify(req.body || {}).length;
    const maxSizeBytes = maxSizeKB * 1024;
    
    if (bodySize > maxSizeBytes) {
      logger.warn('Body muito grande', {
        size: bodySize,
        maxSize: maxSizeBytes,
        url: req.url,
        user: req.user?.username
      });
      
      return ApiResponse.validationError(
        res,
        [{ field: 'body', message: `Dados muito grandes. Máximo: ${maxSizeKB}KB` }]
      );
    }
    
    next();
  };
};

/**
 * Middleware para validar campos obrigatórios dinamicamente
 */
const requireFields = (fields) => {
  return (req, res, next) => {
    const missingFields = [];
    
    fields.forEach(field => {
      const value = req.body[field];
      if (value === undefined || value === null || value === '') {
        missingFields.push({
          field,
          message: `${field} é obrigatório`
        });
      }
    });
    
    if (missingFields.length > 0) {
      return ApiResponse.validationError(
        res,
        missingFields,
        'Campos obrigatórios ausentes'
      );
    }
    
    next();
  };
};

/**
 * Middleware para validar enum values
 */
const validateEnum = (field, allowedValues, required = false) => {
  return (req, res, next) => {
    const value = req.body[field];
    
    if (!required && (value === undefined || value === null)) {
      return next();
    }
    
    if (required && (value === undefined || value === null || value === '')) {
      return ApiResponse.validationError(
        res,
        [{ field, message: `${field} é obrigatório` }]
      );
    }
    
    if (value && !allowedValues.includes(value)) {
      return ApiResponse.validationError(
        res,
        [{ 
          field, 
          message: `${field} deve ser um dos valores: ${allowedValues.join(', ')}`,
          value 
        }]
      );
    }
    
    next();
  };
};

/**
 * Middleware para log de validações (development only)
 */
const logValidation = (req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    logger.debug('Validação de entrada', {
      url: req.url,
      method: req.method,
      body: req.body,
      params: req.params,
      query: req.query,
      user: req.user?.username
    });
  }
  
  next();
};

module.exports = {
  validateRequest,
  validatePagination,
  validateObjectId,
  sanitizeStrings,
  validateContentType,
  validateBodySize,
  requireFields,
  validateEnum,
  logValidation
};
