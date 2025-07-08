const bcrypt = require('bcryptjs');
const User = require('./User');

async function ensureAdminUser() {
  const adminUsername = 'admin';
  const adminPassword = 'Lima12345';

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  let admin = await User.findOne({ username: adminUsername });

  if (admin) {
    admin.password = passwordHash;
    await admin.save();
    console.log('Senha do admin atualizada.');
  } else {
    await User.create({
      username: adminUsername,
      password: passwordHash,
      role: 'admin', // ajuste conforme seu schema
      // ...adicione outros campos obrigatórios se necessário
    });
    console.log('Usuário admin criado.');
  }
}

module.exports = ensureAdminUser;
