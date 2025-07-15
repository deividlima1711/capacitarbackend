// src/utils/constants.js

// Status padrão para diferentes entidades
const STATUS = {
  USER: {
    ACTIVE: 'ACTIVE',
    INACTIVE: 'INACTIVE',
    PENDING: 'PENDING',
    SUSPENDED: 'SUSPENDED'
  },
  PROCESS: {
    PENDING: 'PENDENTE',
    IN_PROGRESS: 'EM_ANDAMENTO',
    COMPLETED: 'CONCLUIDO',
    CANCELLED: 'CANCELADO'
  },
  TASK: {
    PENDING: 'PENDENTE',
    IN_PROGRESS: 'EM_ANDAMENTO',
    COMPLETED: 'CONCLUIDA',
    CANCELLED: 'CANCELADA'
  }
};

// Prioridades
const PRIORITY = {
  LOW: 'BAIXA',
  MEDIUM: 'MEDIA',
  HIGH: 'ALTA',
  URGENT: 'URGENTE'
};

// Roles de usuário
const USER_ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  USER: 'user',
  VIEWER: 'viewer'
};

// Configurações de paginação
const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100
};

// Configurações JWT
const JWT_CONFIG = {
  EXPIRES_IN: '24h',
  REFRESH_EXPIRES_IN: '7d',
  ISSUER: 'processflow-api',
  AUDIENCE: 'processflow-app'
};

// Rate limiting
const RATE_LIMITS = {
  GENERAL: {
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100
  },
  AUTH: {
    windowMs: 15 * 60 * 1000,
    max: 5 // tentativas de login
  },
  STRICT: {
    windowMs: 60 * 1000, // 1 minuto
    max: 10
  }
};

// Configurações de validação
const VALIDATION = {
  PASSWORD: {
    MIN_LENGTH: 6,
    REGEX: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/
  },
  USERNAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 30,
    REGEX: /^[a-zA-Z0-9_]+$/
  },
  TEXT_FIELDS: {
    TITLE_MAX: 200,
    DESCRIPTION_MAX: 1000,
    COMMENT_MAX: 500,
    TAG_MAX: 50
  }
};

// Códigos de erro personalizados
const ERROR_CODES = {
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  DUPLICATE_RESOURCE: 'DUPLICATE_RESOURCE',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID'
};

// Configurações de email
const EMAIL_TEMPLATES = {
  WELCOME: 'welcome',
  PASSWORD_RESET: 'password-reset',
  TASK_ASSIGNED: 'task-assigned',
  PROCESS_COMPLETED: 'process-completed'
};

module.exports = {
  STATUS,
  PRIORITY,
  USER_ROLES,
  PAGINATION,
  JWT_CONFIG,
  RATE_LIMITS,
  VALIDATION,
  ERROR_CODES,
  EMAIL_TEMPLATES
};
