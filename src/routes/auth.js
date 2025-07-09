const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Login
router.post('/login', async (req, res) => {
  try {
    console.log('📝 Tentativa de login recebida');
    console.log('📋 Body:', req.body);
    console.log('📍 Headers:', req.headers);
    
    const { username, password } = req.body;

    // Validação básica mais robusta
    if (!username || !password) {
      console.log('❌ Login: Usuário ou senha não fornecidos');
      return res.status(400).json({ 
        error: 'Usuário e senha são obrigatórios',
        received: { username: !!username, password: !!password }
      });
    }

    // Verificar se JWT_SECRET está configurado
    if (!process.env.JWT_SECRET) {
      console.error('❌ Login: JWT_SECRET não configurado');
      return res.status(500).json({ error: 'Erro de configuração do servidor' });
    }

    console.log(`🔍 Login: Tentativa de login para usuário: ${username}`);

    // Buscar usuário (case insensitive)
    const user = await User.findOne({ 
      username: { $regex: new RegExp(`^${username}$`, 'i') }
    });
    
    if (!user) {
      console.log(`❌ Login: Usuário ${username} não encontrado`);
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    console.log(`🔍 Login: Usuário encontrado: ${user.username}`);

    // Verificar senha
    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      console.log(`❌ Login: Senha incorreta para usuário ${username}`);
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Verificar se usuário está ativo
    if (!user.isActive) {
      console.log(`❌ Login: Usuário ${username} está inativo`);
      return res.status(401).json({ error: 'Usuário inativo' });
    }

    console.log(`✅ Login: Usuário ${username} autenticado com sucesso`);

    // Atualizar último login
    user.lastLogin = new Date();
    await user.save();

    // Payload do JWT com dados essenciais
    const payload = {
      userId: user._id.toString(),
      username: user.username,
      role: user.role,
      iat: Math.floor(Date.now() / 1000) // issued at
    };

    // Gerar token JWT com configurações robustas
    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { 
        expiresIn: '1h', // Reduzido para 1 hora conforme boas práticas
        algorithm: 'HS256',
        issuer: 'processflow-backend',
        audience: 'processflow-frontend'
      }
    );

    // Verificar se o token foi gerado corretamente
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log(`✅ Login: Token gerado e verificado com sucesso para ${username}`);
      console.log(`🔍 Token info: userId=${decoded.userId}, exp=${new Date(decoded.exp * 1000).toISOString()}`);
    } catch (verifyError) {
      console.error('❌ Login: Erro na verificação do token gerado:', verifyError.message);
      return res.status(500).json({ error: 'Erro na geração do token' });
    }

    // Dados do usuário para resposta (sem senha)
    const userData = {
      id: user._id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      isActive: user.isActive,
      lastLogin: user.lastLogin
    };

    console.log(`✅ Login: Sucesso para usuário ${username} (${user.role})`);

    res.json({
      token,
      user: userData
    });

  } catch (error) {
    console.error('❌ Login: Erro interno:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Verificar token
router.get('/verify', auth, async (req, res) => {
  try {
    console.log(`✅ Verify: Token válido para usuário ${req.user.username}`);
    
    res.json({
      valid: true,
      user: {
        id: req.user._id,
        username: req.user.username,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        department: req.user.department,
        isActive: req.user.isActive,
        lastLogin: req.user.lastLogin
      }
    });
  } catch (error) {
    console.error('❌ Verify: Erro na verificação:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Logout (invalidar token no frontend)
router.post('/logout', auth, async (req, res) => {
  try {
    console.log(`✅ Logout: Usuário ${req.user.username} fez logout`);
    // Em uma implementação mais robusta, você poderia manter uma blacklist de tokens
    res.json({ message: 'Logout realizado com sucesso' });
  } catch (error) {
    console.error('❌ Logout: Erro no logout:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Alterar senha
router.put('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Senha atual e nova senha são obrigatórias' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Nova senha deve ter pelo menos 6 caracteres' });
    }

    const user = await User.findById(req.user._id);
    
    // Verificar senha atual
    const isMatch = await user.comparePassword(currentPassword);
    
    if (!isMatch) {
      console.log(`❌ ChangePassword: Senha atual incorreta para ${req.user.username}`);
      return res.status(400).json({ error: 'Senha atual incorreta' });
    }

    // Atualizar senha
    user.password = newPassword;
    await user.save();

    console.log(`✅ ChangePassword: Senha alterada para usuário ${req.user.username}`);
    res.json({ message: 'Senha alterada com sucesso' });

  } catch (error) {
    console.error('❌ ChangePassword: Erro ao alterar senha:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Endpoint para testar JWT (debugging)
router.get('/test-jwt', (req, res) => {
  try {
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ error: 'JWT_SECRET não configurado' });
    }

    // Gerar token de teste
    const testPayload = {
      userId: 'test-user-id',
      username: 'test-user',
      role: 'user',
      iat: Math.floor(Date.now() / 1000)
    };

    const testToken = jwt.sign(testPayload, process.env.JWT_SECRET, { expiresIn: '1h' });
    
    // Verificar token de teste
    const decoded = jwt.verify(testToken, process.env.JWT_SECRET);
    
    res.json({
      message: 'JWT funcionando corretamente',
      tokenGenerated: true,
      tokenVerified: true,
      payload: decoded,
      jwtSecretConfigured: true
    });
    
  } catch (error) {
    res.status(500).json({
      message: 'Erro no JWT',
      error: error.message,
      jwtSecretConfigured: !!process.env.JWT_SECRET
    });
  }
});

module.exports = router;

