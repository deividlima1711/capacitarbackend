const mongoose = require('mongoose');
require('dotenv').config();

// URLs para testar
const testUrls = [
  // URL atual (que não funciona)
  'mongodb+srv://lima1711:020695@cluster0.mongodb.net/processflow?retryWrites=true&w=majority',
  
  // Possíveis URLs corretas baseadas no erro que você mostrou
  'mongodb+srv://lima1711:020695@cluster0.1bf0dhd.mongodb.net/processflow?retryWrites=true&w=majority',
  
  // Outras possibilidades
  'mongodb+srv://lima1711:020695@cluster0.pm4bbxf.mongodb.net/processflow?retryWrites=true&w=majority',
];

async function testConnection(uri, index) {
  try {
    console.log(`\n🔗 Testando URL ${index + 1}:`);
    console.log(`   ${uri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')}`);
    
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    
    console.log('✅ SUCESSO! Esta URL funciona!');
    console.log(`📊 Database: ${mongoose.connection.name}`);
    console.log(`🌐 Host: ${mongoose.connection.host}`);
    
    return uri;
    
  } catch (error) {
    console.log(`❌ Falhou: ${error.message}`);
    return null;
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
  }
}

async function testAllUrls() {
  console.log('🧪 Testando diferentes URLs do MongoDB Atlas...\n');
  
  for (let i = 0; i < testUrls.length; i++) {
    const workingUrl = await testConnection(testUrls[i], i);
    
    if (workingUrl) {
      console.log('\n🎉 URL CORRETA ENCONTRADA!');
      console.log('📋 Adicione esta URL ao seu arquivo .env:');
      console.log(`MONGODB_URI=${workingUrl}`);
      break;
    }
  }
  
  console.log('\n💡 Se nenhuma URL funcionou:');
  console.log('   1. Acesse https://cloud.mongodb.com');
  console.log('   2. Vá para Database > Connect > Drivers');
  console.log('   3. Copie a string de conexão exata');
  console.log('   4. Substitua <password> pela sua senha: 020695');
}

testAllUrls();
