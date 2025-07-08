const bcrypt = require('bcryptjs');

// Função para gerar hash da senha Lima12345
async function generatePasswordHash() {
  try {
    console.log('🔐 Gerando hash para a senha: Lima12345');
    
    const password = 'Lima12345';
    const saltRounds = 12;
    
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    console.log('✅ Hash gerado com sucesso!');
    console.log('📋 Informações:');
    console.log(`   Senha original: ${password}`);
    console.log(`   Hash gerado: ${hashedPassword}`);
    console.log('');
    console.log('🔑 Para atualizar no MongoDB Atlas, use:');
    console.log('');
    console.log('db.users.updateOne(');
    console.log('  { username: "admin" },');
    console.log('  { $set: { ');
    console.log(`    password: "${hashedPassword}",`);
    console.log('    updatedAt: new Date()');
    console.log('  }}');
    console.log(')');
    
  } catch (error) {
    console.error('❌ Erro ao gerar hash:', error.message);
  }
}

generatePasswordHash();
