// src/config/database.js

const mongoose = require('mongoose');
const { logger } = require('../utils/logger');

/**
 * Configurações de conexão com MongoDB
 */
const dbConfig = {
  // Opções de conexão
  options: {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    maxPoolSize: 10, // Máximo de conexões simultâneas
    serverSelectionTimeoutMS: 5000, // Timeout para seleção do servidor
    socketTimeoutMS: 45000, // Timeout para operações socket
    bufferMaxEntries: 0, // Disable mongoose buffering
    bufferCommands: false, // Disable mongoose buffering
  },
  
  // Configurações por ambiente
  environments: {
    development: {
      retryWrites: true,
      w: 'majority'
    },
    production: {
      retryWrites: true,
      w: 'majority',
      readPreference: 'primary',
      authSource: 'admin'
    },
    test: {
      retryWrites: false,
      w: 1
    }
  }
};

/**
 * Conectar ao MongoDB
 */
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    
    if (!mongoUri) {
      throw new Error('MONGODB_URI não encontrada nas variáveis de ambiente');
    }

    // Configurações específicas por ambiente
    const env = process.env.NODE_ENV || 'development';
    const envConfig = dbConfig.environments[env] || dbConfig.environments.development;
    
    const options = {
      ...dbConfig.options,
      ...envConfig
    };

    logger.info('Conectando ao MongoDB...', { 
      environment: env,
      // Mascarar a URI para não expor credenciais
      uri: mongoUri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')
    });

    const conn = await mongoose.connect(mongoUri, options);

    logger.success('MongoDB conectado', {
      host: conn.connection.host,
      database: conn.connection.name,
      port: conn.connection.port,
      readyState: conn.connection.readyState
    });

    // Event listeners para monitoramento
    setupEventListeners();
    
    return conn;
    
  } catch (error) {
    logger.error('Erro ao conectar MongoDB', {
      message: error.message,
      stack: error.stack
    });
    
    // Em produção, exit o processo se não conseguir conectar
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
    
    throw error;
  }
};

/**
 * Configurar event listeners para monitoramento
 */
const setupEventListeners = () => {
  const db = mongoose.connection;

  // Conexão perdida
  db.on('disconnected', () => {
    logger.warn('MongoDB desconectado');
  });

  // Erro na conexão
  db.on('error', (error) => {
    logger.error('Erro na conexão MongoDB', {
      message: error.message,
      code: error.code
    });
  });

  // Reconexão
  db.on('reconnected', () => {
    logger.info('MongoDB reconectado');
  });

  // Conexão fechada
  db.on('close', () => {
    logger.warn('Conexão MongoDB fechada');
  });

  // Timeout
  db.on('timeout', () => {
    logger.warn('Timeout na conexão MongoDB');
  });
};

/**
 * Desconectar do MongoDB
 */
const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    logger.info('MongoDB desconectado com sucesso');
  } catch (error) {
    logger.error('Erro ao desconectar MongoDB', {
      message: error.message
    });
  }
};

/**
 * Verificar saúde da conexão
 */
const checkHealth = () => {
  const state = mongoose.connection.readyState;
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };

  return {
    status: states[state] || 'unknown',
    readyState: state,
    host: mongoose.connection.host,
    database: mongoose.connection.name,
    port: mongoose.connection.port
  };
};

/**
 * Middleware para verificar conexão em requests
 */
const ensureConnection = (req, res, next) => {
  const health = checkHealth();
  
  if (health.status !== 'connected') {
    logger.error('MongoDB não conectado', health);
    
    return res.status(503).json({
      success: false,
      error: 'Serviço temporariamente indisponível',
      code: 'DATABASE_UNAVAILABLE'
    });
  }
  
  next();
};

/**
 * Configurações de debug para desenvolvimento
 */
if (process.env.NODE_ENV === 'development') {
  // Habilitar debug queries do mongoose
  mongoose.set('debug', (collection, method, query, doc) => {
    logger.debug('MongoDB Query', {
      collection,
      method,
      query: JSON.stringify(query),
      doc: doc ? JSON.stringify(doc) : undefined
    });
  });
}

// Configurações globais do Mongoose
mongoose.set('strictQuery', true); // Preparar para Mongoose 7
mongoose.set('sanitizeFilter', true); // Prevenir NoSQL injection

module.exports = {
  connectDB,
  disconnectDB,
  checkHealth,
  ensureConnection,
  dbConfig
};
