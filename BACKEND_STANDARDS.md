# 📋 Guia de Padronização - Backend ProcessFlow

## 🎯 Objetivo
Este documento estabelece padrões e diretrizes para desenvolvimento, manutenção e evolução do backend ProcessFlow, garantindo código consistente, seguro e escalável.

## 📁 Estrutura de Arquivos

```
/
├── app.js                 # Ponto de entrada da aplicação
├── package.json          # Dependências e scripts
├── .env                  # Variáveis de ambiente
├── README.md             # Documentação do projeto
├── BACKEND_STANDARDS.md  # Este documento
├── scripts/              # Scripts utilitários
│   ├── create-admin.js
│   ├── create-users.js
│   └── test-connection.js
└── src/
    ├── middleware/       # Middlewares personalizados
    │   ├── auth.js
    │   ├── validation.js
    │   └── errorHandler.js
    ├── models/          # Schemas Mongoose
    │   ├── User.js
    │   ├── Process.js
    │   └── Task.js
    ├── routes/          # Rotas da API
    │   ├── auth.js
    │   ├── users.js
    │   ├── processes.js
    │   └── tasks.js
    ├── utils/           # Utilitários e helpers
    │   ├── constants.js
    │   ├── validators.js
    │   └── helpers.js
    └── config/          # Configurações
        ├── database.js
        └── cors.js
```

## 🔗 Padrões de Endpoints

### 1. Nomenclatura de URLs
- **Formato**: `/api/v1/{resource}/{id?}/{action?}`
- **Recursos no plural**: `/users`, `/processes`, `/tasks`
- **Ações específicas**: `/users/{id}/activate`, `/processes/{id}/comments`
- **Versionamento**: Sempre incluir versão (`/api/v1/`)

### 2. Métodos HTTP
- **GET**: Buscar recursos (lista ou item específico)
- **POST**: Criar novos recursos
- **PUT**: Atualizar recurso completo
- **PATCH**: Atualização parcial
- **DELETE**: Remover recurso

### 3. Códigos de Status HTTP

```javascript
// Sucesso
200 // OK - Operação bem-sucedida
201 // Created - Recurso criado
204 // No Content - Operação sem retorno

// Erro do Cliente
400 // Bad Request - Dados inválidos
401 // Unauthorized - Não autenticado
403 // Forbidden - Sem permissão
404 // Not Found - Recurso não encontrado
409 // Conflict - Conflito de dados
422 // Unprocessable Entity - Validação falhou

// Erro do Servidor
500 // Internal Server Error - Erro interno
503 // Service Unavailable - Serviço indisponível
```

### 4. Template de Rota Padrão

```javascript
const express = require('express');
const { auth, adminAuth } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const Model = require('../models/Model');

const router = express.Router();

// GET /api/v1/resource - Listar recursos
router.get('/', auth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      sort = '-createdAt',
      ...filters 
    } = req.query;

    // Log da operação
    console.log(`📋 Listando recursos - Usuário: ${req.user.username}`);

    // Construir query
    const query = buildQueryFilters(filters);
    
    // Executar consulta com paginação
    const resources = await Model.find(query)
      .populate('relatedField', 'name username email')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Model.countDocuments(query);

    // Resposta padronizada
    res.json({
      success: true,
      data: resources,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('❌ Erro ao listar recursos:', error.message);
    res.status(500).json({ 
      success: false,
      error: 'Erro interno do servidor',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/v1/resource/:id - Buscar recurso específico
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`🔍 Buscando recurso ${id} - Usuário: ${req.user.username}`);

    const resource = await Model.findById(id)
      .populate('relatedField', 'name username email');

    if (!resource) {
      return res.status(404).json({ 
        success: false,
        error: 'Recurso não encontrado' 
      });
    }

    res.json({
      success: true,
      data: resource
    });

  } catch (error) {
    console.error('❌ Erro ao buscar recurso:', error.message);
    res.status(500).json({ 
      success: false,
      error: 'Erro interno do servidor' 
    });
  }
});

// POST /api/v1/resource - Criar recurso
router.post('/', auth, validateRequest, async (req, res) => {
  try {
    console.log(`✨ Criando recurso - Usuário: ${req.user.username}`);

    const resourceData = {
      ...req.body,
      createdBy: req.user._id
    };

    const resource = new Model(resourceData);
    await resource.save();
    
    await resource.populate('relatedField', 'name username email');

    console.log(`✅ Recurso criado: ${resource._id}`);

    res.status(201).json({
      success: true,
      data: resource,
      message: 'Recurso criado com sucesso'
    });

  } catch (error) {
    console.error('❌ Erro ao criar recurso:', error.message);
    
    if (error.name === 'ValidationError') {
      return res.status(422).json({ 
        success: false,
        error: 'Dados inválidos',
        details: Object.values(error.errors).map(e => e.message)
      });
    }
    
    res.status(500).json({ 
      success: false,
      error: 'Erro interno do servidor' 
    });
  }
});

module.exports = router;
```

