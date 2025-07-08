const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
app.set('trust proxy', 1); // Necessário para ambientes com proxy (Railway, Vercel, Heroku, etc)

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
    
    // Criar usuário admin se não existir - VERSÃO CORRIGIDA
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

// Função para criar usuário admin - VERSÃO CORRIGIDA (SEM DOUBLE HASHING)
const createAdminUser = async () => {
  try {
    // Verificar se mongoose está conectado
    if (mongoose.connection.readyState !== 1) {
      console.warn('⚠️ MongoDB não conectado, pulando criação de usuário admin');
      return;
    }

    const User = require('./src/models/User');
    
    console.log('🔍 Verificando se usuário admin existe...');
    const adminExists = await User.findOne({ username: 'admin' });
    
    if (!adminExists) {
      console.log('🔄 Criando usuário admin...');
      
      // ✅ CORREÇÃO: Passar senha limpa - o middleware do modelo fará o hash automaticamente
      const admin = new User({
        username: 'admin',
        password: 'Lima12345', // ✅ Senha limpa - middleware pre('save') fará o hash
        role: 'admin',
        name: 'Administrador',
        email: 'admin@processflow.com',
        department: 'TI',
        isActive: true
      });
      
      // Salvar usuário (middleware pre('save') será executado automaticamente)
      await admin.save();
      
      console.log('✅ Usuário admin criado com sucesso!');
      console.log('👤 Credenciais de login:');
      console.log('   Usuário: admin');
      console.log('   Senha: Lima12345');
      console.log('   Role: admin');
      
      // Verificar se foi salvo corretamente
      const savedAdmin = await User.findOne({ username: 'admin' });
      if (savedAdmin) {
        console.log('✅ Verificação: Usuário admin salvo no banco de dados');
        console.log(`📧 Email: ${savedAdmin.email}`);
        console.log(`🏢 Departamento: ${savedAdmin.department}`);
        console.log(`🔐 Senha hasheada: ${savedAdmin.password ? 'Sim' : 'Não'}`);
      }
      
    } else {
      console.log('✅ Usuário admin já existe');
      console.log(`📧 Email: ${adminExists.email}`);
      console.log(`🏢 Departamento: ${adminExists.department}`);
      console.log(`🔐 Ativo: ${adminExists.isActive ? 'Sim' : 'Não'}`);
      console.log('👤 Credenciais de login: admin / Lima12345');
    }
    
  } catch (error) {
    console.error('❌ Erro ao criar usuário admin:', error.message);
    console.error('📋 Detalhes do erro:', error);
    
    // Se for erro de conexão, não é crítico
    if (error.name === 'MongoNetworkError') {
      console.warn('⚠️ Erro de rede ao criar admin, tentará novamente na próxima inicialização');
    } else if (error.code === 11000) {
      console.warn('⚠️ Usuário admin já existe (erro de duplicação)');
    } else {
      console.error('❌ Erro crítico na criação do admin:', error.message);
    }
  }
};

// Função para forçar recriação do usuário admin (para debugging)
const recreateAdminUser = async () => {
  try {
    const User = require('./src/models/User');
    
    console.log('🔄 Removendo usuário admin existente...');
    await User.deleteOne({ username: 'admin' });
    
    console.log('🔄 Criando novo usuário admin...');
    await createAdminUser();
    
  } catch (error) {
    console.error('❌ Erro ao recriar usuário admin:', error.message);
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
    environment: process.env.NODE_ENV || 'development',
    adminCredentials: {
      username: 'admin',
      password: 'Lima12345',
      note: 'Use essas credenciais para fazer login'
    }
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

// Rota para recriar usuário admin (apenas para debugging)
app.post('/api/admin/recreate', async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Operação não permitida em produção' });
    }
    
    await recreateAdminUser();
    res.json({ message: 'Usuário admin recriado com sucesso' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao recriar usuário admin', details: error.message });
  }
});

// Rota para verificar usuário admin
app.get('/api/admin/check', async (req, res) => {
  try {
    const User = require('./src/models/User');
    const admin = await User.findOne({ username: 'admin' }).select('-password');
    
    if (admin) {
      res.json({
        exists: true,
        user: admin,
        credentials: {
          username: 'admin',
          password: 'Lima12345'
        }
      });
    } else {
      res.json({
        exists: false,
        message: 'Usuário admin não encontrado'
      });
    }
  } catch (error) {
    res.status(500).json({ error: 'Erro ao verificar usuário admin', details: error.message });
  }
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

    // Garantir admin com senha correta
    await ensureAdminUser();

    // Iniciar servidor independente da conexão MongoDB
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Servidor rodando na porta ${PORT}`);
      console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📡 Health check: http://localhost:${PORT}/health`);
      console.log(`👤 Admin check: http://localhost:${PORT}/api/admin/check`);
      console.log('');
      console.log('🔐 CREDENCIAIS DE LOGIN:');
      console.log('   Usuário: admin');
      console.log('   Senha: Lima12345');
      console.log('');
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

