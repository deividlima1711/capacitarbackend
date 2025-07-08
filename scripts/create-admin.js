const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
require('dotenv').config();

// Importar o modelo User existente
const User = require('../src/models/User');

async function createAdmin() {
  try {
    console.log('🔄 Conectando ao MongoDB...');
    
    // Conectar ao MongoDB com timeout
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000, // 10 segundos timeout
      socketTimeoutMS: 45000,
    });
    
    console.log('✅ Conectado ao MongoDB com sucesso!');
    
    // Verificar se admin já existe
    const existingAdmin = await User.findOne({ username: 'admin' });
    if (existingAdmin) {
      console.log('⚠️ Admin já existe');
      console.log('📋 Dados do admin existente:');
      console.log(`   Username: ${existingAdmin.username}`);
      console.log(`   Name: ${existingAdmin.name}`);
      console.log(`   Email: ${existingAdmin.email}`);
      console.log(`   Role: ${existingAdmin.role}`);
      console.log(`   Department: ${existingAdmin.department}`);
      console.log(`   Active: ${existingAdmin.isActive}`);
      return;
    }

    console.log('🔐 Criando hash da senha...');
    // Criar hash da senha
    const hashedPassword = await bcrypt.hash('Lima12345', 12);
    
    console.log('👤 Criando usuário admin...');
    // Criar usuário admin
    const admin = new User({
      username: 'admin',
      password: hashedPassword,
      name: 'Administrador',
      email: 'admin@processflow.com',
      role: 'admin',
      department: 'TI',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await admin.save();
    console.log('✅ Usuário admin criado com sucesso!');
    console.log('📋 Credenciais criadas:');
    console.log('   Username: admin');
    console.log('   Password: Lima12345');
    console.log('   Email: admin@processflow.com');
    console.log('   Role: admin');
    
  } catch (error) {
    console.error('❌ Erro ao criar admin:', error.message);
    
    // Erros específicos de conexão
    if (error.name === 'MongoServerSelectionError') {
      console.error('💡 Erro de conexão: Não foi possível conectar ao MongoDB');
      console.error('   - Verifique se a string MONGODB_URI está correta');
      console.error('   - Verifique se o MongoDB Atlas está configurado');
      console.error('   - Verifique sua conexão com a internet');
    }
    
    if (error.code === 11000) {
      console.error('💡 Erro de duplicata - usuário já existe');
    }
    
    if (error.name === 'ValidationError') {
      console.error('💡 Erro de validação:', error.message);
    }
    
  } finally {
    console.log('🔌 Desconectando do MongoDB...');
    try {
      await mongoose.disconnect();
      console.log('✅ Desconectado com sucesso');
    } catch (disconnectError) {
      console.error('❌ Erro ao desconectar:', disconnectError.message);
    }
    process.exit(0);
  }
}

// Verificar se MONGODB_URI está configurada
if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI não encontrada no arquivo .env');
  console.error('💡 Certifique-se de ter um arquivo .env com MONGODB_URI configurada');
  process.exit(1);
}

console.log('🚀 Iniciando criação do usuário admin...');
createAdmin();