## 📊 Padrões de Schema (Mongoose)

### 1. Template Base de Schema

```javascript
const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema({
  // Campos obrigatórios
  title: {
    type: String,
    required: [true, 'Título é obrigatório'],
    trim: true,
    maxlength: [200, 'Título deve ter no máximo 200 caracteres']
  },
  
  // Campos opcionais
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Descrição deve ter no máximo 1000 caracteres']
  },
  
  // Enums
  status: {
    type: String,
    enum: {
      values: ['ACTIVE', 'INACTIVE', 'PENDING'],
      message: 'Status deve ser ACTIVE, INACTIVE ou PENDING'
    },
    default: 'PENDING'
  },
  
  // Referências
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Proprietário é obrigatório']
  },
  
  // Arrays
  tags: [{
    type: String,
    trim: true,
    maxlength: [50, 'Tag deve ter no máximo 50 caracteres']
  }],
  
  // Objetos aninhados
  metadata: {
    category: String,
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
      default: 'MEDIUM'
    }
  },
  
  // Timestamps automáticos
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true, // Adiciona createdAt e updatedAt automaticamente
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices para performance
resourceSchema.index({ status: 1, createdAt: -1 });
resourceSchema.index({ owner: 1 });
resourceSchema.index({ 'metadata.priority': 1 });

// Métodos virtuais
resourceSchema.virtual('isActive').get(function() {
  return this.status === 'ACTIVE';
});

// Métodos de instância
resourceSchema.methods.activate = function() {
  this.status = 'ACTIVE';
  return this.save();
};

// Métodos estáticos
resourceSchema.statics.findActive = function() {
  return this.find({ status: 'ACTIVE' });
};

// Middleware pre-save
resourceSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.updatedBy = this.constructor.currentUserId;
  }
  next();
});

// Middleware post-save
resourceSchema.post('save', function(doc) {
  console.log(`✅ Recurso salvo: ${doc._id}`);
});

module.exports = mongoose.model('Resource', resourceSchema);
```

### 2. Convenções de Nomenclatura

```javascript
// ✅ Correto
{
  firstName: String,        // camelCase para campos
  lastName: String,
  isActive: Boolean,
  createdAt: Date,
  userId: ObjectId,
  phoneNumber: String
}

// ❌ Incorreto
{
  first_name: String,       // snake_case
  LastName: String,         // PascalCase
  is_active: Boolean,
  created_at: Date,
  user_id: ObjectId,
  phone_number: String
}
```

## ✅ Validação e Tratamento de Erros

### 1. Middleware de Validação

```javascript
// src/middleware/validation.js
const { body, validationResult } = require('express-validator');

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    console.log('❌ Validação falhou:', errors.array());
    
    return res.status(422).json({
      success: false,
      error: 'Dados inválidos',
      details: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  
  next();
};

// Validações específicas
const userValidation = [
  body('username')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username deve ter entre 3 e 30 caracteres')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username só pode conter letras, números e underscore'),
    
  body('email')
    .isEmail()
    .withMessage('Email inválido')
    .normalizeEmail(),
    
  body('password')
    .isLength({ min: 6 })
    .withMessage('Senha deve ter pelo menos 6 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Senha deve conter ao menos uma letra minúscula, maiúscula e um número')
];

module.exports = { validateRequest, userValidation };
```

### 2. Handler Global de Erros

