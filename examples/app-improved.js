// examples/app-improved.js
// Exemplo de como integrar os novos padrões no app.js existente

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
require('dotenv').config();

// Importar novos utilitários
const { logger, httpLogger } = require('./src/utils/logger');
const { getCorsOptions, corsLogger, securityHeaders, corsErrorHandler } = require('./src/config/cors');
const { connectDB, ensureConnection, checkHealth } = require('./src/config/database');
const { validateContentType, sanitizeStrings } = require('./src/middleware/validation');
const ApiResponse = require('./src/utils/responses');

const app = express();

// Configurar trust proxy para ambientes com proxy
app.set('trust proxy', 1);

// === MIDDLEWARES DE SEGURANÇA ===

// Helmet com configurações aprimoradas
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 ano
    includeSubDomains: true,
    preload: true
  }
}));

// Compressão gzip
app.use(compression());

// === BODY PARSERS ===
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf, encoding) => {
    // Log de requisições muito grandes
    if (buf.length > 1024 * 1024) { // > 1MB
      logger.warn('Requisição com body grande', {
        size: buf.length,
        url: req.url,
        method: req.method,
        ip: req.ip
      });
    }
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// === CORS E LOGGING ===

// Logging CORS
app.use(corsLogger);

// CORS melhorado
app.use(cors(getCorsOptions()));

// Headers de segurança adicionais
app.use(securityHeaders);

// Logging de requisições HTTP
app.use(httpLogger);

// === VALIDAÇÃO E SANITIZAÇÃO ===

// Validar Content-Type
app.use(validateContentType);

// Sanitizar strings de entrada
app.use(sanitizeStrings);

// === RATE LIMITING ===

// Rate limiting geral
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 200, // 200 requests por IP
  message: {
    success: false,
    error: 'Muitas requisições do mesmo IP',
    retryAfter: '15 minutos',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Pular rate limiting para health checks
    return req.url === '/health' || req.url === '/api/v1/health';
  },
  handler: (req, res) => {
    logger.warn('Rate limit excedido', {
      ip: req.ip,
      url: req.url,
      method: req.method,
      userAgent: req.get('User-Agent')
    });
    
    return ApiResponse.error(res, 'Muitas requisições do mesmo IP', 429, null, 'RATE_LIMIT_EXCEEDED');
  }
});

app.use(generalLimiter);

// Rate limiting específico para autenticação
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // Apenas 5 tentativas de login por IP
  skipSuccessfulRequests: true,
  handler: (req, res) => {
    logger.warn('Rate limit de autenticação excedido', {
      ip: req.ip,
      url: req.url
    });
    
    return ApiResponse.error(res, 'Muitas tentativas de login', 429, null, 'AUTH_RATE_LIMIT');
  }
});

// === CONEXÃO COM BANCO DE DADOS ===

// Conectar ao MongoDB
connectDB().catch(error => {
  logger.error('Falha na conexão inicial com MongoDB', { error: error.message });
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

// Middleware para verificar conexão DB em todas as rotas da API
app.use('/api', ensureConnection);

// === HEALTH CHECKS ===

// Health check básico
app.get('/health', (req, res) => {
  const dbHealth = checkHealth();
  const uptime = process.uptime();
  const timestamp = new Date().toISOString();
  
  const health = {
    status: 'ok',
    timestamp,
    uptime: Math.floor(uptime),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    database: dbHealth
  };

  logger.debug('Health check executado', health);
  
  res.json(health);
});

// Health check detalhado (apenas para admin)
app.get('/api/v1/health', require('./src/middleware/auth').adminAuth, (req, res) => {
  const dbHealth = checkHealth();
  
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    versions: process.versions,
    environment: process.env.NODE_ENV,
    database: dbHealth,
    loadAverage: require('os').loadavg(),
    freeMemory: require('os').freemem(),
    totalMemory: require('os').totalmem()
  };

  res.json(health);
});

// === DEBUG ENDPOINT ===

// Endpoint debug melhorado
app.get('/debug', (req, res) => {
  try {
    const debugInfo = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      database: checkHealth(),
      headers: req.headers,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    // Em produção, limitar informações
    if (process.env.NODE_ENV === 'production') {
      delete debugInfo.headers;
      delete debugInfo.memory;
    }

    logger.debug('Debug info acessado', { ip: req.ip });
    
    res.json(debugInfo);
  } catch (error) {
    logger.error('Erro no debug endpoint', { error: error.message });
    res.status(500).json({ error: 'Erro interno' });
  }
});

// === ROTAS DA API ===

// Importar rotas
const authRoutes = require('./src/routes/auth');
const userRoutes = require('./src/routes/users');
const processRoutes = require('./src/routes/processes');
const taskRoutes = require('./src/routes/tasks');
const teamRoutes = require('./src/routes/teams');

// Rate limiting para rotas de autenticação
app.use('/api/v1/auth', authLimiter);

// Registrar rotas
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/processes', processRoutes);
app.use('/api/v1/tasks', taskRoutes);
app.use('/api/v1/teams', teamRoutes);

// === ROTA RAIZ ===

app.get('/', (req, res) => {
  const info = {
    name: 'ProcessFlow API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    endpoints: [
      'GET /health - Health check',
      'GET /debug - Debug info',
      'POST /api/v1/auth/login - Login',
      'POST /api/v1/auth/register - Register',
      'GET /api/v1/users - List users',
      'GET /api/v1/processes - List processes',
      'GET /api/v1/tasks - List tasks'
    ]
  };

  res.json(info);
});

