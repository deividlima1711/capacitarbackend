const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Importar o modelo User existente
const User = require('../src/models/User');

async function updateAdminPassword() {
  try {
    console.log('🔄 Conectando ao MongoDB...');
    
    // Conectar ao MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    
    console.log('✅ Conectado ao MongoDB com sucesso!');
    
    // Criar hash da nova senha "Lima12345"
    const newPassword = 'Lima12345';
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    console.log('🔄 Atualizando senha do admin...');
    
    // Atualizar a senha do admin
    const result = await User.updateOne(
      { username: "admin" },
      { 
        $set: { 
          password: hashedPassword,
          updatedAt: new Date()
        }
      }
    );
    
    if (result.matchedCount === 0) {
      console.log('❌ Usuário admin não encontrado');
      return;
    }
    
    if (result.modifiedCount === 0) {
      console.log('⚠️ Nenhuma modificação realizada (senha já estava atualizada)');
    } else {
      console.log('✅ Senha do admin atualizada com sucesso!');
    }
    
    // Verificar se foi atualizado
    console.log('🔍 Verificando usuário admin...');
    const admin = await User.findOne({ username: "admin" });
    
    if (admin) {
      console.log('📋 Dados do admin:');
      console.log(`   Username: ${admin.username}`);
      console.log(`   Name: ${admin.name}`);
      console.log(`   Email: ${admin.email}`);
      console.log(`   Role: ${admin.role}`);
      console.log(`   Active: ${admin.isActive}`);
      console.log(`   Updated: ${admin.updatedAt}`);
      console.log('🔑 Credenciais de login:');
      console.log(`   Username: admin`);
      console.log(`   Password: Lima12345`);
    }
    
  } catch (error) {
    console.error('❌ Erro ao atualizar admin:', error.message);
    
    if (error.name === 'MongoServerSelectionError') {
      console.error('💡 Erro de conexão com MongoDB Atlas');
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
  process.exit(1);
}

console.log('🚀 Atualizando senha do admin...');
updateAdminPassword();