```javascript
// src/middleware/errorHandler.js
const errorHandler = (err, req, res, next) => {
  console.error('❌ Erro capturado:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.url,
    method: req.method,
    user: req.user?.username
  });

  // Erro do Mongoose - Validação
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(422).json({
      success: false,
      error: 'Dados inválidos',
      details: errors
    });
  }

  // Erro do Mongoose - Cast (ID inválido)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: 'ID inválido'
    });
  }

  // Erro de duplicação (chave única)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({
      success: false,
      error: `${field} já existe`
    });
  }

  // Erro JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Token inválido'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Token expirado'
    });
  }

  // Erro padrão
  res.status(err.statusCode || 500).json({
    success: false,
    error: err.message || 'Erro interno do servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;
```

## 🔐 Padrões de Segurança

### 1. Autenticação JWT

```javascript
// Configuração JWT
const JWT_CONFIG = {
  secret: process.env.JWT_SECRET,
  expiresIn: '24h',
  issuer: 'processflow-api',
  audience: 'processflow-app'
};

// Geração de token
const generateToken = (user) => {
  return jwt.sign(
    { 
      userId: user._id,
      username: user.username,
      role: user.role 
    },
    JWT_CONFIG.secret,
    {
      expiresIn: JWT_CONFIG.expiresIn,
      issuer: JWT_CONFIG.issuer,
      audience: JWT_CONFIG.audience
    }
  );
};
```

### 2. Middleware de Rate Limiting

```javascript
// app.js
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por IP
  message: {
    success: false,
    error: 'Muitas tentativas, tente novamente em 15 minutos'
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api', limiter);
```

### 3. Configuração CORS

```javascript
// src/config/cors.js
const corsConfig = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://capacitar-frontend.vercel.app',
      'https://processflow.company.com'
    ];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Não permitido pelo CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

module.exports = corsConfig;
```

## 📝 Padrões de Logging

### 1. Estrutura de Logs

```javascript
// Níveis de log
const LOG_LEVELS = {
  ERROR: '❌',
  WARN: '⚠️',
  INFO: 'ℹ️',
  SUCCESS: '✅',
  DEBUG: '🔍'
};

// Helper de logging
const logger = {
  error: (message, meta = {}) => {
    console.error(`${LOG_LEVELS.ERROR} ${message}`, meta);
  },
  warn: (message, meta = {}) => {
    console.warn(`${LOG_LEVELS.WARN} ${message}`, meta);
  },
  info: (message, meta = {}) => {
    console.log(`${LOG_LEVELS.INFO} ${message}`, meta);
  },
  success: (message, meta = {}) => {
    console.log(`${LOG_LEVELS.SUCCESS} ${message}`, meta);
  },
  debug: (message, meta = {}) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`${LOG_LEVELS.DEBUG} ${message}`, meta);
    }
  }
};
```

### 2. Logs em Operações

```javascript
// Exemplo de uso em rotas
router.post('/', auth, async (req, res) => {
  try {
    logger.info(`Criando recurso - Usuário: ${req.user.username}`);
    logger.debug('Dados recebidos:', req.body);
    
    const resource = await Model.create(req.body);
    
    logger.success(`Recurso criado: ${resource._id}`);
    
    res.status(201).json({
      success: true,
      data: resource
    });
    
  } catch (error) {
    logger.error('Erro ao criar recurso:', {
      message: error.message,
      user: req.user.username,
      data: req.body
    });
    
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});
```

## 🔄 Versionamento de API

### 1. Estrutura de Versões

```
/api/v1/users     # Versão atual
/api/v2/users     # Nova versão (quando necessário)
```

### 2. Migração de Versões

```javascript
// Middleware de versionamento
const apiVersion = (req, res, next) => {
  const version = req.headers['api-version'] || 'v1';
  req.apiVersion = version;
  next();
};

// Uso em rotas
app.use('/api/v1', require('./routes/v1'));
app.use('/api/v2', require('./routes/v2'));
```

## 📊 Padronização de Respostas

### 1. Estrutura de Resposta Padrão

```javascript
// Sucesso
{
  "success": true,
  "data": { /* dados */ },
  "message": "Operação realizada com sucesso",
  "pagination": { /* quando aplicável */ }
}

// Erro
{
  "success": false,
  "error": "Mensagem de erro",
  "details": [ /* detalhes quando aplicável */ ],
  "code": "ERROR_CODE" // opcional
}
```

### 2. Helper de Respostas

