# Guia de Padronização - Backend ProcessFlow

## 📋 Índice
1. [Estrutura de Endpoints](#estrutura-de-endpoints)
2. [Schemas e Validação](#schemas-e-validação)
3. [Nomenclatura e Convenções](#nomenclatura-e-convenções)
4. [Respostas Padronizadas](#respostas-padronizadas)
5. [Tratamento de Erros](#tratamento-de-erros)
6. [Autenticação e Autorização](#autenticação-e-autorização)
7. [Logging e Debugging](#logging-e-debugging)
8. [Segurança](#segurança)
9. [Versionamento de API](#versionamento-de-api)
10. [Documentação](#documentação)

---

## 🎯 Estrutura de Endpoints

### Padrão de URLs
```
/api/v1/[recurso]/[ação]
```

### Verbos HTTP Padrão
- `GET /api/v1/users` - Listar todos os usuários
- `GET /api/v1/users/:id` - Obter usuário específico
- `POST /api/v1/users` - Criar novo usuário
- `PUT /api/v1/users/:id` - Atualizar usuário completo
- `PATCH /api/v1/users/:id` - Atualização parcial
- `DELETE /api/v1/users/:id` - Remover usuário

### Ações Especiais
```javascript
// Ações customizadas sempre após o ID
POST /api/v1/users/:id/activate
POST /api/v1/users/:id/reset-password
GET /api/v1/users/:id/tasks
```

---

## 🔧 Schemas e Validação

### Schema Base para Validação
```javascript
const createUserSchema = {
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
    format: 'email'
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
  },
  department: {
    type: 'string',
    maxLength: 50,
    default: 'Geral'
  }
};
```

### Função de Validação Padrão
```javascript
function validateRequest(schema, data) {
  const errors = [];
  const missingFields = [];
  
  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];
    
    // Campo obrigatório
    if (rules.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
      missingFields.push(field);
      continue;
    }
    
    // Se campo não é obrigatório e está vazio, pular validação
    if (!value && !rules.required) continue;
    
    // Validação de tipo
    if (rules.type && typeof value !== rules.type) {
      errors.push(`${field} deve ser do tipo ${rules.type}`);
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
  }
  
  return {
    isValid: missingFields.length === 0 && errors.length === 0,
    missingFields,
    errors
  };
}
```

---

## 📝 Nomenclatura e Convenções

### Variáveis e Funções
```javascript
// ✅ Correto - camelCase
const userName = 'john_doe';
const isUserActive = true;
const getUserById = async (id) => {};

// ❌ Incorreto
const user_name = 'john_doe';  // snake_case
const IsUserActive = true;     // PascalCase
```

### Constantes
```javascript
// ✅ Correto - SCREAMING_SNAKE_CASE
const MAX_LOGIN_ATTEMPTS = 3;
const JWT_EXPIRATION_TIME = '24h';
const USER_ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  USER: 'user'
};
```

### Mensagens de Log
```javascript
// ✅ Padrão de emojis para logs
console.log('🚀 Iniciando aplicação...');
console.log('📝 Criando novo usuário');
console.log('✅ Operação realizada com sucesso');
console.log('❌ Erro na validação');
console.log('🔍 Buscando usuário');
console.log('🔑 Autenticando usuário');
console.log('💾 Salvando no banco de dados');
console.log('📧 Enviando email');
```

---

## 📤 Respostas Padronizadas

### Estrutura Base de Resposta
```javascript
// Sucesso
{
  "success": true,
  "data": { ... },
  "message": "Operação realizada com sucesso",
  "timestamp": "2024-01-01T00:00:00.000Z"
}

// Erro
{
  "success": false,
  "error": "Mensagem de erro clara",
  "code": "ERROR_CODE",
  "details": { ... },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Códigos de Status HTTP
```javascript
const HTTP_STATUS = {
  OK: 200,                    // Sucesso geral
  CREATED: 201,              // Recurso criado
  NO_CONTENT: 204,           // Sucesso sem conteúdo
  BAD_REQUEST: 400,          // Erro de validação/sintaxe
  UNAUTHORIZED: 401,         // Não autenticado
  FORBIDDEN: 403,            // Sem permissão
  NOT_FOUND: 404,            // Recurso não encontrado
  CONFLICT: 409,             // Conflito (ex: email já existe)
  UNPROCESSABLE_ENTITY: 422, // Erro de validação semântica
  INTERNAL_SERVER_ERROR: 500 // Erro interno
};
```

### Função de Resposta Padrão
```javascript
const sendResponse = (res, statusCode, data = null, message = '', error = null) => {
  const response = {
    success: statusCode < 400,
    timestamp: new Date().toISOString()
  };
  
  if (response.success) {
    response.data = data;
    response.message = message || 'Operação realizada com sucesso';
  } else {
    response.error = error || 'Erro na operação';
    if (data) response.details = data;
  }
  
  return res.status(statusCode).json(response);
};
```

---

## 🚨 Tratamento de Erros

### Middleware Global de Erro
```javascript
const globalErrorHandler = (error, req, res, next) => {
  console.error('🚨 Erro capturado:', error);
  
  let statusCode = 500;
  let message = 'Erro interno do servidor';
  let details = null;
  
  // Erro de validação do Mongoose
  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Erro de validação';
    details = Object.values(error.errors).map(e => e.message);
  }
  
  // Erro de chave duplicada (MongoDB)
  if (error.code === 11000) {
    statusCode = 409;
    message = 'Recurso já existe';
    const field = Object.keys(error.keyPattern)[0];
    details = `${field} já está em uso`;
  }
  
  // Erro de JWT
  if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Token inválido';
  }
  
  // Erro de cast (ID inválido)
  if (error.name === 'CastError') {
    statusCode = 400;
    message = 'ID inválido';
  }
  
  sendResponse(res, statusCode, details, '', message);
};
```

---

## 🔐 Autenticação e Autorização

### Middleware de Autenticação
```javascript
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return sendResponse(res, 401, null, '', 'Token de acesso necessário');
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user || !user.isActive) {
      return sendResponse(res, 401, null, '', 'Usuário não encontrado ou inativo');
    }
    
    req.user = user;
    next();
  } catch (error) {
    return sendResponse(res, 401, null, '', 'Token inválido');
  }
};
```

### Middleware de Autorização por Role
```javascript
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendResponse(res, 401, null, '', 'Usuário não autenticado');
    }
    
    if (!roles.includes(req.user.role)) {
      return sendResponse(res, 403, null, '', 'Acesso negado');
    }
    
    next();
  };
};

// Uso: router.post('/users', auth, authorize('admin'), createUser);
```

---

## 📊 Logging e Debugging

### Padrão de Logs
```javascript
const logger = {
  info: (message, data = null) => {
    console.log(`ℹ️  [INFO] ${new Date().toISOString()} - ${message}`, data ? JSON.stringify(data, null, 2) : '');
  },
  error: (message, error = null) => {
    console.error(`❌ [ERROR] ${new Date().toISOString()} - ${message}`, error ? error.stack : '');
  },
  warn: (message, data = null) => {
    console.warn(`⚠️  [WARN] ${new Date().toISOString()} - ${message}`, data ? JSON.stringify(data, null, 2) : '');
  },
  debug: (message, data = null) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`🔍 [DEBUG] ${new Date().toISOString()} - ${message}`, data ? JSON.stringify(data, null, 2) : '');
    }
  }
};
```

### Middleware de Request Logging
```javascript
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusEmoji = res.statusCode >= 400 ? '❌' : '✅';
    
    logger.info(`${statusEmoji} ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      body: req.method !== 'GET' ? req.body : undefined
    });
  });
  
  next();
};
```

---

## 🛡️ Segurança

### Headers de Segurança
```javascript
const securityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
};
```

### Sanitização de Dados
```javascript
const sanitizeInput = (input) => {
  if (typeof input === 'string') {
    return input.trim().replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  }
  return input;
};

const sanitizeBody = (req, res, next) => {
  if (req.body) {
    for (const key in req.body) {
      req.body[key] = sanitizeInput(req.body[key]);
    }
  }
  next();
};
```

---

## 📄 Versionamento de API

### Estratégia de Versioning
```javascript
// Versioning por URL
app.use('/api/v1', v1Routes);
app.use('/api/v2', v2Routes);

// Header para versão
const versionMiddleware = (req, res, next) => {
  const version = req.header('API-Version') || 'v1';
  req.apiVersion = version;
  next();
};
```

### Deprecação de Endpoints
```javascript
const deprecated = (version, message) => {
  return (req, res, next) => {
    res.setHeader('X-API-Deprecated', 'true');
    res.setHeader('X-API-Deprecated-Version', version);
    res.setHeader('X-API-Deprecated-Message', message);
    
    logger.warn(`Endpoint depreciado acessado: ${req.path}`, {
      version,
      message,
      ip: req.ip
    });
    
    next();
  };
};
```

---

## 📚 Documentação

### Comentários JSDoc
```javascript
/**
 * Cria um novo usuário no sistema
 * @route POST /api/v1/users
 * @param {Object} req.body - Dados do usuário
 * @param {string} req.body.username - Nome de usuário único
 * @param {string} req.body.email - Email válido
 * @param {string} req.body.password - Senha com mínimo 8 caracteres
 * @param {string} req.body.name - Nome completo
 * @param {string} [req.body.role=user] - Role do usuário (admin, manager, user)
 * @param {string} [req.body.department=Geral] - Departamento
 * @returns {Object} 201 - Usuário criado com sucesso
 * @returns {Object} 400 - Erro de validação
 * @returns {Object} 409 - Username ou email já existe
 * @returns {Object} 500 - Erro interno do servidor
 * @security Bearer
 * @example
 * // Exemplo de request
 * {
 *   "username": "joao123",
 *   "email": "joao@empresa.com",
 *   "password": "MinhaSenh@123",
 *   "name": "João Silva",
 *   "role": "user",
 *   "department": "TI"
 * }
 * 
 * // Exemplo de response
 * {
 *   "success": true,
 *   "data": {
 *     "_id": "60d5ec49f1b2c8b1f8e4e123",
 *     "username": "joao123",
 *     "email": "joao@empresa.com",
 *     "name": "João Silva",
 *     "role": "user",
 *     "department": "TI",
 *     "isActive": true,
 *     "createdAt": "2024-01-01T00:00:00.000Z"
 *   },
 *   "message": "Usuário criado com sucesso"
 * }
 */
```

### Schema de Documentação de Endpoint
```markdown
## POST /api/v1/users

### Descrição
Cria um novo usuário no sistema. Apenas administradores podem criar usuários.

### Autenticação
Bearer Token (Admin)

### Parâmetros de Entrada
| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| username | string | Sim | Nome de usuário único (3-30 chars, apenas alfanumérico e _) |
| email | string | Sim | Email válido |
| password | string | Sim | Senha (mín. 8 chars, deve conter maiúscula, minúscula e número) |
| name | string | Sim | Nome completo (2-100 chars) |
| role | string | Não | Role do usuário (admin/manager/user). Padrão: user |
| department | string | Não | Departamento. Padrão: Geral |

### Respostas

#### 201 - Usuário criado com sucesso
```json
{
  "success": true,
  "data": {
    "_id": "60d5ec49f1b2c8b1f8e4e123",
    "username": "joao123",
    "email": "joao@empresa.com",
    "name": "João Silva",
    "role": "user",
    "department": "TI",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Usuário criado com sucesso"
}
```

#### 400 - Erro de validação
```json
{
  "success": false,
  "error": "Campos obrigatórios ausentes: username, email",
  "details": {
    "received": {
      "username": false,
      "password": true,
      "name": true,
      "email": false
    }
  }
}
```
```

---

## 🎯 Próximos Passos

1. **Implementar validação centralizada** usando o sistema de schemas
2. **Padronizar todas as respostas** usando a função `sendResponse`
3. **Adicionar documentação JSDoc** em todos os endpoints
4. **Implementar sistema de logs estruturado**
5. **Criar testes automatizados** para todos os endpoints
6. **Configurar CI/CD** com validação de padrões
