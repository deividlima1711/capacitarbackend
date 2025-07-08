const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
require('dotenv').config();

// Conectar ao MongoDB
mongoose.connect(process.env.MONGODB_URI);

// Schema do usuário
const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  name: String,
  email: String,
  role: String,
  department: String,
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
});

const User = mongoose.model('User', userSchema);

async function createAdmin() {
  try {
    console.log('🔄 Conectando ao MongoDB...');
    
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
    
    if (error.code === 11000) {
      console.error('💡 Erro de duplicata - usuário já existe');
    }
    
    if (error.name === 'ValidationError') {
      console.error('💡 Erro de validação:', error.message);
    }
    
  } finally {
    console.log('🔌 Desconectando do MongoDB...');
    mongoose.disconnect();
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
