const User = require('./User');

async function ensureAdminUser() {
  const adminUsername = 'admin';
  const adminPassword = 'Lima12345';

  let admin = await User.findOne({ username: adminUsername });

  if (admin) {
    admin.password = adminPassword; // senha em texto puro, middleware fará o hash
    await admin.save();
    console.log('Senha do admin atualizada.');
  } else {
    await User.create({
      username: adminUsername,
      password: adminPassword, // senha em texto puro, middleware fará o hash
      role: 'admin',
      name: 'Administrador',
      email: 'admin@processflow.com',
      department: 'TI',
      isActive: true
    });
    console.log('Usuário admin criado.');
  }
}

module.exports = ensureAdminUser;
