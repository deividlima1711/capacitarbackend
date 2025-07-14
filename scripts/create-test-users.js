const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
require('dotenv').config();

// Importar o modelo User existente
const User = require('../src/models/User');

// Usuários de exemplo que eu criaria
const usersToCreate = [
  {
    username: 'admin',
    password: 'admin123',
    name: 'Administrador',
    email: 'admin@processflow.com',
    role: 'admin',
    department: 'TI'
  },
  {
    username: 'manager',
    password: 'manager123',
    name: 'Gerente Silva',
    email: 'manager@processflow.com',
    role: 'manager',
    department: 'Gestão'
  },
  {
    username: 'joao',
    password: 'joao123',
    name: 'João Santos',
    email: 'joao@processflow.com',
    role: 'user',
    department: 'Vendas'
  },
  {
    username: 'maria',
    password: 'maria123',
    name: 'Maria Oliveira',
    email: 'maria@processflow.com',
    role: 'user',
    department: 'Marketing'
  },
  {
    username: 'pedro',
    password: 'pedro123',
    name: 'Pedro Costa',
    email: 'pedro@processflow.com',
    role: 'user',
    department: 'Financeiro'
  },
  {
    username: 'ana',
    password: 'ana123',
    name: 'Ana Lima',
    email: 'ana@processflow.com',
    role: 'user',
    department: 'RH'
  },
  {
    username: 'teste',
    password: '123456',
    name: 'Usuário Teste',
    email: 'teste@processflow.com',
    role: 'user',
    department: 'Teste'
  }
];

async function createTestUsers() {
  try {
    console.log('🔄 Conectando ao MongoDB...');
    
    // Conectar ao MongoDB com timeout
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
    });
    
    console.log('✅ Conectado ao MongoDB com sucesso!');
    console.log(`📋 Criando ${usersToCreate.length} usuários de teste...\n`);
    
    let created = 0;
    let existing = 0;
    
    for (const userData of usersToCreate) {
      try {
        // Verificar se usuário já existe
        const existingUser = await User.findOne({ 
          username: { $regex: new RegExp(`^${userData.username}$`, 'i') }
        });
        
        if (existingUser) {
          console.log(`⚠️ Usuário '${userData.username}' já existe - pulando...`);
          existing++;
          continue;
        }

        console.log(`👤 Criando usuário: ${userData.username} (${userData.name})`);
        
        // Criar usuário
        const user = new User({
          username: userData.username.toLowerCase(),
          password: userData.password, // O modelo vai fazer o hash automaticamente
          name: userData.name,
          email: userData.email.toLowerCase(),
          role: userData.role,
          department: userData.department,
          isActive: true
        });

        await user.save();
        console.log(`✅ Usuário '${userData.username}' criado com sucesso!`);
        created++;
        
      } catch (userError) {
        console.error(`❌ Erro ao criar usuário '${userData.username}':`, userError.message);
      }
    }
    
    // Mostrar resumo final
    const totalUsers = await User.countDocuments();
    console.log('\n📊 RESUMO:');
    console.log(`   Usuários criados: ${created}`);
    console.log(`   Usuários já existiam: ${existing}`);
    console.log(`   Total no banco: ${totalUsers}`);
    
    console.log('\n🔑 CREDENCIAIS PARA TESTE:');
    console.log('┌─────────────┬─────────────┬──────────────┬─────────────┐');
    console.log('│ Username    │ Password    │ Role         │ Department  │');
    console.log('├─────────────┼─────────────┼──────────────┼─────────────┤');
    
    usersToCreate.forEach(user => {
      const username = user.username.padEnd(11);
      const password = user.password.padEnd(11);
      const role = user.role.padEnd(12);
      const department = user.department.padEnd(11);
      console.log(`│ ${username} │ ${password} │ ${role} │ ${department} │`);
    });
    
    console.log('└─────────────┴─────────────┴──────────────┴─────────────┘');
    
    console.log('\n💡 SUGESTÕES DE USO:');
    console.log('   • Use "admin" / "admin123" para administração');
    console.log('   • Use "manager" / "manager123" para gerência');
    console.log('   • Use "teste" / "123456" para testes rápidos');
    console.log('   • Outros usuários têm senha = username + "123"');
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
    
    if (error.name === 'MongoServerSelectionError') {
      console.error('💡 Verifique a conexão com MongoDB Atlas');
    }
    
  } finally {
    console.log('\n🔌 Desconectando do MongoDB...');
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

console.log('🚀 Iniciando criação de usuários de teste...');
createTestUsers();
