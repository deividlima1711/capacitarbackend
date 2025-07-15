// src/utils/validators.js

const { body, query, param } = require('express-validator');
const { VALIDATION, STATUS, PRIORITY, USER_ROLES } = require('./constants');

/**
 * Validações comuns reutilizáveis
 */

// Validação de ID MongoDB
const mongoIdValidation = (field = 'id') => {
  return param(field)
    .isMongoId()
    .withMessage(`${field} deve ser um ID válido`);
};

// Validação de email
const emailValidation = (field = 'email', required = true) => {
  const validator = body(field);
  
  if (required) {
    validator.notEmpty().withMessage('Email é obrigatório');
  }
  
  return validator
    .isEmail()
    .withMessage('Email inválido')
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage('Email deve ter no máximo 255 caracteres');
};

// Validação de senha
const passwordValidation = (field = 'password', required = true) => {
  const validator = body(field);
  
  if (required) {
    validator.notEmpty().withMessage('Senha é obrigatória');
  }
  
  return validator
    .isLength({ min: VALIDATION.PASSWORD.MIN_LENGTH })
    .withMessage(`Senha deve ter pelo menos ${VALIDATION.PASSWORD.MIN_LENGTH} caracteres`)
    .matches(VALIDATION.PASSWORD.REGEX)
    .withMessage('Senha deve conter ao menos uma letra minúscula, maiúscula e um número');
};

// Validação de username
const usernameValidation = (field = 'username', required = true) => {
  const validator = body(field);
  
  if (required) {
    validator.notEmpty().withMessage('Username é obrigatório');
  }
  
  return validator
    .isLength({ 
      min: VALIDATION.USERNAME.MIN_LENGTH, 
      max: VALIDATION.USERNAME.MAX_LENGTH 
    })
    .withMessage(`Username deve ter entre ${VALIDATION.USERNAME.MIN_LENGTH} e ${VALIDATION.USERNAME.MAX_LENGTH} caracteres`)
    .matches(VALIDATION.USERNAME.REGEX)
    .withMessage('Username só pode conter letras, números e underscore');
};

// Validação de título
const titleValidation = (field = 'title', required = true) => {
  const validator = body(field);
  
  if (required) {
    validator.notEmpty().withMessage('Título é obrigatório');
  }
  
  return validator
    .trim()
    .isLength({ min: 1, max: VALIDATION.TEXT_FIELDS.TITLE_MAX })
    .withMessage(`Título deve ter entre 1 e ${VALIDATION.TEXT_FIELDS.TITLE_MAX} caracteres`);
};

// Validação de descrição
const descriptionValidation = (field = 'description', required = false) => {
  const validator = body(field);
  
  if (required) {
    validator.notEmpty().withMessage('Descrição é obrigatória');
  } else {
    validator.optional();
  }
  
  return validator
    .trim()
    .isLength({ max: VALIDATION.TEXT_FIELDS.DESCRIPTION_MAX })
    .withMessage(`Descrição deve ter no máximo ${VALIDATION.TEXT_FIELDS.DESCRIPTION_MAX} caracteres`);
};

// Validação de status
const statusValidation = (field = 'status', enumValues, required = false) => {
  const validator = body(field);
  
  if (required) {
    validator.notEmpty().withMessage('Status é obrigatório');
  } else {
    validator.optional();
  }
  
  return validator
    .isIn(Object.values(enumValues))
    .withMessage(`Status deve ser um dos: ${Object.values(enumValues).join(', ')}`);
};

// Validação de prioridade
const priorityValidation = (field = 'priority', required = false) => {
  return statusValidation(field, PRIORITY, required);
};

// Validação de role de usuário
const roleValidation = (field = 'role', required = false) => {
  return statusValidation(field, USER_ROLES, required);
};

// Validação de data
const dateValidation = (field, required = false) => {
  const validator = body(field);
  
  if (required) {
    validator.notEmpty().withMessage(`${field} é obrigatório`);
  } else {
    validator.optional();
  }
  
  return validator
    .isISO8601()
    .withMessage(`${field} deve ser uma data válida (ISO 8601)`)
    .toDate();
};