```javascript
// src/utils/responses.js
const responses = {
  success: (res, data, message = 'Sucesso', statusCode = 200) => {
    res.status(statusCode).json({
      success: true,
      data,
      message
    });
  },
  
  error: (res, error, statusCode = 500, details = null) => {
    res.status(statusCode).json({
      success: false,
      error,
      ...(details && { details })
    });
  },
  
  paginated: (res, data, pagination) => {
    res.json({
      success: true,
      data,
      pagination
    });
  }
};

module.exports = responses;
```

## 🧪 Padrões de Teste

### 1. Estrutura de Testes

```javascript
// tests/routes/users.test.js
const request = require('supertest');
const app = require('../../app');
const User = require('../../src/models/User');

describe('Users Routes', () => {
  beforeEach(async () => {
    await User.deleteMany({});
  });

  describe('POST /api/v1/users', () => {
    it('deve criar um novo usuário', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'Test123!'
      };

      const response = await request(app)
        .post('/api/v1/users')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.username).toBe(userData.username);
    });

    it('deve retornar erro para dados inválidos', async () => {
      const response = await request(app)
        .post('/api/v1/users')
        .send({})
        .expect(422);

      expect(response.body.success).toBe(false);
    });
  });
});
```

## 📚 Documentação de API

### 1. Swagger/OpenAPI

```javascript
// swagger.js
const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ProcessFlow API',
      version: '1.0.0',
      description: 'API para sistema de gestão de processos'
    },
    servers: [
      {
        url: 'http://localhost:5000/api/v1',
        description: 'Servidor de desenvolvimento'
      }
    ],
  },
  apis: ['./src/routes/*.js'],
};

const specs = swaggerJsdoc(options);
module.exports = specs;
```

### 2. Documentação inline

```javascript
/**
 * @swagger
 * /users:
 *   post:
 *     summary: Criar novo usuário
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 30
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       201:
 *         description: Usuário criado com sucesso
 *       422:
 *         description: Dados inválidos
 */
```

## ✅ Checklist para Pull Requests

### Código
- [ ] Seguiu os padrões de nomenclatura estabelecidos
- [ ] Implementou logging adequado
- [ ] Adicionou tratamento de erros
- [ ] Validação de entrada implementada
- [ ] Documentação inline (JSDoc/Swagger) adicionada

### Segurança
- [ ] Autenticação/autorização implementada
- [ ] Validação de permissões
- [ ] Sanitização de entrada
- [ ] Rate limiting considerado

### Banco de Dados
- [ ] Esquemas seguem padrões estabelecidos
- [ ] Índices necessários criados
- [ ] Relacionamentos definidos corretamente
- [ ] Validações no schema implementadas

### Testes
- [ ] Testes unitários escritos
- [ ] Casos de erro testados
- [ ] Testes de integração (quando necessário)
- [ ] Coverage de teste adequado

### Performance
- [ ] Queries otimizadas
- [ ] Paginação implementada (quando necessário)
- [ ] Population de campos essencial
- [ ] Caching considerado

### Documentação
- [ ] README atualizado (se necessário)
- [ ] Documentação da API atualizada
- [ ] Comentários explicativos em código complexo
- [ ] Changelog atualizado

## 🚀 Próximos Passos de Evolução

### 1. Implementações Recomendadas

#### Sistema de Cache (Redis)
```javascript
const redis = require('redis');
const client = redis.createClient(process.env.REDIS_URL);

const cache = {
  get: async (key) => {
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  },
  
  set: async (key, data, ttl = 3600) => {
    await client.setex(key, ttl, JSON.stringify(data));
  }
};
```

#### Sistema de Filas (Bull)
```javascript
const Queue = require('bull');
const emailQueue = new Queue('email processing');

emailQueue.process(async (job) => {
  const { email, template, data } = job.data;
  await sendEmail(email, template, data);
});
```

#### Monitoramento (Prometheus)
```javascript
const prometheus = require('prom-client');

const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status']
});
```

### 2. Estrutura para Microserviços

```
services/
├── auth-service/
├── user-service/
├── process-service/
└── notification-service/
```

### 3. CI/CD Pipeline

```yaml
# .github/workflows/ci.yml
name: CI/CD
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm test
      - run: npm run lint
```

---

## 📞 Suporte

Para dúvidas sobre estes padrões ou sugestões de melhoria, consulte a equipe de desenvolvimento ou abra uma issue no repositório.

**Última atualização**: Janeiro 2025
**Versão**: 1.0.0
