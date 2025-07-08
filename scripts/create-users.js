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

// Usuários para criar
const usersToCreate = [
  {
    username: 'admin',
    password: 'Lima12345',
    name: 'Administrador',
    email: 'admin@processflow.com',
    role: 'admin',
    department: 'TI'
  },
  {
    username: 'manager1',
    password: 'Manager123',
    name: 'João Silva',
    email: 'joao.silva@processflow.com',
    role: 'manager',
    department: 'Vendas'
  },
  {
    username: 'user1',
    password: 'User123',
    name: 'Maria Santos',
    email: 'maria.santos@processflow.com',
    role: 'user',
    department: 'Marketing'
  },
  {
    username: 'user2',
    password: 'User123',
    name: 'Pedro Oliveira',
    email: 'pedro.oliveira@processflow.com',
    role: 'user',
    department: 'Financeiro'
  },
  {
    username: 'analyst1',
    password: 'Analyst123',
    name: 'Ana Costa',
    email: 'ana.costa@processflow.com',
    role: 'user',
    department: 'RH'
  }
];

async function createUsers() {
  try {
    console.log('🔄 Conectando ao MongoDB...');
    console.log(`📋 Criando ${usersToCreate.length} usuários...\n`);
    
    for (const userData of usersToCreate) {
      try {
        // Verificar se usuário já existe
        const existingUser = await User.findOne({ username: userData.username });
        
        if (existingUser) {
          console.log(`⚠️ Usuário '${userData.username}' já existe - pulando...`);
          continue;
        }

        console.log(`👤 Criando usuário: ${userData.username} (${userData.name})`);
        
        // Criar hash da senha
        const hashedPassword = await bcrypt.hash(userData.password, 12);
        
        // Criar usuário
        const user = new User({
          username: userData.username,
          password: hashedPassword,
          name: userData.name,
          email: userData.email,
          role: userData.role,
          department: userData.department,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        });

        await user.save();
        console.log(`✅ Usuário '${userData.username}' criado com sucesso!`);
        console.log(`   Email: ${userData.email}`);
        console.log(`   Role: ${userData.role}`);
        console.log(`   Department: ${userData.department}\n`);
        
      } catch (userError) {
        console.error(`❌ Erro ao criar usuário '${userData.username}':`, userError.message);
        
        if (userError.code === 11000) {
          console.error('💡 Erro de duplicata - usuário já existe\n');
        }
      }
    }
    
    // Mostrar resumo final
    const totalUsers = await User.countDocuments();
    console.log('📊 RESUMO FINAL:');
    console.log(`   Total de usuários no banco: ${totalUsers}`);
    console.log('\n🔑 CREDENCIAIS CRIADAS:');
    
    for (const userData of usersToCreate) {
      console.log(`   ${userData.username} / ${userData.password} (${userData.role})`);
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
    
  } finally {
    console.log('\n🔌 Desconectando do MongoDB...');
    mongoose.disconnect();
  }
}

// Verificar se MONGODB_URI está configurada
if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI não encontrada no arquivo .env');
  console.error('💡 Certifique-se de ter um arquivo .env com MONGODB_URI configurada');
  process.exit(1);
}

console.log('🚀 Iniciando criação de usuários...');
createUsers();