// === TRATAMENTO DE ERROS ===

// Handler para rotas não encontradas
app.use('*', (req, res) => {
  logger.warn('Rota não encontrada', {
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  return ApiResponse.notFound(res, `Rota ${req.method} ${req.originalUrl} não encontrada`);
});

// Handler de erro CORS
app.use(corsErrorHandler);

// Handler global de erros
app.use((err, req, res, next) => {
  const errorId = Date.now().toString(36); // ID único para o erro
  
  logger.error('Erro não tratado capturado', {
    errorId,
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    user: req.user?.username,
    body: process.env.NODE_ENV === 'development' ? req.body : undefined
  });

  // Erro do Mongoose - Validação
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message
    }));
    return ApiResponse.validationError(res, errors, 'Dados inválidos');
  }

  // Erro do Mongoose - Cast (ID inválido)
  if (err.name === 'CastError') {
    return ApiResponse.validationError(res, 
      [{ field: err.path, message: 'ID inválido' }], 
      'Formato de ID inválido'
    );
  }

  // Erro de duplicação (chave única)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return ApiResponse.conflict(res, `${field} já existe`);
  }

  // Erro JWT
  if (err.name === 'JsonWebTokenError') {
    return ApiResponse.unauthorized(res, 'Token inválido');
  }

  if (err.name === 'TokenExpiredError') {
    return ApiResponse.unauthorized(res, 'Token expirado');
  }

  // Erro de sintaxe JSON
  if (err.type === 'entity.parse.failed') {
    return ApiResponse.validationError(res, 
      [{ field: 'body', message: 'JSON inválido' }], 
      'Formato JSON inválido'
    );
  }

  // Erro padrão
  const message = process.env.NODE_ENV === 'production' 
    ? 'Erro interno do servidor' 
    : err.message;
    
  return ApiResponse.error(res, message, err.statusCode || 500, 
    process.env.NODE_ENV === 'development' ? { 
      errorId, 
      stack: err.stack 
    } : { errorId }
  );
});

// === INICIALIZAÇÃO DO SERVIDOR ===

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  logger.success(`🚀 Servidor rodando na porta ${PORT}`, {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version,
    timestamp: new Date().toISOString()
  });
});

// === GRACEFUL SHUTDOWN ===

const gracefulShutdown = (signal) => {
  logger.info(`📡 Recebido sinal ${signal}, iniciando graceful shutdown...`);
  
  server.close(async () => {
    logger.info('🔌 Servidor HTTP fechado');
    
    try {
      await require('./src/config/database').disconnectDB();
      logger.info('🗄️ Conexão MongoDB fechada');
    } catch (error) {
      logger.error('❌ Erro ao fechar conexão MongoDB', { error: error.message });
    }
    
    logger.info('✅ Graceful shutdown concluído');
    process.exit(0);
  });
  
  // Forçar saída após 30 segundos
  setTimeout(() => {
    logger.error('⏰ Timeout no graceful shutdown, forçando saída');
    process.exit(1);
  }, 30000);
};

// Capturar sinais de sistema
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Capturar erros não tratados
process.on('uncaughtException', (error) => {
  logger.error('❌ Uncaught Exception', {
    message: error.message,
    stack: error.stack
  });
  
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('❌ Unhandled Rejection', {
    reason: reason,
    promise: promise
  });
  
  gracefulShutdown('UNHANDLED_REJECTION');
});

module.exports = app;
