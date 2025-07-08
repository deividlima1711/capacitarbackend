const mongoose = require('mongoose');
require('dotenv').config();

async function testConnection() {
  try {
    console.log('🔄 Testando conexão com MongoDB Atlas...');
    console.log('🔗 URI:', process.env.MONGODB_URI);
    
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
    });
    
    console.log('✅ Conexão bem-sucedida!');
    console.log('📊 Database:', mongoose.connection.name);
    console.log('🏠 Host:', mongoose.connection.host);
    
  } catch (error) {
    console.error('❌ Erro de conexão:', error.message);
    console.error('🔍 Tipo de erro:', error.name);
    
    if (error.code) {
      console.error('📋 Código do erro:', error.code);
    }
    
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado');
    process.exit(0);
  }
}

testConnection();
