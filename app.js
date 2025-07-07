const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// Body parsers PRIMEIRO!
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Middlewares de segurança
app.use(helmet());
app.use(cors({
  origin: '*',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // máximo 100 requests por IP
});
app.use(limiter);

// Conexão com MongoDB - VERSÃO CORRIGIDA
const connectDB = async () => {
  try {
    // Configurações de conexão mais robustas
    const mongoOptions = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000, // Aumentado para 30s
      socketTimeoutMS: 45000,
      family: 4, // Forçar IPv4
      retryWrites: true,
      w: 'majority'
    };

    // Tentar diferentes formatos de URI
    let mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    
    if (!mongoUri) {
      throw new Error('❌ MONGODB_URI não configurado nas variáveis de ambiente');
    }

    // Adicionar parâmetros se não estiverem presentes
    if (!mongoUri.includes('retryWrites')) {
      mongoUri += mongoUri.includes('?') ? '&' : '?';
      mongoUri += 'retryWrites=true&w=majority';
    }

    console.log('🔄 Tentando conectar ao MongoDB...');
    console.log('🔗 URI:', mongoUri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')); // Ocultar credenciais no log
    
    const conn = await mongoose.connect(mongoUri, mongoOptions);
    
    console.log(`✅ Conectado ao MongoDB: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
    
    // Criar usuário admin se não existir
    await createAdminUser();
    
    return conn;
    
  } catch (error) {
    console.error('❌ Erro ao conectar MongoDB:', error.message);
    
    // Log detalhado do erro para debugging
    if (error.code === 'ENOTFOUND') {
      console.error('🔍 Erro DNS: Não foi possível resolver o endereço do MongoDB');
      console.error('💡 Soluções:');
      console.error('   1. Verificar se o cluster MongoDB Atlas está ativo');
      console.error('   2. Verificar se o IP está na whitelist do MongoDB Atlas');
      console.error('   3. Verificar se a string de conexão está correta');
    }
    
    if (error.code === 'ECONNREFUSED') {
      console.error('🔍 Conexão recusada: MongoDB não está aceitando conexões');
    }
    
    if (error.name === 'MongoServerSelectionError') {
      console.error('🔍 Erro de seleção de servidor: Timeout na conexão');
    }
    
    // Em desenvolvimento, continuar sem MongoDB (modo offline)
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ Modo desenvolvimento: Continuando sem MongoDB');
      return null;
    }
    
    // Em produção, tentar novamente após delay
    console.log('🔄 Tentando reconectar em 10 segundos...');
    setTimeout(() => {
      process.exit(1);
    }, 10000);
  }
};

// Função para criar usuário admin - VERSÃO MELHORADA
const createAdminUser = async () => {
  try {
    // Verificar se mongoose está conectado
    if (mongoose.connection.readyState !== 1) {
      console.warn('⚠️ MongoDB não conectado, pulando criação de usuário admin');
      return;
    }

    const User = require('./src/models/User');
    const bcrypt = require('bcryptjs');
    
    const adminExists = await User.findOne({ username: 'admin' });
    
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('Lima12345', 12);
      
      const admin = new User({
        username: 'admin',
        password: hashedPassword,
        role: 'admin',
        name: 'Administrador',
        email: 'admin@processflow.com',
        department: 'TI'
      });
      
      await admin.save();
      console.log('✅ Usuário admin criado com sucesso');
      console.log('👤 Credenciais: admin / Lima12345');
    } else {
      console.log('✅ Usuário admin já existe');
    }
  } catch (error) {
    console.error('❌ Erro ao criar usuário admin:', error.message);
    
    // Se for erro de conexão, não é crítico
    if (error.name === 'MongoNetworkError') {
      console.warn('⚠️ Erro de rede ao criar admin, tentará novamente na próxima inicialização');
    }
  }
};

// Middleware para verificar conexão MongoDB
const checkMongoConnection = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ 
      error: 'Serviço temporariamente indisponível',
      message: 'Banco de dados não conectado',
      status: 'offline'
    });
  }
  next();
};

// Rotas
app.get('/', (req, res) => {
  const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  
  res.json({ 
    message: 'ProcessFlow backend em execução',
    version: '1.0.0',
    status: 'online',
    database: mongoStatus,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Health check específico para MongoDB
app.get('/health', (req, res) => {
  const mongoStatus = mongoose.connection.readyState;
  const statusMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  
  res.json({
    status: mongoStatus === 1 ? 'healthy' : 'unhealthy',
    database: statusMap[mongoStatus] || 'unknown',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString()
  });
});

// Importar e usar rotas - COM VERIFICAÇÃO DE CONEXÃO
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/processes', checkMongoConnection, require('./src/routes/processes'));
app.use('/api/tasks', checkMongoConnection, require('./src/routes/tasks'));
app.use('/api/users', checkMongoConnection, require('./src/routes/users'));
app.use('/api/teams', checkMongoConnection, require('./src/routes/teams'));

// Middleware de erro global - MELHORADO
app.use((err, req, res, next) => {
  console.error('❌ Erro:', err.stack);
  
  // Erros específicos do MongoDB
  if (err.name === 'MongoNetworkError') {
    return res.status(503).json({ 
      error: 'Erro de conexão com banco de dados',
      message: 'Tente novamente em alguns instantes'
    });
  }
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({ 
      error: 'Dados inválidos',
      message: err.message
    });
  }
  
  res.status(500).json({ 
    error: 'Erro interno do servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Algo deu errado'
  });
});

// Rota 404
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

// Iniciar servidor - VERSÃO MELHORADA
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Tentar conectar ao MongoDB
    await connectDB();
    
    // Iniciar servidor independente da conexão MongoDB
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Servidor rodando na porta ${PORT}`);
      console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📡 Health check: http://localhost:${PORT}/health`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('🛑 Recebido SIGTERM, encerrando servidor...');
      server.close(() => {
        mongoose.connection.close(false, () => {
          console.log('✅ Servidor encerrado graciosamente');
          process.exit(0);
        });
      });
    });

  } catch (error) {
    console.error('❌ Erro ao iniciar servidor:', error.message);
    process.exit(1);
  }
};

// Eventos de conexão MongoDB
mongoose.connection.on('connected', () => {
  console.log('✅ Mongoose conectado ao MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Erro de conexão Mongoose:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ Mongoose desconectado do MongoDB');
});

startServer();

module.exports = app;