// Validação de array de IDs
const arrayOfIdsValidation = (field, required = false) => {
  const validator = body(field);
  
  if (required) {
    validator.notEmpty().withMessage(`${field} é obrigatório`);
  } else {
    validator.optional();
  }
  
  return validator
    .isArray()
    .withMessage(`${field} deve ser um array`)
    .custom((value) => {
      if (!Array.isArray(value)) return false;
      return value.every(id => /^[0-9a-fA-F]{24}$/.test(id));
    })
    .withMessage(`${field} deve conter apenas IDs válidos`);
};

// Validação de tags
const tagsValidation = (field = 'tags', required = false) => {
  const validator = body(field);
  
  if (required) {
    validator.notEmpty().withMessage('Tags são obrigatórias');
  } else {
    validator.optional();
  }
  
  return validator
    .isArray()
    .withMessage('Tags devem ser um array')
    .custom((tags) => {
      if (!Array.isArray(tags)) return false;
      return tags.every(tag => 
        typeof tag === 'string' && 
        tag.trim().length > 0 && 
        tag.length <= VALIDATION.TEXT_FIELDS.TAG_MAX
      );
    })
    .withMessage(`Cada tag deve ser uma string não vazia com no máximo ${VALIDATION.TEXT_FIELDS.TAG_MAX} caracteres`);
};

// Validação de paginação
const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Página deve ser um número inteiro maior que 0')
    .toInt(),
    
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limite deve ser um número entre 1 e 100')
    .toInt(),
    
  query('sort')
    .optional()
    .matches(/^-?[a-zA-Z_][a-zA-Z0-9_.]*$/)
    .withMessage('Ordenação deve ter formato válido (ex: createdAt, -createdAt)')
];

// Validações específicas por entidade
const userValidations = {
  create: [
    usernameValidation(),
    emailValidation(),
    passwordValidation(),
    body('name').optional().trim().isLength({ max: 100 }),
    roleValidation()
  ],
  
  update: [
    mongoIdValidation(),
    usernameValidation('username', false),
    emailValidation('email', false),
    body('name').optional().trim().isLength({ max: 100 }),
    roleValidation()
  ],
  
  changePassword: [
    mongoIdValidation(),
    passwordValidation('currentPassword'),
    passwordValidation('newPassword')
  ]
};

const processValidations = {
  create: [
    titleValidation(),
    descriptionValidation(),
    statusValidation('status', STATUS.PROCESS),
    priorityValidation(),
    body('responsible').isMongoId().withMessage('Responsável deve ser um ID válido'),
    arrayOfIdsValidation('team'),
    dateValidation('dueDate'),
    tagsValidation()
  ],
  
  update: [
    mongoIdValidation(),
    titleValidation('title', false),
    descriptionValidation(),
    statusValidation('status', STATUS.PROCESS),
    priorityValidation(),
    body('responsible').optional().isMongoId().withMessage('Responsável deve ser um ID válido'),
    arrayOfIdsValidation('team'),
    dateValidation('dueDate'),
    tagsValidation()
  ]
};

const taskValidations = {
  create: [
    titleValidation(),
    descriptionValidation(),
    statusValidation('status', STATUS.TASK),
    priorityValidation(),
    body('assignedTo').isMongoId().withMessage('Responsável deve ser um ID válido'),
    body('process').isMongoId().withMessage('Processo deve ser um ID válido'),
    dateValidation('dueDate'),
    body('estimatedHours').optional().isNumeric().withMessage('Horas estimadas devem ser um número'),
    tagsValidation()
  ],
  
  update: [
    mongoIdValidation(),
    titleValidation('title', false),
    descriptionValidation(),
    statusValidation('status', STATUS.TASK),
    priorityValidation(),
    body('assignedTo').optional().isMongoId().withMessage('Responsável deve ser um ID válido'),
    dateValidation('dueDate'),
    body('estimatedHours').optional().isNumeric().withMessage('Horas estimadas devem ser um número'),
    body('actualHours').optional().isNumeric().withMessage('Horas reais devem ser um número'),
    body('progress').optional().isInt({ min: 0, max: 100 }).withMessage('Progresso deve ser entre 0 e 100'),
    tagsValidation()
  ]
};

module.exports = {
  // Validações individuais
  mongoIdValidation,
  emailValidation,
  passwordValidation,
  usernameValidation,
  titleValidation,
  descriptionValidation,
  statusValidation,
  priorityValidation,
  roleValidation,
  dateValidation,
  arrayOfIdsValidation,
  tagsValidation,
  paginationValidation,
  
  // Validações por entidade
  userValidations,
  processValidations,
  taskValidations
};
