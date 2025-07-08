// Script para criar usuário admin manualmente
// Execute com: node create-admin-script.js

const mongoose = require('mongoose');
require('dotenv').config();

// Schema do usuário (igual ao modelo)
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 50
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  role: {
    type: String,
    enum: ['admin', 'manager', 'user'],
    default: 'user'
  },
  department: {
    type: String,
    trim: true,
    maxlength: 100
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Middleware para hash da senha
const bcrypt = require('bcryptjs');

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Método para comparar senhas
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

async function createAdminUser() {
  try {
    console.log('🔄 Conectando ao MongoDB...');
    
    // Conectar ao MongoDB
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI não configurado');
    }
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ Conectado ao MongoDB');
    
    // Verificar se admin já existe
    console.log('🔍 Verificando se usuário admin existe...');
    const existingAdmin = await User.findOne({ username: 'admin' });
    
    if (existingAdmin) {
      console.log('⚠️ Usuário admin já existe');
      console.log('🔄 Removendo usuário existente...');
      await User.deleteOne({ username: 'admin' });
      console.log('✅ Usuário admin removido');
    }
    
    // Criar novo usuário admin
    console.log('🔄 Criando novo usuário admin...');
    
    const admin = new User({
      username: 'admin',
      password: 'Lima12345', // Senha limpa - middleware fará o hash
      name: 'Administrador',
      email: 'admin@processflow.com',
      role: 'admin',
      department: 'TI',
      isActive: true
    });
    
    await admin.save();
    console.log('✅ Usuário admin criado com sucesso!');
    
    // Verificar se foi criado corretamente
    const savedAdmin = await User.findOne({ username: 'admin' });
    if (savedAdmin) {
      console.log('✅ Verificação: Usuário encontrado no banco');
      console.log(`📧 Email: ${savedAdmin.email}`);
      console.log(`🏢 Departamento: ${savedAdmin.department}`);
      console.log(`👤 Role: ${savedAdmin.role}`);
      console.log(`🔐 Ativo: ${savedAdmin.isActive}`);
      
      // Testar login
      console.log('🧪 Testando login...');
      const isPasswordCorrect = await savedAdmin.comparePassword('Lima12345');
      console.log(`🔐 Senha correta: ${isPasswordCorrect ? '✅ SIM' : '❌ NÃO'}`);
      
      if (isPasswordCorrect) {
        console.log('');
        console.log('🎉 SUCESSO! Usuário admin criado e testado');
        console.log('🔐 CREDENCIAIS DE LOGIN:');
        console.log('   Usuário: admin');
        console.log('   Senha: Lima12345');
        console.log('');
      } else {
        console.log('❌ ERRO: Senha não confere após criação');
      }
    }
    
  } catch (error) {
    console.error('❌ Erro ao criar usuário admin:', error.message);
    console.error('📋 Detalhes:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado do MongoDB');
    process.exit(0);
  }
}

// Executar script
createAdminUser();

